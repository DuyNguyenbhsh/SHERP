import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';
import { AuditLogService } from '../common/audit/audit-log.service';
import { AuditAction } from '../common/audit/audit-log.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    private excelService: ExcelService,
    private dataSource: DataSource,
    private auditLogService: AuditLogService,
  ) {}

  private readonly EMP_COLUMNS: ExcelColumnDef[] = [
    { header: 'Mã NV', key: 'employee_code', width: 14, type: 'string' },
    { header: 'Họ tên', key: 'full_name', width: 25, type: 'string' },
    { header: 'Email', key: 'email', width: 25, type: 'string' },
    { header: 'Điện thoại', key: 'phone', width: 16, type: 'string' },
    { header: 'Chức vụ', key: 'job_title', width: 20, type: 'string' },
    { header: 'Trạng thái', key: 'status', width: 14, type: 'string' },
    {
      header: 'Mã Phòng ban',
      key: 'department_code',
      width: 18,
      type: 'string',
    },
  ];

  // 1. TẠO NHÂN VIÊN MỚI
  async create(createDto: CreateEmployeeDto) {
    // Check trùng mã
    const exist = await this.employeeRepo.findOne({
      where: { employee_code: createDto.employee_code },
    });
    if (exist)
      throw new BadRequestException(
        `Mã nhân viên ${createDto.employee_code} đã tồn tại!`,
      );

    // Check phòng ban có tồn tại không
    const org = await this.orgRepo.findOne({
      where: { id: createDto.organization_id },
    });
    if (!org) throw new NotFoundException('Phòng ban/Chi nhánh không tồn tại!');

    const newEmp = this.employeeRepo.create({
      ...createDto,
      department: org, // Gán quan hệ
    });

    const saved = await this.employeeRepo.save(newEmp);

    await this.auditLogService.log({
      action: AuditAction.CREATE,
      entityName: 'Employee',
      entityId: saved.id,
      newData: {
        employee_code: saved.employee_code,
        full_name: saved.full_name,
        status: saved.status,
      },
    });

    return saved;
  }

  // 2. LẤY DANH SÁCH (Có kèm tên phòng ban + chức danh)
  async findAll() {
    return await this.employeeRepo.find({
      relations: ['department', 'position'],
      order: { created_at: 'DESC' },
    });
  }

  // 2b. Nhân viên CHƯA có tài khoản đăng nhập (dùng cho Dropdown tạo tài khoản)
  async findUnlinked() {
    return await this.employeeRepo
      .createQueryBuilder('e')
      .leftJoin('users', 'u', 'u.employee_id = e.id')
      .leftJoinAndSelect('e.department', 'd')
      .where('u.id IS NULL')
      .andWhere('e.deleted_at IS NULL')
      .andWhere('e.status = :status', { status: 'WORKING' })
      .orderBy('e.full_name', 'ASC')
      .getMany();
  }

  // 3. SỬA THÔNG TIN (có Audit Log + Diffing)
  async update(id: string, updateDto: any) {
    const emp = await this.employeeRepo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại');

    // Snapshot trước khi sửa
    const oldData = { ...emp };

    // Nếu có đổi phòng ban
    if (updateDto.organization_id) {
      const org = await this.orgRepo.findOne({
        where: { id: updateDto.organization_id },
      });
      if (!org) throw new NotFoundException('Phòng ban mới không tồn tại');
      emp.department = org;
    }

    // Cập nhật các trường khác
    Object.assign(emp, updateDto);
    const saved = await this.employeeRepo.save(emp);

    // Audit log — diffing chỉ lưu trường thay đổi
    await this.auditLogService.log({
      action: AuditAction.UPDATE,
      entityName: 'Employee',
      entityId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      newData: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  // 4. XÓA NHÂN VIÊN (Soft Delete + Constraint Check)
  async remove(id: string) {
    const emp = await this.employeeRepo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại');

    // Kiểm tra ràng buộc dữ liệu trước khi xóa
    const blockers = await this.checkDeleteConstraints(id);
    if (blockers.length > 0) {
      throw new BadRequestException({
        status: 'error',
        message: `Không thể xóa nhân viên ${emp.full_name} vì đang có liên kết dữ liệu`,
        data: { blockers },
      });
    }

    // Soft delete
    await this.employeeRepo.softRemove(emp);

    await this.auditLogService.log({
      action: AuditAction.DELETE,
      entityName: 'Employee',
      entityId: id,
      oldData: { employee_code: emp.employee_code, full_name: emp.full_name },
    });

    return { message: `Đã xóa nhân viên ${emp.full_name} (soft delete)` };
  }

  // 5. ĐỔI TRẠNG THÁI (Working → Suspended → Terminated)
  async changeStatus(id: string, dto: ChangeStatusDto) {
    const emp = await this.employeeRepo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại');

    const oldStatus = emp.status;
    emp.status = dto.status;
    await this.employeeRepo.save(emp);

    await this.auditLogService.log({
      action: AuditAction.STATUS_CHANGE,
      entityName: 'Employee',
      entityId: id,
      oldData: { status: oldStatus },
      newData: { status: dto.status },
      reason: dto.reason,
    });

    return {
      message: `Đã chuyển trạng thái ${emp.full_name}: ${oldStatus} → ${dto.status}`,
      employee: { id: emp.id, full_name: emp.full_name, status: emp.status },
    };
  }

  // ── CONSTRAINT CHECK: Kiểm tra liên kết trước khi xóa ──
  private async checkDeleteConstraints(employeeId: string): Promise<string[]> {
    const blockers: string[] = [];

    // 1. project_assignments — Đang được gán vào dự án?
    const assignments = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM project_assignments WHERE employee_id = $1 AND is_active = true',
      [employeeId],
    );
    if (parseInt(assignments[0].cnt) > 0) {
      blockers.push(
        `Đang được gán vào ${assignments[0].cnt} dự án (project_assignments)`,
      );
    }

    // 2. projects.manager_id — Đang là PM của dự án?
    const managedProjects = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM projects WHERE manager_id = $1 AND deleted_at IS NULL',
      [employeeId],
    );
    if (parseInt(managedProjects[0].cnt) > 0) {
      blockers.push(
        `Đang là PM của ${managedProjects[0].cnt} dự án (projects.manager_id)`,
      );
    }

    // 3. users.employee_id — Có tài khoản đăng nhập?
    const userLink = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM users WHERE employee_id = $1',
      [employeeId],
    );
    if (parseInt(userLink[0].cnt) > 0) {
      blockers.push('Đang liên kết với tài khoản đăng nhập (users)');
    }

    // 4. employees.manager_id — Có nhân viên cấp dưới?
    const subordinates = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [employeeId],
    );
    if (parseInt(subordinates[0].cnt) > 0) {
      blockers.push(
        `Có ${subordinates[0].cnt} nhân viên cấp dưới (employees.manager_id)`,
      );
    }

    return blockers;
  }

  // ══ APPROVAL CHAIN — Lấy chuỗi phê duyệt từ thấp lên cao ══

  async getApprovalChain(employeeId: string): Promise<{
    chain: {
      id: string;
      employee_code: string;
      full_name: string;
      job_title: string | null;
      position_name: string | null;
    }[];
    depth: number;
  }> {
    const chain: {
      id: string;
      employee_code: string;
      full_name: string;
      job_title: string | null;
      position_name: string | null;
    }[] = [];
    const MAX_DEPTH = 10; // Chống vòng lặp vô hạn

    let currentId = employeeId;
    const visited = new Set<string>();

    while (chain.length < MAX_DEPTH) {
      const emp = await this.employeeRepo.findOne({
        where: { id: currentId },
        relations: ['manager', 'position'],
      });

      if (!emp || !emp.manager) break;

      // Phát hiện vòng lặp
      if (visited.has(emp.manager.id)) break;
      visited.add(emp.manager.id);

      // Load position của manager
      const manager = await this.employeeRepo.findOne({
        where: { id: emp.manager.id },
        relations: ['position'],
      });

      if (!manager) break;

      chain.push({
        id: manager.id,
        employee_code: manager.employee_code,
        full_name: manager.full_name,
        job_title: manager.job_title ?? null,
        position_name: manager.position?.position_name ?? null,
      });

      currentId = manager.id;
    }

    return { chain, depth: chain.length };
  }

  // ══ EXCEL EXPORT / IMPORT / TEMPLATE ══

  async exportToExcel(): Promise<Buffer> {
    const employees = await this.employeeRepo.find({
      relations: ['department'],
      order: { created_at: 'DESC' },
    });
    const data = employees.map((e) => ({
      employee_code: e.employee_code,
      full_name: e.full_name,
      email: e.email ?? '',
      phone: e.phone ?? '',
      job_title: e.job_title ?? '',
      status: e.status,
      department_code: e.department?.organization_code ?? '',
    }));
    return this.excelService.exportToExcel({
      sheetName: 'Nhân viên',
      columns: this.EMP_COLUMNS,
      data,
      title: `Danh sách Nhân viên — Xuất ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    return this.excelService.exportTemplate({
      sheetName: 'Nhân viên',
      columns: this.EMP_COLUMNS,
      sampleRow: {
        employee_code: 'EMP-001',
        full_name: 'Nguyễn Văn A',
        email: 'a.nguyen@shgroup.vn',
        phone: '0901234567',
        job_title: 'Kỹ sư xây dựng',
        status: 'ACTIVE',
        department_code: 'ORG-DA',
      },
    });
  }

  async importFromExcel(fileBuffer: Buffer) {
    const orgs = await this.orgRepo.find({
      select: ['id', 'organization_code', 'organization_name'],
    });
    const orgMap = new Map(orgs.map((o) => [o.organization_code, o.id]));

    const result = await this.excelService.parseExcel(fileBuffer, {
      columns: this.EMP_COLUMNS,
      requiredKeys: ['employee_code', 'full_name'],
      validators: {
        department_code: {
          validate: (v) => {
            if (!v) return null;
            if (!orgMap.has(String(v)))
              return `Mã phòng ban "${v}" không tồn tại`;
            return null;
          },
        },
        status: {
          validate: (v) => {
            if (!v) return null;
            if (!['ACTIVE', 'RESIGNED', 'ON_LEAVE'].includes(String(v))) {
              return `Trạng thái "${v}" không hợp lệ. Cho phép: ACTIVE, RESIGNED, ON_LEAVE`;
            }
            return null;
          },
        },
      },
    });

    let savedCount = 0;
    const persistErrors: { row: number; field: string; message: string }[] = [];

    for (const row of result.data) {
      const code = row.employee_code as string;
      try {
        const existing = await this.employeeRepo.findOne({
          where: { employee_code: code },
        });
        const deptId = row.department_code
          ? orgMap.get(String(row.department_code))
          : undefined;

        if (existing) {
          Object.assign(existing, {
            full_name: row.full_name,
            email: row.email || existing.email,
            phone: row.phone || existing.phone,
            job_title: row.job_title || existing.job_title,
            status: row.status || existing.status,
          });
          if (deptId) {
            const org = await this.orgRepo.findOne({ where: { id: deptId } });
            if (org) existing.department = org;
          }
          await this.employeeRepo.save(existing);
        } else {
          const org = deptId
            ? await this.orgRepo.findOne({ where: { id: deptId } })
            : undefined;
          const emp = this.employeeRepo.create({
            employee_code: code,
            full_name: row.full_name as string,
            email: (row.email as string) || undefined,
            phone: (row.phone as string) || undefined,
            job_title: (row.job_title as string) || undefined,
            status: (row.status as string) || 'ACTIVE',
            ...(org ? { department: org } : {}),
          });
          await this.employeeRepo.save(emp);
        }
        savedCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        persistErrors.push({
          row: 0,
          field: 'general',
          message: `Lỗi lưu "${code}": ${message}`,
        });
      }
    }

    const allErrors = [...result.errors, ...persistErrors];
    return {
      status: 'success',
      message: `Import: ${savedCount}/${result.totalRows} nhân viên thành công`,
      data: {
        total_rows: result.totalRows,
        success_rows: savedCount,
        error_rows: allErrors.length,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
    };
  }
}
