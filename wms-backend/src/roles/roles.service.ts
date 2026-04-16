// src/roles/roles.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../users/entities/role.entity';
import { Privilege } from '../users/entities/privilege.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';

/** Mã role không được xóa hoặc tạm dừng */
const PROTECTED_ROLE_CODES = ['SUPER_ADMIN'];

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Privilege) private privilegeRepo: Repository<Privilege>,
    @InjectRepository(RolePrivilege)
    private rolePrivilegeRepo: Repository<RolePrivilege>,
    private excelService: ExcelService,
  ) {}

  private readonly ROLE_COLUMNS: ExcelColumnDef[] = [
    { header: 'Ma quyen', key: 'role_code', width: 22, type: 'string' },
    { header: 'Ten nhom quyen', key: 'role_name', width: 28, type: 'string' },
    { header: 'Mo ta', key: 'description', width: 35, type: 'string' },
    { header: 'Trang thai', key: 'status', width: 14, type: 'string' },
  ];

  // 1. LẤY DANH SÁCH ROLE (Nửa trái màn hình)
  async findAll() {
    // Trả về toàn bộ danh sách Quyền đang có trong DB
    return await this.roleRepo.find({ order: { role_code: 'ASC' } });
  }

  // Lấy toàn bộ privileges trong hệ thống
  async getAllPrivileges() {
    return await this.privilegeRepo.find({
      where: { is_active: true },
      order: { module: 'ASC', privilege_code: 'ASC' },
      select: ['id', 'privilege_code', 'privilege_name', 'module'],
    });
  }

  // 2. LẤY MA TRẬN QUYỀN CỦA 1 ROLE CỤ THỂ (Nửa phải màn hình)
  async getPrivilegesForRole(roleId: string) {
    const rolePrivileges = await this.rolePrivilegeRepo.find({
      where: { role: { id: roleId } },
      relations: ['privilege'], // Join bảng để lấy mã code (VD: CREATE_PO)
    });

    // Chỉ trả về mảng các mã code để Frontend dễ dàng tick vào cây Checkbox
    return rolePrivileges.map((rp) => rp.privilege.privilege_code);
  }

  // 3. LƯU CẤU HÌNH PHÂN QUYỀN (Khi bấm nút Lưu)
  async assignPrivilegesToRole(roleId: string, privilegeCodes: string[]) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Không tìm thấy chức danh này!');

    // BƯỚC 1: Xóa trắng toàn bộ quyền cũ của Role này (Reset)
    await this.rolePrivilegeRepo.delete({ role: { id: roleId } });

    // BƯỚC 2: Tìm các Object Privilege tương ứng với mảng code gửi lên
    if (privilegeCodes && privilegeCodes.length > 0) {
      // Dùng query builder hoặc IN clause để lấy list quyền mới
      const privilegesToAssign = await this.privilegeRepo
        .createQueryBuilder('privilege')
        .where('privilege.privilege_code IN (:...codes)', {
          codes: privilegeCodes,
        })
        .getMany();

      // BƯỚC 3: Tạo mới các dòng giao điểm (Mapping)
      const newRolePrivileges = privilegesToAssign.map((priv) => {
        return this.rolePrivilegeRepo.create({
          role: role,
          privilege: priv,
        });
      });

      // Lưu hàng loạt vào DB (Tối ưu performance)
      await this.rolePrivilegeRepo.save(newRolePrivileges);
    }

    return { message: 'Đã cập nhật ma trận quyền thành công!' };
  }
  // Nút tạo vai trò mới (Dành cho Admin)
  async createRole(roleData: {
    role_code: string;
    role_name: string;
    description?: string;
  }) {
    // Check trùng mã
    const exist = await this.roleRepo.findOne({
      where: { role_code: roleData.role_code },
    });
    if (exist) {
      throw new BadRequestException(
        `Mã chức danh ${roleData.role_code} đã tồn tại!`,
      );
    }
    const newRole = this.roleRepo.create(roleData);
    return await this.roleRepo.save(newRole);
  }

  // Cập nhật vai trò
  async updateRole(
    id: string,
    data: { role_name?: string; description?: string },
  ) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò!');

    if (data.role_name !== undefined) role.role_name = data.role_name;
    if (data.description !== undefined) role.description = data.description;

    return await this.roleRepo.save(role);
  }

  // Tạm dừng / Kích hoạt vai trò
  async toggleStatus(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò!');

    if (PROTECTED_ROLE_CODES.includes(role.role_code)) {
      throw new BadRequestException(
        `Không thể thay đổi trạng thái vai trò ${role.role_code}`,
      );
    }

    role.is_active = !role.is_active;
    return await this.roleRepo.save(role);
  }

  // Xóa vai trò
  async removeRole(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò!');

    if (PROTECTED_ROLE_CODES.includes(role.role_code)) {
      throw new BadRequestException(`Không thể xóa vai trò ${role.role_code}`);
    }

    // Kiểm tra còn user nào đang gán role này không
    const usageCount = await this.roleRepo.manager.count(UserRole, {
      where: { role: { id } },
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Vai trò đang được gán cho ${usageCount} tài khoản. Không thể xóa.`,
      );
    }

    // Xóa privilege mappings trước, rồi xóa role
    await this.rolePrivilegeRepo.delete({ role: { id } });
    return await this.roleRepo.delete(id);
  }

  // ══ EXCEL EXPORT / IMPORT / TEMPLATE ══

  async exportToExcel(): Promise<Buffer> {
    const roles = await this.roleRepo.find({ order: { role_code: 'ASC' } });
    const data = roles.map((r) => ({
      role_code: r.role_code,
      role_name: r.role_name,
      description: r.description ?? '',
      status: r.is_active ? 'Hoat dong' : 'Vo hieu',
    }));
    return this.excelService.exportToExcel({
      sheetName: 'Vai tro',
      columns: this.ROLE_COLUMNS,
      data,
      title: `Danh sach Vai tro — Xuat ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    return this.excelService.exportTemplate({
      sheetName: 'Vai tro',
      columns: this.ROLE_COLUMNS,
      sampleRow: {
        role_code: 'SITE_ENGINEER',
        role_name: 'Ky su cong truong',
        description: 'Giam sat thi cong tai cong truong',
        status: 'Hoat dong',
      },
    });
  }

  async importFromExcel(fileBuffer: Buffer) {
    const result = await this.excelService.parseExcel(fileBuffer, {
      columns: this.ROLE_COLUMNS,
      requiredKeys: ['role_code', 'role_name'],
      validators: {},
    });

    let savedCount = 0;
    const persistErrors: { row: number; field: string; message: string }[] = [];

    for (const row of result.data) {
      const code = row.role_code as string;
      try {
        const existing = await this.roleRepo.findOne({
          where: { role_code: code },
        });
        if (existing) {
          // Cập nhật tên + mô tả
          if (row.role_name) existing.role_name = row.role_name as string;
          if (row.description) existing.description = row.description as string;
          await this.roleRepo.save(existing);
          savedCount++;
        } else {
          // Tạo mới
          const newRole = this.roleRepo.create({
            role_code: code,
            role_name: row.role_name as string,
            description: (row.description as string) || '',
          });
          await this.roleRepo.save(newRole);
          savedCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        persistErrors.push({
          row: 0,
          field: 'general',
          message: `Loi xu ly "${code}": ${message}`,
        });
      }
    }

    const allErrors = [...result.errors, ...persistErrors];
    return {
      status: 'success',
      message: `Import: ${savedCount}/${result.totalRows} vai tro thanh cong`,
      data: {
        total_rows: result.totalRows,
        success_rows: savedCount,
        error_rows: allErrors.length,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
    };
  }
}
