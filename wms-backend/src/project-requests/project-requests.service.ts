import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectRequest } from './entities/project-request.entity';
import { WorkflowLog } from './entities/workflow-log.entity';
import { CreateProjectRequestDto } from './dto/create-project-request.dto';
import {
  ProjectRequestStatus,
  REQUEST_STATUS_TRANSITIONS,
} from './enums/request-status.enum';
import { ProjectsService } from '../projects/projects.service';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';

@Injectable()
export class ProjectRequestsService {
  constructor(
    @InjectRepository(ProjectRequest)
    private requestRepo: Repository<ProjectRequest>,
    @InjectRepository(WorkflowLog)
    private logRepo: Repository<WorkflowLog>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    private excelService: ExcelService,
  ) {}

  // ── Tạo mã tự động: YC-YYMMDD-001 ──
  private async generateCode(): Promise<string> {
    const now = new Date();
    const prefix = `YC-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const lastToday = await this.requestRepo
      .createQueryBuilder('r')
      .where('r.request_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.request_code', 'DESC')
      .getOne();

    let seq = 1;
    if (lastToday) {
      const lastSeq = parseInt(
        lastToday.request_code.split('-').pop() || '0',
        10,
      );
      seq = lastSeq + 1;
    }
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  // ── CRUD ──

  async create(
    dto: CreateProjectRequestDto,
    userId: string,
    userName?: string,
  ) {
    const code = await this.generateCode();

    const request = this.requestRepo.create({
      request_code: code,
      title: dto.title,
      description: dto.description,
      proposed_project_code: dto.proposed_project_code,
      proposed_project_name: dto.proposed_project_name,
      location: dto.location,
      gfa_m2: dto.gfa_m2,
      budget: dto.budget,
      investor_id: dto.investor_id,
      manager_id: dto.manager_id,
      department_id: dto.department_id,
      proposed_stage: dto.proposed_stage || 'PLANNING',
      status: ProjectRequestStatus.DRAFT,
      created_by: userId,
      created_by_name: userName,
    });

    const saved = await this.requestRepo.save(request);
    return {
      status: 'success',
      message: `Tạo yêu cầu ${code} thành công`,
      data: saved,
    };
  }

  async findAll(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const requests = await this.requestRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${requests.length} yêu cầu`,
      data: requests,
    };
  }

  async findOne(id: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['workflow_logs'],
    });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });
    return { status: 'success', message: 'Chi tiết yêu cầu', data: request };
  }

  // ── WORKFLOW ACTIONS ──

  private validateTransition(
    current: ProjectRequestStatus,
    target: ProjectRequestStatus,
  ): void {
    const allowed = REQUEST_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException({
        status: 'error',
        message: `Không thể chuyển từ "${current}" sang "${target}". Cho phép: ${allowed.join(', ') || 'không có'}`,
        data: null,
      });
    }
  }

  private async logAction(
    requestId: string,
    fromStatus: string,
    toStatus: string,
    action: string,
    actedBy: string,
    actedByName?: string,
    actorRole?: string,
    comment?: string,
  ): Promise<void> {
    await this.logRepo.save(
      this.logRepo.create({
        request_id: requestId,
        from_status: fromStatus,
        to_status: toStatus,
        action,
        acted_by: actedBy,
        acted_by_name: actedByName,
        actor_role: actorRole,
        comment,
      }),
    );
  }

  /** Bước 1: Nhân viên gửi đề xuất */
  async submit(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });

    this.validateTransition(request.status, ProjectRequestStatus.SUBMITTED);

    const fromStatus = request.status;
    request.status = ProjectRequestStatus.SUBMITTED;
    await this.requestRepo.save(request);

    await this.logAction(
      id,
      fromStatus,
      request.status,
      'SUBMIT',
      userId,
      userName,
      'STAFF',
      comment,
    );

    return { status: 'success', message: 'Đã gửi đề xuất', data: request };
  }

  /** Bước 2: Trưởng bộ phận duyệt */
  async approveDept(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });

    this.validateTransition(request.status, ProjectRequestStatus.DEPT_APPROVED);

    const fromStatus = request.status;
    request.status = ProjectRequestStatus.DEPT_APPROVED;
    await this.requestRepo.save(request);

    await this.logAction(
      id,
      fromStatus,
      request.status,
      'APPROVE',
      userId,
      userName,
      'DEPT_HEAD',
      comment,
    );

    return {
      status: 'success',
      message: 'Trưởng bộ phận đã duyệt',
      data: request,
    };
  }

  /** Bước 3: Ban điều hành duyệt → Tự động tạo Project */
  async approveExec(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });

    this.validateTransition(request.status, ProjectRequestStatus.EXEC_APPROVED);

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = request.status;
      request.status = ProjectRequestStatus.EXEC_APPROVED;
      await manager.save(ProjectRequest, request);

      await manager.save(
        WorkflowLog,
        this.logRepo.create({
          request_id: id,
          from_status: fromStatus,
          to_status: request.status,
          action: 'APPROVE',
          acted_by: userId,
          acted_by_name: userName,
          actor_role: 'EXEC_BOARD',
          comment,
        }),
      );

      // ── Tự động tạo Project từ dữ liệu yêu cầu ──
      try {
        const projectResult = await this.projectsService.create({
          project_code: request.proposed_project_code,
          project_name: request.proposed_project_name,
          description: request.description ?? undefined,
          location: request.location ?? undefined,
          gfa_m2: request.gfa_m2 ? Number(request.gfa_m2) : undefined,
          budget: request.budget ? Number(request.budget) : undefined,
          investor_id: request.investor_id ?? undefined,
          manager_id: request.manager_id ?? undefined,
          department_id: request.department_id ?? undefined,
          stage: (request.proposed_stage as any) ?? 'PLANNING',
        });

        request.status = ProjectRequestStatus.DEPLOYED;
        request.deployed_project_id = projectResult.data.id;
        await manager.save(ProjectRequest, request);

        await manager.save(
          WorkflowLog,
          this.logRepo.create({
            request_id: id,
            from_status: ProjectRequestStatus.EXEC_APPROVED,
            to_status: ProjectRequestStatus.DEPLOYED,
            action: 'DEPLOY',
            acted_by: 'SYSTEM',
            acted_by_name: 'Hệ thống',
            actor_role: 'SYSTEM',
            comment: `Tự động tạo dự án ${request.proposed_project_code}`,
          }),
        );

        return {
          status: 'success',
          message: `Ban điều hành đã duyệt. Dự án ${request.proposed_project_code} đã được tạo tự động.`,
          data: request,
        };
      } catch (err: any) {
        // Nếu tạo project lỗi (VD: trùng mã) → vẫn approve nhưng không deploy
        return {
          status: 'success',
          message: `Ban điều hành đã duyệt. Lưu ý: Không thể tạo dự án tự động — ${err.message}`,
          data: request,
        };
      }
    });
  }

  /** Từ chối (áp dụng ở bất kỳ bước nào đang chờ duyệt) */
  async reject(
    id: string,
    userId: string,
    userName?: string,
    actorRole?: string,
    comment?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });

    this.validateTransition(request.status, ProjectRequestStatus.REJECTED);

    const fromStatus = request.status;
    request.status = ProjectRequestStatus.REJECTED;
    request.rejection_reason = comment ?? '';
    await this.requestRepo.save(request);

    await this.logAction(
      id,
      fromStatus,
      request.status,
      'REJECT',
      userId,
      userName,
      actorRole,
      comment,
    );

    return {
      status: 'success',
      message: 'Yêu cầu đã bị từ chối',
      data: request,
    };
  }

  /** Hủy yêu cầu (chỉ owner hoặc admin) */
  async cancel(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yêu cầu không tồn tại!',
        data: null,
      });

    if (request.status === ProjectRequestStatus.DEPLOYED) {
      throw new BadRequestException({
        status: 'error',
        message: 'Không thể hủy yêu cầu đã triển khai!',
        data: null,
      });
    }

    const fromStatus = request.status;
    request.status = ProjectRequestStatus.CANCELED;
    await this.requestRepo.save(request);

    await this.logAction(
      id,
      fromStatus,
      request.status,
      'CANCEL',
      userId,
      userName,
      undefined,
      comment,
    );

    return { status: 'success', message: 'Đã hủy yêu cầu', data: request };
  }

  // ── EXPORT EXCEL TỜ TRÌNH ──

  private readonly EXPORT_COLUMNS: ExcelColumnDef[] = [
    { header: 'Mã yêu cầu', key: 'request_code', width: 18 },
    { header: 'Tiêu đề', key: 'title', width: 35 },
    { header: 'Mã DA đề xuất', key: 'proposed_project_code', width: 16 },
    { header: 'Tên DA đề xuất', key: 'proposed_project_name', width: 30 },
    { header: 'Địa điểm', key: 'location', width: 22 },
    { header: 'GFA (m²)', key: 'gfa_m2', width: 14, type: 'number' },
    { header: 'Ngân sách (VNĐ)', key: 'budget', width: 22, type: 'number' },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Người đề xuất', key: 'created_by_name', width: 20 },
    { header: 'Ngày tạo', key: 'created_at', width: 16, type: 'date' },
  ];

  async exportToExcel(status?: string): Promise<Buffer> {
    const result = await this.findAll(status);
    const data = result.data.map((r) => ({
      ...r,
      gfa_m2: r.gfa_m2 ? Number(r.gfa_m2) : '',
      budget: r.budget ? Number(r.budget) : '',
      created_at: new Date(r.created_at).toLocaleDateString('vi-VN'),
    }));

    return this.excelService.exportToExcel({
      sheetName: 'Tờ trình dự án',
      columns: this.EXPORT_COLUMNS,
      data,
      title: `Danh sách Tờ trình Dự án — ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  /** Export tờ trình chi tiết cho 1 yêu cầu (dùng để in ký đóng dấu) */
  async exportSingleToExcel(id: string): Promise<Buffer> {
    const result = await this.findOne(id);
    const r = result.data;

    const detailColumns: ExcelColumnDef[] = [
      { header: 'Nội dung', key: 'field', width: 25 },
      { header: 'Chi tiết', key: 'value', width: 50 },
    ];

    const data = [
      { field: 'Mã yêu cầu', value: r.request_code },
      { field: 'Tiêu đề tờ trình', value: r.title },
      { field: 'Nội dung', value: r.description ?? '' },
      { field: 'Mã dự án đề xuất', value: r.proposed_project_code },
      { field: 'Tên dự án đề xuất', value: r.proposed_project_name },
      { field: 'Địa điểm', value: r.location ?? '' },
      {
        field: 'GFA (m²)',
        value: r.gfa_m2 ? Number(r.gfa_m2).toLocaleString('vi-VN') : '',
      },
      {
        field: 'Ngân sách (VNĐ)',
        value: r.budget ? Number(r.budget).toLocaleString('vi-VN') + ' ₫' : '',
      },
      { field: 'Giai đoạn', value: r.proposed_stage },
      { field: 'Trạng thái', value: r.status },
      { field: 'Người đề xuất', value: r.created_by_name ?? '' },
      {
        field: 'Ngày tạo',
        value: new Date(r.created_at).toLocaleDateString('vi-VN'),
      },
      { field: '', value: '' },
      { field: 'LỊCH SỬ PHÊ DUYỆT', value: '' },
      ...r.workflow_logs.map((log) => ({
        field: `${log.action} — ${log.actor_role ?? ''}`,
        value: `${log.acted_by_name ?? log.acted_by} | ${new Date(log.acted_at).toLocaleString('vi-VN')}${log.comment ? ` | ${log.comment}` : ''}`,
      })),
    ];

    return this.excelService.exportToExcel({
      sheetName: 'Tờ trình',
      columns: detailColumns,
      data,
      title: `TỜ TRÌNH DỰ ÁN — ${r.request_code}`,
    });
  }
}
