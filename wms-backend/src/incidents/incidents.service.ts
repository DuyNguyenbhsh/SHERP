import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { PhotoCategory } from '../checklists/enums/checklist.enum';
import { WorkItemsService } from '../work-items/work-items.service';
import { Incident } from './entities/incident.entity';
import { IncidentPhoto } from './entities/incident-photo.entity';
import { IncidentComment } from './entities/incident-comment.entity';
import { IncidentReopenRequest } from './entities/incident-reopen-request.entity';
import { IncidentAssigneeChangeRequest } from './entities/incident-assignee-change-request.entity';
import {
  IncidentApprovalStatus,
  IncidentSeverity,
  IncidentStatus,
} from './enums/incident.enum';
import { buildIncidentCode } from './domain/logic/incident-code-generator.logic';
import { canTransition } from './domain/logic/state-transition.logic';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReopenRequestDto } from './dto/create-reopen-request.dto';
import { CreateAssigneeChangeRequestDto } from './dto/create-assignee-change-request.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { NotificationService } from '../common/notifications/notification.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident) private readonly incRepo: Repository<Incident>,
    @InjectRepository(IncidentPhoto)
    private readonly photoRepo: Repository<IncidentPhoto>,
    @InjectRepository(IncidentComment)
    private readonly commentRepo: Repository<IncidentComment>,
    @InjectRepository(IncidentReopenRequest)
    private readonly reopenRepo: Repository<IncidentReopenRequest>,
    @InjectRepository(IncidentAssigneeChangeRequest)
    private readonly changeRepo: Repository<IncidentAssigneeChangeRequest>,
    private readonly dataSource: DataSource,
    private readonly workItems: WorkItemsService,
    private readonly notifications: NotificationService,
  ) {}

  // ── CREATE ────────────────────────────────────────────────
  async create(dto: CreateIncidentDto, reporterId: string) {
    return this.dataSource.transaction(async (mgr) => {
      const today = new Date();
      const sequence = await this.nextSequenceForToday(
        mgr,
        dto.project_id,
        today,
      );
      const code = buildIncidentCode(today, sequence);

      const incident = mgr.create(Incident, {
        incident_code: code,
        title: dto.title,
        description: dto.description,
        project_id: dto.project_id,
        work_item_id: dto.work_item_id ?? null,
        severity: dto.severity,
        category: dto.category,
        location_text: dto.location_text ?? null,
        related_asset: dto.related_asset ?? null,
        reported_by: reporterId,
        status: IncidentStatus.NEW,
      });
      const saved = await mgr.save(incident);

      // Lưu ảnh BEFORE_FIX
      const photos = dto.photos.map((url) =>
        mgr.create(IncidentPhoto, {
          incident_id: saved.id,
          secure_url: url,
          category: PhotoCategory.BEFORE_FIX,
          uploaded_by: reporterId,
        }),
      );
      await mgr.save(photos);

      // BR-INC-07 (a) new incident + BR-INC-02 critical → notify
      void this.notifications.notifyIncidentCreated({
        id: saved.id,
        incident_code: saved.incident_code,
        title: saved.title,
        severity: saved.severity,
        project_id: saved.project_id,
        reported_by: saved.reported_by,
      });

      return saved;
    });
  }

  private async nextSequenceForToday(
    mgr: import('typeorm').EntityManager,
    projectId: string,
    today: Date,
  ): Promise<number> {
    const start = new Date(today);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setUTCHours(23, 59, 59, 999);
    const count = await mgr.count(Incident, {
      where: {
        project_id: projectId,
        created_at: Between(start, end),
      },
    });
    return count + 1;
  }

  // ── READ ──────────────────────────────────────────────────
  async list(filter: {
    projectId?: string;
    status?: IncidentStatus;
    assigneeId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.project_id = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.assigneeId) where.assigned_to = filter.assigneeId;
    return this.incRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const inc = await this.incRepo.findOne({
      where: { id },
      relations: ['photos', 'comments'],
    });
    if (!inc) throw new NotFoundException('Không tìm thấy sự cố');
    return inc;
  }

  // ── TRANSITION: ASSIGN ────────────────────────────────────
  async assign(id: string, dto: AssignIncidentDto) {
    const inc = await this.findOne(id);
    const check = canTransition(inc.status, 'ASSIGN');
    if (!check.ok) throw new BadRequestException(check.reason);

    inc.assigned_to = dto.assigned_to;
    inc.assigned_at = new Date();
    inc.status = check.next;
    if (dto.due_date) {
      inc.due_date = new Date(dto.due_date);
    } else if (dto.sla_hours) {
      inc.due_date = new Date(Date.now() + dto.sla_hours * 3600 * 1000);
    }

    const saved = await this.incRepo.save(inc);

    // Sync WorkItem nếu có link
    if (inc.work_item_id) {
      await this.workItems.syncProgress(inc.work_item_id, 25, false);
    }

    // BR-INC-07 (b) assign → notify assignee
    void this.notifications.notifyIncidentAssigned({
      id: saved.id,
      incident_code: saved.incident_code,
      title: saved.title,
      assigned_to: saved.assigned_to!,
    });

    return saved;
  }

  // ── TRANSITION: RESOLVE ──────────────────────────────────
  async resolve(id: string, dto: ResolveIncidentDto, actorId: string) {
    return this.dataSource.transaction(async (mgr) => {
      const inc = await mgr.findOne(Incident, { where: { id } });
      if (!inc) throw new NotFoundException('Không tìm thấy sự cố');
      const check = canTransition(inc.status, 'RESOLVE');
      if (!check.ok) throw new BadRequestException(check.reason);

      const photos = dto.photos.map((url) =>
        mgr.create(IncidentPhoto, {
          incident_id: id,
          secure_url: url,
          category: PhotoCategory.AFTER_FIX,
          uploaded_by: actorId,
        }),
      );
      await mgr.save(photos);

      if (dto.resolution_note) {
        await mgr.save(
          mgr.create(IncidentComment, {
            incident_id: id,
            actor_id: actorId,
            body: `[RESOLVE] ${dto.resolution_note}`,
          }),
        );
      }

      inc.status = check.next;
      inc.resolved_at = new Date();
      const saved = await mgr.save(inc);

      if (inc.work_item_id) {
        await this.workItems.syncProgress(inc.work_item_id, 75, false);
      }

      // BR-INC-07 (c) resolved → notify QLDA verify
      void this.notifications.notifyIncidentResolved({
        id: saved.id,
        incident_code: saved.incident_code,
        title: saved.title,
        project_id: saved.project_id,
      });

      return saved;
    });
  }

  // ── TRANSITION: CLOSE ─────────────────────────────────────
  async close(id: string) {
    const inc = await this.findOne(id);
    const check = canTransition(inc.status, 'CLOSE');
    if (!check.ok) throw new BadRequestException(check.reason);

    // BR-INC-05: verify AFTER_FIX photos exist
    const afterFixCount = await this.photoRepo.count({
      where: { incident_id: id, category: PhotoCategory.AFTER_FIX },
    });
    if (afterFixCount === 0) {
      throw new BadRequestException(
        'BR-INC-05: Cần có ảnh AFTER_FIX trước khi đóng sự cố',
      );
    }

    inc.status = check.next;
    inc.closed_at = new Date();
    const saved = await this.incRepo.save(inc);

    if (inc.work_item_id) {
      await this.workItems.syncProgress(inc.work_item_id, 100, true);
    }
    return saved;
  }

  // ── PHOTOS + COMMENTS ────────────────────────────────────
  async addPhoto(id: string, dto: UploadPhotoDto, actorId: string) {
    await this.findOne(id);
    return this.photoRepo.save(
      this.photoRepo.create({
        incident_id: id,
        secure_url: dto.secure_url,
        category: dto.category,
        uploaded_by: actorId,
      }),
    );
  }

  async addComment(id: string, dto: AddCommentDto, actorId: string) {
    await this.findOne(id);
    return this.commentRepo.save(
      this.commentRepo.create({
        incident_id: id,
        actor_id: actorId,
        body: dto.body,
      }),
    );
  }

  // ── REOPEN SUB-FLOW ──────────────────────────────────────
  async requestReopen(
    incidentId: string,
    dto: CreateReopenRequestDto,
    requesterId: string,
  ) {
    const inc = await this.findOne(incidentId);
    // BR-INC-03: chỉ reopen được khi đang COMPLETED
    if (inc.status !== IncidentStatus.COMPLETED) {
      throw new BadRequestException(
        'BR-INC-03: Chỉ được yêu cầu mở lại sự cố ở trạng thái COMPLETED',
      );
    }
    const saved = await this.reopenRepo.save(
      this.reopenRepo.create({
        incident_id: incidentId,
        requested_by: requesterId,
        reason: dto.reason,
      }),
    );

    // BR-INC-07 (d) reopen pending → notify approver
    void this.notifications.notifyReopenRequested({
      incident_id: incidentId,
      requested_by: requesterId,
      reason: dto.reason,
    });

    return saved;
  }

  async decideReopen(
    requestId: string,
    approve: boolean,
    dto: DecideRequestDto,
    approverId: string,
  ) {
    return this.dataSource.transaction(async (mgr) => {
      const req = await mgr.findOne(IncidentReopenRequest, {
        where: { id: requestId },
      });
      if (!req) throw new NotFoundException('Không tìm thấy yêu cầu reopen');
      if (req.status !== IncidentApprovalStatus.PENDING) {
        throw new BadRequestException('Yêu cầu này đã được xử lý');
      }

      req.status = approve
        ? IncidentApprovalStatus.APPROVED
        : IncidentApprovalStatus.REJECTED;
      req.decided_by = approverId;
      req.decided_at = new Date();
      req.decision_note = dto.decision_note ?? null;
      await mgr.save(req);

      if (approve) {
        const inc = await mgr.findOne(Incident, {
          where: { id: req.incident_id },
        });
        if (!inc) throw new NotFoundException('Incident không còn tồn tại');
        const check = canTransition(inc.status, 'REOPEN');
        if (!check.ok) throw new BadRequestException(check.reason);
        inc.status = check.next;
        inc.resolved_at = null;
        inc.closed_at = null;
        await mgr.save(inc);

        if (inc.work_item_id) {
          await this.workItems.syncProgress(inc.work_item_id, 0, false);
        }
      }

      return req;
    });
  }

  // ── ASSIGNEE CHANGE SUB-FLOW ─────────────────────────────
  async requestAssigneeChange(
    incidentId: string,
    dto: CreateAssigneeChangeRequestDto,
    requesterId: string,
  ) {
    const inc = await this.findOne(incidentId);
    if (inc.status === IncidentStatus.COMPLETED) {
      throw new BadRequestException(
        'Không thể đổi người phụ trách khi sự cố đã COMPLETED',
      );
    }
    return this.changeRepo.save(
      this.changeRepo.create({
        incident_id: incidentId,
        requested_by: requesterId,
        proposed_assignee_id: dto.proposed_assignee_id,
        reason: dto.reason,
      }),
    );
  }

  async decideAssigneeChange(
    requestId: string,
    approve: boolean,
    dto: DecideRequestDto,
    approverId: string,
  ) {
    return this.dataSource.transaction(async (mgr) => {
      const req = await mgr.findOne(IncidentAssigneeChangeRequest, {
        where: { id: requestId },
      });
      if (!req)
        throw new NotFoundException(
          'Không tìm thấy yêu cầu đổi người phụ trách',
        );
      if (req.status !== IncidentApprovalStatus.PENDING) {
        throw new BadRequestException('Yêu cầu này đã được xử lý');
      }

      req.status = approve
        ? IncidentApprovalStatus.APPROVED
        : IncidentApprovalStatus.REJECTED;
      req.decided_by = approverId;
      req.decided_at = new Date();
      req.decision_note = dto.decision_note ?? null;
      await mgr.save(req);

      if (approve) {
        const inc = await mgr.findOne(Incident, {
          where: { id: req.incident_id },
        });
        if (!inc) throw new NotFoundException('Incident không còn tồn tại');
        inc.assigned_to = req.proposed_assignee_id;
        await mgr.save(inc);
      }

      return req;
    });
  }
}
