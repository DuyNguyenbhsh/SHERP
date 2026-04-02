import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectTransaction } from './entities/project-transaction.entity';
import { CostCategory } from './entities/cost-category.entity';
import { ProjectBudget } from './entities/project-budget.entity';
import { ProjectWbs } from './entities/project-wbs.entity';
import { ProjectBoqItem } from './entities/project-boq-item.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateCostCategoryDto } from './dto/create-cost-category.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { DocumentsService } from '../documents/documents.service';
import { ProjectHistoryService } from './project-history.service';
import { isValidTransition, STATUS_TRANSITIONS } from './enums/status-flow';
import { ProjectStatus, ProjectStage } from './enums/project.enum';
import { calculateCostSummary } from './domain/logic';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';
import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(ProjectAssignment)
    private assignmentRepo: Repository<ProjectAssignment>,
    @InjectRepository(ProjectTransaction)
    private transactionRepo: Repository<ProjectTransaction>,
    @InjectRepository(CostCategory)
    private categoryRepo: Repository<CostCategory>,
    @InjectRepository(ProjectBudget)
    private budgetRepo: Repository<ProjectBudget>,
    @InjectRepository(ProjectWbs)
    private wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(ProjectBoqItem)
    private boqRepo: Repository<ProjectBoqItem>,
    private historyService: ProjectHistoryService,
    @Inject(forwardRef(() => DocumentsService))
    private documentsService: DocumentsService,
    private excelService: ExcelService,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
  ) {}

  async findAll(status?: string, stage?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (stage) where.stage = stage;

    const projects = await this.projectRepo.find({
      where,
      relations: ['organization', 'investor', 'manager', 'department'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${projects.length} dự án`,
      data: projects,
    };
  }

  async findOne(id: string) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization', 'investor', 'manager', 'department'],
    });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });
    }
    return { status: 'success', message: 'Chi tiết dự án', data: project };
  }

  async checkCodeExists(code: string) {
    const exist = await this.projectRepo.findOne({
      where: { project_code: code },
    });
    return {
      status: 'success',
      message: exist ? 'Mã dự án đã tồn tại' : 'Mã dự án khả dụng',
      data: { exists: !!exist },
    };
  }

  async create(dto: CreateProjectDto) {
    const exist = await this.projectRepo.findOne({
      where: { project_code: dto.project_code },
    });
    if (exist) {
      throw new ConflictException({
        status: 'error',
        message: `Mã dự án "${dto.project_code}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
        data: { field: 'project_code', value: dto.project_code },
      });
    }

    try {
      const project = this.projectRepo.create(dto);
      const saved = await this.projectRepo.save(project);

      // Tự động tạo thư mục tài liệu mặc định cho dự án mới
      await this.documentsService.createDefaultFolders(saved.id);

      return {
        status: 'success',
        message: `Tạo dự án ${saved.project_code} thành công`,
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'tạo dự án');
    }
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization', 'investor', 'manager', 'department'],
    });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });
    }

    // ── Khóa trạng thái: COMPLETED/CANCELED không cho sửa ──
    if (
      project.status === ProjectStatus.COMPLETED ||
      project.status === ProjectStatus.CANCELED
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Dự án đang ở trạng thái "${project.status === ProjectStatus.COMPLETED ? 'Hoàn thành' : 'Hủy'}" — không thể chỉnh sửa.`,
        data: null,
      });
    }

    // ── Kiểm tra luồng chuyển trạng thái hợp lệ ──
    if (dto.status && dto.status !== project.status) {
      if (!isValidTransition(project.status, dto.status)) {
        const allowed = STATUS_TRANSITIONS[project.status];
        throw new BadRequestException({
          status: 'error',
          message: `Không thể chuyển trạng thái từ "${project.status}" sang "${dto.status}". Cho phép: ${allowed.join(', ') || 'không có'}`,
          data: { allowed_transitions: allowed },
        });
      }
    }

    // Audit log tự động qua ProjectSubscriber (TypeORM EntitySubscriber)
    // — không cần gọi thủ công, subscriber sẽ bắt afterUpdate event
    const { change_reason: _reason, ...updateFields } = dto;

    try {
      Object.assign(project, updateFields);
      const saved = await this.projectRepo.save(project);

      return {
        status: 'success',
        message: `Cập nhật dự án ${saved.project_code} thành công`,
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'cập nhật dự án');
    }
  }

  async remove(id: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });
    }

    // Soft delete — cập nhật deleted_at thay vì xóa hẳn
    await this.projectRepo.softDelete(id);

    return {
      status: 'success',
      message: `Đã lưu trữ dự án ${project.project_code} thành công`,
      data: null,
    };
  }

  // ── PROJECT ASSIGNMENTS ──

  async findAllAssignments() {
    const assignments = await this.assignmentRepo.find({
      relations: ['project', 'employee', 'employee.department'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${assignments.length} phân công`,
      data: assignments,
    };
  }

  async findAssignmentsByProject(projectId: string) {
    const assignments = await this.assignmentRepo.find({
      where: { project_id: projectId },
      relations: ['employee', 'employee.department'],
      order: { role: 'ASC', created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${assignments.length} phân công`,
      data: assignments,
    };
  }

  async createAssignment(projectId: string, dto: CreateAssignmentDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });
    }

    const existing = await this.assignmentRepo.findOne({
      where: { project_id: projectId, employee_id: dto.employee_id },
    });
    if (existing) {
      throw new ConflictException({
        status: 'error',
        message: 'Nhân viên đã được phân công vào dự án này!',
        data: null,
      });
    }

    try {
      const assignment = this.assignmentRepo.create({
        project_id: projectId,
        employee_id: dto.employee_id,
        role: dto.role,
      });

      const saved = await this.assignmentRepo.save(assignment);

      return {
        status: 'success',
        message: 'Phân công nhân viên thành công',
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'phân công nhân viên');
    }
  }

  async removeAssignment(assignmentId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException({
        status: 'error',
        message: 'Phân công không tồn tại!',
        data: null,
      });
    }

    await this.assignmentRepo.delete(assignmentId);

    return {
      status: 'success',
      message: 'Xóa phân công thành công',
      data: null,
    };
  }

  // ── COST CATEGORIES (Danh mục dùng chung) ──

  async findAllCategories() {
    const categories = await this.categoryRepo.find({ order: { code: 'ASC' } });
    return {
      status: 'success',
      message: `Tìm thấy ${categories.length} loại chi phí`,
      data: categories,
    };
  }

  async createCategory(dto: CreateCostCategoryDto) {
    const exist = await this.categoryRepo.findOne({
      where: { code: dto.code },
    });
    if (exist)
      throw new ConflictException({
        status: 'error',
        message: `Mã loại chi phí "${dto.code}" đã tồn tại!`,
        data: null,
      });

    try {
      const saved = await this.categoryRepo.save(this.categoryRepo.create(dto));
      return {
        status: 'success',
        message: `Tạo loại chi phí ${saved.code} thành công`,
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'tạo loại chi phí');
    }
  }

  async removeCategory(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat)
      throw new NotFoundException({
        status: 'error',
        message: 'Loại chi phí không tồn tại!',
        data: null,
      });
    await this.categoryRepo.delete(id);
    return {
      status: 'success',
      message: `Xóa loại chi phí ${cat.code} thành công`,
      data: null,
    };
  }

  // ── PROJECT BUDGETS (Kế hoạch ngân sách theo hạng mục) ──

  async findBudgets(projectId: string) {
    const budgets = await this.budgetRepo.find({
      where: { project_id: projectId },
      relations: ['category'],
      order: { category: { code: 'ASC' } },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${budgets.length} dòng ngân sách`,
      data: budgets,
    };
  }

  async upsertBudget(projectId: string, dto: UpsertBudgetDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    let budget = await this.budgetRepo.findOne({
      where: { project_id: projectId, category_id: dto.category_id },
    });

    if (budget) {
      budget.planned_amount = dto.planned_amount;
      if (dto.notes !== undefined) budget.notes = dto.notes;
    } else {
      budget = this.budgetRepo.create({
        project_id: projectId,
        category_id: dto.category_id,
        planned_amount: dto.planned_amount,
        notes: dto.notes,
      });
    }

    try {
      const saved = await this.budgetRepo.save(budget);
      return {
        status: 'success',
        message: 'Cập nhật ngân sách thành công',
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'cập nhật ngân sách');
    }
  }

  async removeBudget(budgetId: string) {
    const budget = await this.budgetRepo.findOne({ where: { id: budgetId } });
    if (!budget)
      throw new NotFoundException({
        status: 'error',
        message: 'Dòng ngân sách không tồn tại!',
        data: null,
      });
    await this.budgetRepo.delete(budgetId);
    return {
      status: 'success',
      message: 'Xóa dòng ngân sách thành công',
      data: null,
    };
  }

  // ── PROJECT TRANSACTIONS (Chi phí thực tế) ──

  async findTransactions(projectId: string) {
    const transactions = await this.transactionRepo.find({
      where: { project_id: projectId },
      relations: ['category'],
      order: { transaction_date: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${transactions.length} giao dịch`,
      data: transactions,
    };
  }

  async createTransaction(projectId: string, dto: CreateTransactionDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    const transaction = this.transactionRepo.create({
      project_id: projectId,
      category_id: dto.category_id,
      description: dto.description,
      amount: dto.amount,
      transaction_date: new Date(dto.transaction_date),
      reference_type: dto.reference_type,
      reference_id: dto.reference_id,
    });

    try {
      const saved = await this.transactionRepo.save(transaction);
      return {
        status: 'success',
        message: 'Tạo giao dịch thành công',
        data: saved,
      };
    } catch (error: any) {
      this.handleDbError(error, 'tạo giao dịch');
    }
  }

  async removeTransaction(transactionId: string) {
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!tx)
      throw new NotFoundException({
        status: 'error',
        message: 'Giao dịch không tồn tại!',
        data: null,
      });
    await this.transactionRepo.delete(transactionId);
    return {
      status: 'success',
      message: 'Xóa giao dịch thành công',
      data: null,
    };
  }

  // ── COST SUMMARY (Realtime aggregation từ budgets + transactions) ──

  async getCostSummary(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    // Tổng ngân sách theo hạng mục
    const budgetRows: {
      category_id: string;
      code: string;
      name: string;
      planned: string;
    }[] = await this.budgetRepo
      .createQueryBuilder('b')
      .innerJoin('b.category', 'c')
      .select('b.category_id', 'category_id')
      .addSelect('c.code', 'code')
      .addSelect('c.name', 'name')
      .addSelect('b.planned_amount', 'planned')
      .where('b.project_id = :projectId', { projectId })
      .getRawMany();

    // Tổng chi phí thực tế theo hạng mục
    const actualRows: {
      category_id: string;
      code: string;
      name: string;
      total: string;
      count: string;
    }[] = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.category', 'c')
      .select('t.category_id', 'category_id')
      .addSelect('c.code', 'code')
      .addSelect('c.name', 'name')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.project_id = :projectId', { projectId })
      .groupBy('t.category_id')
      .addGroupBy('c.code')
      .addGroupBy('c.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    // Domain logic: tính cost summary
    const parsedBudgets = budgetRows.map((b) => ({
      category_id: b.category_id,
      code: b.code,
      name: b.name,
      planned: parseFloat(b.planned || '0'),
    }));
    const parsedActuals = actualRows.map((a) => ({
      category_id: a.category_id,
      code: a.code,
      name: a.name,
      total: parseFloat(a.total || '0'),
      count: parseInt(a.count || '0', 10),
    }));

    const summary = calculateCostSummary(parsedBudgets, parsedActuals);

    return {
      status: 'success',
      message: 'Tổng hợp chi phí dự án',
      data: summary,
    };
  }

  // ══════════════════════════════════════════
  // EXCEL EXPORT / IMPORT / TEMPLATE
  // ══════════════════════════════════════════

  private readonly PROJECT_COLUMNS: ExcelColumnDef[] = [
    { header: 'Mã dự án', key: 'project_code', width: 16, type: 'string' },
    { header: 'Tên dự án', key: 'project_name', width: 35, type: 'string' },
    { header: 'Mô tả', key: 'description', width: 30, type: 'string' },
    { header: 'Giai đoạn', key: 'stage', width: 15, type: 'string' },
    { header: 'Trạng thái', key: 'status', width: 15, type: 'string' },
    { header: 'Địa điểm', key: 'location', width: 25, type: 'string' },
    { header: 'GFA (m²)', key: 'gfa_m2', width: 14, type: 'number' },
    { header: 'Ngân sách (VNĐ)', key: 'budget', width: 22, type: 'number' },
    { header: 'Mã CĐT', key: 'investor_code', width: 16, type: 'string' },
    { header: 'Mã GĐDA', key: 'manager_code', width: 16, type: 'string' },
    {
      header: 'Mã Phòng ban',
      key: 'department_code',
      width: 18,
      type: 'string',
    },
    {
      header: 'Mã Tổ chức',
      key: 'organization_code',
      width: 18,
      type: 'string',
    },
  ];

  async exportToExcel(status?: string, stage?: string): Promise<Buffer> {
    const result = await this.findAll(status, stage);
    const projects = result.data;

    const data = projects.map((p) => ({
      project_code: p.project_code,
      project_name: p.project_name,
      description: p.description ?? '',
      stage: p.stage,
      status: p.status,
      location: p.location ?? '',
      gfa_m2: p.gfa_m2 != null ? Number(p.gfa_m2) : '',
      budget: p.budget != null ? Number(p.budget) : '',
      investor_code: p.investor?.supplier_code ?? '',
      manager_code: p.manager?.employee_code ?? '',
      department_code: p.department?.organization_code ?? '',
      organization_code: p.organization?.organization_code ?? '',
    }));

    return this.excelService.exportToExcel({
      sheetName: 'Dự án',
      columns: this.PROJECT_COLUMNS,
      data,
      title: `Danh sách Dự án — Xuất ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    return this.excelService.exportTemplate({
      sheetName: 'Dự án',
      columns: this.PROJECT_COLUMNS,
      sampleRow: {
        project_code: 'PRJ-001',
        project_name: 'Khu đô thị SH Central',
        description: 'Dự án mẫu',
        stage: 'PLANNING',
        status: 'DRAFT',
        location: 'Hà Nội',
        gfa_m2: 15000,
        budget: 50000000000,
        investor_code: 'SUP-001',
        manager_code: 'EMP-001',
        department_code: 'ORG-DA',
        organization_code: 'ORG-SH',
      },
    });
  }

  async importFromExcel(fileBuffer: Buffer) {
    // Preload lookup tables cho validation
    const [employees, orgs, suppliers] = await Promise.all([
      this.employeeRepo.find({ select: ['id', 'employee_code', 'full_name'] }),
      this.orgRepo.find({
        select: ['id', 'organization_code', 'organization_name'],
      }),
      this.supplierRepo.find({ select: ['id', 'supplier_code', 'name'] }),
    ]);

    const empMap = new Map(employees.map((e) => [e.employee_code, e.id]));
    const orgMap = new Map(orgs.map((o) => [o.organization_code, o.id]));
    const supMap = new Map(suppliers.map((s) => [s.supplier_code, s.id]));
    const validStages = Object.values(ProjectStage);
    const validStatuses = Object.values(ProjectStatus);

    const result = await this.excelService.parseExcel(fileBuffer, {
      columns: this.PROJECT_COLUMNS,
      requiredKeys: ['project_code', 'project_name'],
      validators: {
        stage: {
          validate: (v) => {
            if (!v) return null; // optional
            if (!validStages.includes(v as ProjectStage)) {
              return `Giai đoạn "${v}" không hợp lệ. Cho phép: ${validStages.join(', ')}`;
            }
            return null;
          },
        },
        status: {
          validate: (v) => {
            if (!v) return null;
            if (!validStatuses.includes(v as ProjectStatus)) {
              return `Trạng thái "${v}" không hợp lệ. Cho phép: ${validStatuses.join(', ')}`;
            }
            return null;
          },
        },
        manager_code: {
          validate: (v) => {
            if (!v) return null;
            if (!empMap.has(String(v))) {
              return `Mã GĐDA "${v}" không tồn tại trong Master Data`;
            }
            return null;
          },
        },
        department_code: {
          validate: (v) => {
            if (!v) return null;
            if (!orgMap.has(String(v))) {
              return `Mã Phòng ban "${v}" không tồn tại trong Master Data`;
            }
            return null;
          },
        },
        organization_code: {
          validate: (v) => {
            if (!v) return null;
            if (!orgMap.has(String(v))) {
              return `Mã Tổ chức "${v}" không tồn tại trong Master Data`;
            }
            return null;
          },
        },
        investor_code: {
          validate: (v) => {
            if (!v) return null;
            if (!supMap.has(String(v))) {
              return `Mã CĐT "${v}" không tồn tại trong Master Data`;
            }
            return null;
          },
        },
      },
    });

    // Persist valid rows
    let savedCount = 0;
    const persistErrors: { row: number; field: string; message: string }[] = [];

    for (const row of result.data) {
      const code = row.project_code as string;
      try {
        // Check duplicate
        const existing = await this.projectRepo.findOne({
          where: { project_code: code },
        });
        if (existing) {
          // Update
          Object.assign(existing, {
            project_name: row.project_name,
            description: row.description || existing.description,
            stage: row.stage || existing.stage,
            status: row.status || existing.status,
            location: row.location || existing.location,
            gfa_m2: row.gfa_m2 || existing.gfa_m2,
            budget: row.budget || existing.budget,
            investor_id: row.investor_code
              ? supMap.get(String(row.investor_code))
              : existing.investor_id,
            manager_id: row.manager_code
              ? empMap.get(String(row.manager_code))
              : existing.manager_id,
            department_id: row.department_code
              ? orgMap.get(String(row.department_code))
              : existing.department_id,
            organization_id: row.organization_code
              ? orgMap.get(String(row.organization_code))
              : existing.organization_id,
          });
          await this.projectRepo.save(existing);
        } else {
          // Create
          const project = this.projectRepo.create({
            project_code: code,
            project_name: row.project_name as string,
            description: (row.description as string) || undefined,
            stage: (row.stage as ProjectStage) || ProjectStage.PLANNING,
            status: (row.status as ProjectStatus) || ProjectStatus.DRAFT,
            location: (row.location as string) || undefined,
            gfa_m2: row.gfa_m2 ? Number(row.gfa_m2) : undefined,
            budget: row.budget ? Number(row.budget) : undefined,
            investor_id: row.investor_code
              ? supMap.get(String(row.investor_code))
              : undefined,
            manager_id: row.manager_code
              ? empMap.get(String(row.manager_code))
              : undefined,
            department_id: row.department_code
              ? orgMap.get(String(row.department_code))
              : undefined,
            organization_id: row.organization_code
              ? orgMap.get(String(row.organization_code))
              : undefined,
          });
          const saved = await this.projectRepo.save(project);
          // Auto-create default document folders
          await this.documentsService.createDefaultFolders(saved.id);
        }
        savedCount++;
      } catch (err: any) {
        persistErrors.push({
          row: 0,
          field: 'general',
          message: `Lỗi lưu "${code}": ${err.message}`,
        });
      }
    }

    const allErrors = [...result.errors, ...persistErrors];

    return {
      status: 'success',
      message: `Import: ${savedCount}/${result.totalRows} dự án thành công${allErrors.length > 0 ? `, ${allErrors.length} lỗi` : ''}`,
      data: {
        total_rows: result.totalRows,
        success_rows: savedCount,
        error_rows: allErrors.length,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
    };
  }

  // ── PROJECT SUMMARY (Dashboard tổng hợp) ──

  async getSummary(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['organization', 'investor', 'manager', 'department'],
    });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });
    }

    // Tổng hợp chi phí
    const budgetSum = await this.budgetRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.planned_amount), 0)', 'total')
      .where('b.project_id = :projectId', { projectId })
      .getRawOne();

    const actualSum = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.project_id = :projectId', { projectId })
      .getRawOne();

    const totalBudget = parseFloat(budgetSum?.total || '0');
    const totalActual = parseFloat(actualSum?.total || '0');
    const variance = totalBudget - totalActual;

    // Tổng hợp WBS
    const wbsStats = await this.wbsRepo
      .createQueryBuilder('w')
      .select('COUNT(w.id)', 'total_nodes')
      .addSelect(
        "COUNT(CASE WHEN w.status = 'COMPLETED' THEN 1 END)",
        'completed_nodes',
      )
      .addSelect(
        "COUNT(CASE WHEN w.status = 'IN_PROGRESS' THEN 1 END)",
        'in_progress_nodes',
      )
      .addSelect('COALESCE(AVG(w.progress_percent), 0)', 'avg_progress')
      .where('w.project_id = :projectId', { projectId })
      .getRawOne();

    // Tổng hợp BOQ
    const boqStats = await this.boqRepo
      .createQueryBuilder('b')
      .select('COUNT(b.id)', 'total_items')
      .addSelect('COALESCE(SUM(b.total_price), 0)', 'total_value')
      .addSelect(
        'COUNT(CASE WHEN b.quantity > 0 AND (b.issued_qty / b.quantity) > 1 THEN 1 END)',
        'over_issued_count',
      )
      .addSelect(
        'COUNT(CASE WHEN b.quantity > 0 AND (b.issued_qty / b.quantity) > 0.9 AND (b.issued_qty / b.quantity) <= 1 THEN 1 END)',
        'warning_count',
      )
      .where('b.project_id = :projectId', { projectId })
      .getRawOne();

    // Lịch sử gần đây (5 bản ghi mới nhất)
    const recentHistory = await this.historyService.findByProject(projectId, 5);

    // Số lượng phân công
    const assignmentCount = await this.assignmentRepo.count({
      where: { project_id: projectId },
    });

    return {
      status: 'success',
      message: 'Tổng hợp dự án',
      data: {
        project,
        finance: {
          total_budget: totalBudget,
          total_actual: totalActual,
          variance,
          variance_percent:
            totalBudget > 0
              ? Math.round(
                  ((totalActual - totalBudget) / totalBudget) * 10000,
                ) / 100
              : 0,
          transaction_count: parseInt(actualSum?.count || '0', 10),
        },
        wbs: {
          total_nodes: parseInt(wbsStats?.total_nodes || '0', 10),
          completed_nodes: parseInt(wbsStats?.completed_nodes || '0', 10),
          in_progress_nodes: parseInt(wbsStats?.in_progress_nodes || '0', 10),
          avg_progress:
            Math.round(parseFloat(wbsStats?.avg_progress || '0') * 100) / 100,
        },
        boq: {
          total_items: parseInt(boqStats?.total_items || '0', 10),
          total_value: parseFloat(boqStats?.total_value || '0'),
          over_issued_count: parseInt(boqStats?.over_issued_count || '0', 10),
          warning_count: parseInt(boqStats?.warning_count || '0', 10),
        },
        team_size: assignmentCount,
        recent_history: recentHistory,
      },
    };
  }

  // ── PROJECT HISTORY (Audit log) ──

  async findHistory(projectId: string) {
    const history = await this.historyService.findByProject(projectId);
    return {
      status: 'success',
      message: `Tìm thấy ${history.length} bản ghi`,
      data: history,
    };
  }

  // ── STATUS TRANSITIONS (Frontend helper) ──

  getAllowedTransitions(currentStatus: string) {
    const transitions =
      STATUS_TRANSITIONS[currentStatus as ProjectStatus] ?? [];
    return {
      status: 'success',
      data: { current: currentStatus, allowed: transitions },
    };
  }

  // ── Shared DB error handler ──

  private handleDbError(error: any, context: string): never {
    // HttpException đã được throw từ business logic → re-throw nguyên bản
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    // PostgreSQL Unique Violation → 409 Conflict
    if (error.code === '23505') {
      const field = this.extractFieldFromPgDetail(error.detail);
      const value = this.extractValueFromPgDetail(error.detail);
      const label = field || 'dữ liệu';
      throw new ConflictException({
        status: 'error',
        message: value
          ? `Không thể ${context}: ${label} "${value}" đã tồn tại.`
          : `Không thể ${context}: ${label} bị trùng.`,
        data: null,
      });
    }

    // PostgreSQL Foreign Key Violation → 409 Conflict
    if (error.code === '23503') {
      throw new ConflictException({
        status: 'error',
        message: `Không thể ${context}: Dữ liệu liên quan không tồn tại hoặc đang được sử dụng.`,
        data: null,
      });
    }

    // PostgreSQL Not Null Violation → 400 Bad Request
    if (error.code === '23502') {
      throw new BadRequestException({
        status: 'error',
        message: `Không thể ${context}: Thiếu dữ liệu bắt buộc.`,
        data: null,
      });
    }

    // Các lỗi khác → để GlobalExceptionFilter xử lý
    throw error;
  }

  private extractFieldFromPgDetail(detail?: string): string | null {
    if (!detail) return null;
    const match = detail.match(/Key \(([^)]+)\)/);
    if (!match) return null;
    const fields = match[1].split(',').map((f) => f.trim());
    const LABELS: Record<string, string> = {
      project_code: 'Mã dự án',
      project_name: 'Tên dự án',
      code: 'Mã',
      name: 'Tên',
      item_code: 'Mã hạng mục',
    };
    const last = fields[fields.length - 1];
    return LABELS[last] || last;
  }

  private extractValueFromPgDetail(detail?: string): string | null {
    if (!detail) return null;
    const match = detail.match(/=\(([^)]+)\)/);
    return match ? match[1] : null;
  }
}
