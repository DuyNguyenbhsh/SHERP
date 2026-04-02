import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProgressReport } from './entities/progress-report.entity';
import { VariationOrder } from './entities/variation-order.entity';
import { ReportStatus, VOStatus } from './enums/monitoring.enum';
import { CreateProgressReportDto, CreateVODto } from './dto/monitoring.dto';
import {
  calculateProjectHealth,
  calculateOverallProgress,
} from './domain/health.logic';
import { ProjectsService } from '../projects/projects.service';
import { ExcelService } from '../shared/excel';
import { ProjectWbs } from '../projects/entities/project-wbs.entity';
import { ProjectCbs } from '../projects/entities/project-cbs.entity';
import { ProjectTransaction } from '../projects/entities/project-transaction.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class ProjectMonitoringService {
  constructor(
    @InjectRepository(ProgressReport)
    private reportRepo: Repository<ProgressReport>,
    @InjectRepository(VariationOrder)
    private voRepo: Repository<VariationOrder>,
    @InjectRepository(ProjectWbs)
    private wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(ProjectCbs)
    private cbsRepo: Repository<ProjectCbs>,
    @InjectRepository(ProjectTransaction)
    private txRepo: Repository<ProjectTransaction>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    private excelService: ExcelService,
  ) {}

  // ══════════════════════════════════════════
  // PROJECT HEALTH (SPI/CPI from Baseline vs Actual)
  // ══════════════════════════════════════════

  async calculateProjectHealth(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    // PV = tổng CBS planned (baseline)
    const pvResult = await this.cbsRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.planned_amount), 0)', 'total')
      .where('c.project_id = :pid', { pid: projectId })
      .getRawOne();
    const pv = parseFloat(pvResult?.total || '0');

    // EV = sum(progress_percent/100 × CBS_planned) per WBS
    const wbsNodes = await this.wbsRepo.find({
      where: { project_id: projectId },
    });
    const cbsRows = await this.cbsRepo
      .createQueryBuilder('c')
      .select('c.wbs_id', 'wbs_id')
      .addSelect('SUM(c.planned_amount)', 'total')
      .where('c.project_id = :pid', { pid: projectId })
      .groupBy('c.wbs_id')
      .getRawMany();
    const cbsMap = new Map<string, number>();
    for (const r of cbsRows) cbsMap.set(r.wbs_id, parseFloat(r.total || '0'));

    let ev = 0;
    for (const wbs of wbsNodes) {
      const wbsPv = cbsMap.get(wbs.id) ?? 0;
      ev += (Number(wbs.progress_percent) / 100) * wbsPv;
    }

    // AC = tổng transactions + WMS data (chi phí thực tế)
    const acResult = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.project_id = :pid', { pid: projectId })
      .getRawOne();
    const ac = parseFloat(acResult?.total || '0');

    const bac = project.budget ? Number(project.budget) : pv;

    // Domain logic: pure calculation
    const health = calculateProjectHealth({
      planned_value: pv,
      earned_value: ev,
      actual_cost: ac,
      bac,
    });

    return {
      status: 'success',
      message: 'Sức khỏe dự án',
      data: {
        ...health,
        planned_value: pv,
        earned_value: Math.round(ev * 100) / 100,
        actual_cost: ac,
        bac,
      },
    };
  }

  // ══════════════════════════════════════════
  // PROGRESS REPORTS
  // ══════════════════════════════════════════

  async createReport(
    dto: CreateProgressReportDto,
    userId: string,
    userName?: string,
  ) {
    // Snapshot EVM at report time
    const healthResult = await this.calculateProjectHealth(dto.project_id);
    const h = healthResult.data;

    const wbsNodes = await this.wbsRepo.find({
      where: { project_id: dto.project_id },
    });
    const overall = calculateOverallProgress(wbsNodes);

    const report = this.reportRepo.create({
      project_id: dto.project_id,
      report_period: dto.report_period,
      report_date: new Date(dto.report_date),
      summary: dto.summary,
      wbs_progress: dto.wbs_progress,
      evidence_attachments: dto.evidence_attachments,
      evidence_notes: dto.evidence_notes,
      overall_progress: overall,
      earned_value: h.earned_value,
      actual_cost: h.actual_cost,
      planned_value: h.planned_value,
      spi: h.spi,
      cpi: h.cpi,
      status: ReportStatus.DRAFT,
      created_by: userId,
      created_by_name: userName ?? '',
    });

    const saved = await this.reportRepo.save(report);
    return {
      status: 'success',
      message: 'Tạo báo cáo tiến độ thành công',
      data: saved,
    };
  }

  async submitReport(id: string, userId: string, userName?: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report)
      throw new NotFoundException({
        status: 'error',
        message: 'Báo cáo không tồn tại!',
        data: null,
      });
    if (report.status !== ReportStatus.DRAFT) {
      throw new BadRequestException({
        status: 'error',
        message: 'Chỉ submit báo cáo ở trạng thái DRAFT',
        data: null,
      });
    }

    // ── ENFORCEMENT: Bắt buộc ảnh hiện trường ──
    if (
      !report.evidence_attachments ||
      report.evidence_attachments.length === 0
    ) {
      throw new BadRequestException({
        status: 'error',
        message:
          'BẮT BUỘC đính kèm ảnh chụp hiện trường hoặc biên bản xác nhận sản lượng trước khi gửi báo cáo. Không chấp nhận báo cáo không có bằng chứng.',
        data: null,
      });
    }

    // Cập nhật WBS progress thực tế vào bảng project_wbs
    if (report.wbs_progress && report.wbs_progress.length > 0) {
      for (const item of report.wbs_progress) {
        await this.wbsRepo.update(item.wbs_id, {
          progress_percent: item.actual_percent,
        });
      }
    }

    report.status = ReportStatus.SUBMITTED;
    await this.reportRepo.save(report);

    return {
      status: 'success',
      message: 'Đã gửi báo cáo tiến độ — chờ duyệt',
      data: report,
    };
  }

  async approveReport(id: string, userId: string, userName?: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report)
      throw new NotFoundException({
        status: 'error',
        message: 'Báo cáo không tồn tại!',
        data: null,
      });
    if (report.status !== ReportStatus.SUBMITTED) {
      throw new BadRequestException({
        status: 'error',
        message: 'Chỉ duyệt báo cáo ở trạng thái SUBMITTED',
        data: null,
      });
    }

    report.status = ReportStatus.APPROVED;
    report.approved_by = userId;
    report.approved_by_name = userName ?? '';
    await this.reportRepo.save(report);

    return {
      status: 'success',
      message: 'Đã duyệt báo cáo tiến độ',
      data: report,
    };
  }

  async rejectReport(
    id: string,
    userId: string,
    userName?: string,
    reason?: string,
  ) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report)
      throw new NotFoundException({
        status: 'error',
        message: 'Báo cáo không tồn tại!',
        data: null,
      });

    report.status = ReportStatus.REJECTED;
    report.rejection_reason = reason ?? '';
    await this.reportRepo.save(report);

    return { status: 'success', message: 'Đã từ chối báo cáo', data: report };
  }

  async findReports(projectId: string) {
    const reports = await this.reportRepo.find({
      where: { project_id: projectId },
      order: { report_date: 'DESC' },
    });
    return { status: 'success', data: reports };
  }

  async findReport(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report)
      throw new NotFoundException({
        status: 'error',
        message: 'Báo cáo không tồn tại!',
        data: null,
      });
    return { status: 'success', data: report };
  }

  // ══════════════════════════════════════════
  // VARIATION ORDERS (VO)
  // ══════════════════════════════════════════

  private async generateVOCode(): Promise<string> {
    const now = new Date();
    const prefix = `VO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const last = await this.voRepo
      .createQueryBuilder('v')
      .where('v.vo_code LIKE :p', { p: `${prefix}%` })
      .orderBy('v.vo_code', 'DESC')
      .getOne();
    const seq = last
      ? parseInt(last.vo_code.split('-').pop() || '0', 10) + 1
      : 1;
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  async createVO(dto: CreateVODto, userId: string, userName?: string) {
    const project = await this.projectRepo.findOne({
      where: { id: dto.project_id },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    const code = await this.generateVOCode();
    const vo = this.voRepo.create({
      project_id: dto.project_id,
      vo_code: code,
      title: dto.title,
      description: dto.description,
      vo_type: dto.vo_type,
      budget_before: project.budget ? Number(project.budget) : null,
      budget_after: dto.budget_after,
      budget_delta:
        dto.budget_after != null && project.budget != null
          ? dto.budget_after - Number(project.budget)
          : null,
      timeline_before: (project.gfa_m2 as unknown as Date) ?? '', // placeholder
      timeline_after: dto.timeline_after ? new Date(dto.timeline_after) : null,
      scope_description: dto.scope_description,
      attachments: dto.attachments,
      reason: dto.reason,
      status: VOStatus.DRAFT,
      created_by: userId,
      created_by_name: userName ?? '',
    });

    const saved = await this.voRepo.save(vo);
    return {
      status: 'success',
      message: `Tạo VO ${code} thành công`,
      data: saved,
    };
  }

  async submitVO(id: string) {
    const vo = await this.voRepo.findOne({ where: { id } });
    if (!vo)
      throw new NotFoundException({
        status: 'error',
        message: 'VO không tồn tại!',
        data: null,
      });
    if (vo.status !== VOStatus.DRAFT)
      throw new BadRequestException({
        status: 'error',
        message: 'Chỉ submit VO ở trạng thái DRAFT',
        data: null,
      });

    vo.status = VOStatus.SUBMITTED;
    await this.voRepo.save(vo);
    return { status: 'success', message: 'Đã gửi VO — chờ duyệt', data: vo };
  }

  /**
   * approveVO: Khi duyệt → TỰ ĐỘNG cập nhật project budget/timeline.
   */
  async approveVO(id: string, userId: string, userName?: string) {
    const vo = await this.voRepo.findOne({ where: { id } });
    if (!vo)
      throw new NotFoundException({
        status: 'error',
        message: 'VO không tồn tại!',
        data: null,
      });
    if (vo.status !== VOStatus.SUBMITTED)
      throw new BadRequestException({
        status: 'error',
        message: 'Chỉ duyệt VO ở trạng thái SUBMITTED',
        data: null,
      });

    return this.dataSource.transaction(async (manager) => {
      vo.status = VOStatus.APPROVED;
      vo.approved_by = userId;
      vo.approved_by_name = userName ?? '';
      await manager.save(VariationOrder, vo);

      // ── Auto-update project ──
      const project = await manager.findOne(Project, {
        where: { id: vo.project_id },
      });
      if (project) {
        if (vo.budget_after != null) {
          project.budget = vo.budget_after;
        }
        // Timeline update nếu có (dùng planned_end từ WBS hoặc plan)
        await manager.save(Project, project);
      }

      return {
        status: 'success',
        message: `VO ${vo.vo_code} đã duyệt. ${vo.budget_after != null ? `Ngân sách dự án cập nhật thành ${Number(vo.budget_after).toLocaleString('vi-VN')} ₫` : ''}`,
        data: vo,
      };
    });
  }

  async rejectVO(
    id: string,
    userId: string,
    userName?: string,
    reason?: string,
  ) {
    const vo = await this.voRepo.findOne({ where: { id } });
    if (!vo)
      throw new NotFoundException({
        status: 'error',
        message: 'VO không tồn tại!',
        data: null,
      });

    vo.status = VOStatus.REJECTED;
    vo.rejection_reason = reason ?? '';
    await this.voRepo.save(vo);
    return { status: 'success', message: 'VO đã bị từ chối', data: vo };
  }

  async findVOs(projectId: string) {
    const vos = await this.voRepo.find({
      where: { project_id: projectId },
      order: { created_at: 'DESC' },
    });
    return { status: 'success', data: vos };
  }

  async findVO(id: string) {
    const vo = await this.voRepo.findOne({ where: { id } });
    if (!vo)
      throw new NotFoundException({
        status: 'error',
        message: 'VO không tồn tại!',
        data: null,
      });
    return { status: 'success', data: vo };
  }

  // ── S-Curve data (cumulative PV, EV, AC over time) ──
  async getSCurveData(projectId: string) {
    const reports = await this.reportRepo.find({
      where: { project_id: projectId, status: ReportStatus.APPROVED },
      order: { report_date: 'ASC' },
    });

    const data = reports.map((r) => ({
      period: r.report_period,
      date: r.report_date,
      pv: Number(r.planned_value),
      ev: Number(r.earned_value),
      ac: Number(r.actual_cost),
      spi: Number(r.spi),
      cpi: Number(r.cpi),
      progress: Number(r.overall_progress),
    }));

    return { status: 'success', data };
  }
}
