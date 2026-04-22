import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    private dataSource: DataSource,
    private excelService: ExcelService,
  ) {}

  private readonly USER_COLUMNS: ExcelColumnDef[] = [
    { header: 'Username', key: 'username', width: 20, type: 'string' },
    { header: 'Ho ten', key: 'full_name', width: 25, type: 'string' },
    { header: 'Email', key: 'email', width: 25, type: 'string' },
    { header: 'Vai tro', key: 'role_name', width: 22, type: 'string' },
    { header: 'Phong ban', key: 'department', width: 22, type: 'string' },
    { header: 'Trang thai', key: 'status', width: 14, type: 'string' },
  ];

  // Lấy danh sách user kèm thông tin nhân viên và quyền
  async findAll() {
    try {
      return await this.userRepo.find({
        // 🚀 LẮP LẠI DÂY PHÂN QUYỀN Ở ĐÂY:
        // Kéo 'employee', kéo 'user_roles', và kéo luôn thông tin chi tiết của 'role'
        relations: ['employee', 'userRoles', 'userRoles.role'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách Tài khoản: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException('Lỗi truy xuất dữ liệu từ Database');
    }
  }

  // Tạo tài khoản mới — gắn với Employee có sẵn (Employee-Linked)
  async create(dto: CreateUserDto) {
    // 1. Check trùng username
    const exist = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (exist) throw new BadRequestException('Tên đăng nhập đã tồn tại!');

    // 2. Validate Employee tồn tại và đang WORKING
    const employee = await this.empRepo.findOne({
      where: { id: dto.employee_id },
      relations: ['department'],
    });
    if (!employee) throw new BadRequestException('Nhân viên không tồn tại!');
    if (employee.status !== 'WORKING') {
      throw new BadRequestException(
        `Nhân viên ${employee.full_name} không ở trạng thái WORKING!`,
      );
    }

    // 3. Check Employee đã có tài khoản chưa
    const existEmpUser = await this.userRepo.findOne({
      where: { employee: { id: dto.employee_id } },
      relations: ['employee'],
    });
    if (existEmpUser) {
      throw new BadRequestException(
        `Nhân viên ${employee.full_name} đã được cấp tài khoản rồi!`,
      );
    }

    // 4. Validate Role tồn tại và đang active
    const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
    if (!role) throw new BadRequestException('Vai trò không tồn tại!');
    if (!role.is_active)
      throw new BadRequestException(
        `Vai trò ${role.role_name} đang bị vô hiệu hóa!`,
      );

    // 5. Transaction: tạo User + UserRole
    return await this.dataSource.transaction(async (manager) => {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(dto.password, salt);

      const newUser = manager.create(User, {
        username: dto.username,
        password_hash,
        employee: employee,
      });
      const savedUser = await manager.save(User, newUser);

      const userRole = manager.create(UserRole, {
        user: savedUser,
        role: role,
        organization: employee.department || null,
      } as Partial<UserRole>);
      await manager.save(UserRole, userRole);

      this.logger.log(
        `Đã tạo tài khoản cho nhân viên ${employee.full_name} (role: ${role.role_name})`,
      );

      return savedUser;
    });
  }
  // Cập nhật thông tin tài khoản (Trạng thái, Mật khẩu, Quyền)
  async update(id: string, updateData: any, currentUserId?: string) {
    // 1. Tìm xem tài khoản có tồn tại không
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('Không tìm thấy tài khoản này!');

    // Self-protection: Không cho phép tự vô hiệu hóa chính mình
    if (currentUserId === id && updateData.is_active === false) {
      throw new BadRequestException(
        'Không thể vô hiệu hóa tài khoản của chính bạn!',
      );
    }

    // 2. Nếu Admin có nhập Mật khẩu mới -> Mã hóa lại
    if (updateData.password && updateData.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(updateData.password, salt);
    }

    // 3. Cập nhật Trạng thái (Hoạt động / Bị khóa)
    if (updateData.is_active !== undefined) {
      user.is_active = updateData.is_active;
    }

    // Lưu thông tin cơ bản trước
    await this.userRepo.save(user);

    // 4. Cập nhật Quyền
    if (updateData.role_id) {
      try {
        // Xóa toàn bộ quyền cũ của User này
        await this.userRepo.manager.delete('UserRole', {
          user: { id: user.id },
        });

        // Kéo thông tin User kèm Phòng ban (Organization) để gán cho đúng
        const fullUser = await this.userRepo.findOne({
          where: { id: user.id },
          relations: ['employee', 'employee.department'],
        });

        // Gắn quyền mới bằng TypeORM cho an toàn tuyệt đối
        await this.userRepo.manager.save('UserRole', {
          user: { id: user.id },
          role: { id: updateData.role_id },
          organization: fullUser?.employee?.department || null,
        });
      } catch (error) {
        this.logger.error(
          `Lỗi khi cập nhật Quyền cho user ${user.id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        // Bắt buộc ném lỗi ra ngoài để Frontend báo đỏ, không cho "Thành công ảo"
        throw new BadRequestException(
          'Không thể lưu Quyền vào Database. Vui lòng kiểm tra lại!',
        );
      }
    }

    return { message: 'Cập nhật tài khoản thành công!', id: user.id };
  }
  async remove(id: string, currentUserId?: string) {
    // Self-protection
    if (currentUserId === id) {
      throw new BadRequestException('Không thể xóa tài khoản của chính bạn!');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['employee'],
    });
    if (!user) throw new BadRequestException('Không tìm thấy tài khoản!');

    // Kiểm tra ràng buộc nhân sự (employee_id NOT NULL hoặc có liên kết)
    if (user.employee) {
      throw new BadRequestException('Không thể xóa tài khoản đã gán nhân sự');
    }

    // Kiểm tra audit_logs
    const auditCount = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM audit_logs WHERE actor_id = $1`,
      [id],
    );
    if (parseInt(auditCount[0].cnt) > 0) {
      throw new BadRequestException(
        'Vi phạm ràng buộc: Tài khoản có dữ liệu trong nhật ký hoạt động (Audit Logs). Không thể xóa.',
      );
    }

    return await this.userRepo.delete(id);
  }

  // ══ EXCEL EXPORT / IMPORT / TEMPLATE ══

  async exportToExcel(): Promise<Buffer> {
    const users = await this.userRepo.find({
      relations: [
        'employee',
        'employee.department',
        'userRoles',
        'userRoles.role',
      ],
      order: { created_at: 'DESC' },
    });
    const data = users.map((u) => ({
      username: u.username,
      full_name: u.employee?.full_name ?? '',
      email: u.employee?.email ?? '',
      role_name: u.userRoles.map((ur) => ur.role.role_name).join(', '),
      department: u.employee?.department?.organization_name ?? '',
      status: u.is_active ? 'Hoat dong' : 'Vo hieu',
    }));
    return this.excelService.exportToExcel({
      sheetName: 'Tai khoan',
      columns: this.USER_COLUMNS,
      data,
      title: `Danh sach Tai khoan — Xuat ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    return this.excelService.exportTemplate({
      sheetName: 'Tai khoan',
      columns: this.USER_COLUMNS,
      sampleRow: {
        username: 'nguyenvana',
        full_name: 'Nguyen Van A',
        email: 'a.nguyen@shgroup.vn',
        role_name: 'Quan ly kho',
        department: 'Phong IT',
        status: 'Hoat dong',
      },
    });
  }

  async importFromExcel(fileBuffer: Buffer) {
    const roles = await this.roleRepo.find({ where: { is_active: true } });
    const roleMap = new Map(roles.map((r) => [r.role_name, r.id]));

    const result = await this.excelService.parseExcel(fileBuffer, {
      columns: this.USER_COLUMNS,
      requiredKeys: ['username', 'full_name'],
      validators: {},
    });

    let savedCount = 0;
    const persistErrors: { row: number; field: string; message: string }[] = [];

    for (const row of result.data) {
      const username = row.username as string;
      try {
        const existing = await this.userRepo.findOne({ where: { username } });
        if (existing) {
          // Chỉ cập nhật role nếu có
          const roleName = row.role_name as string;
          if (roleName && roleMap.has(roleName)) {
            await this.userRepo.manager.delete('UserRole', {
              user: { id: existing.id },
            });
            await this.userRepo.manager.save('UserRole', {
              user: { id: existing.id },
              role: { id: roleMap.get(roleName) },
            });
          }
          savedCount++;
        } else {
          persistErrors.push({
            row: 0,
            field: 'username',
            message: `Tai khoan "${username}" khong ton tai. Import chi ho tro cap nhat role.`,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        persistErrors.push({
          row: 0,
          field: 'general',
          message: `Loi xu ly "${username}": ${message}`,
        });
      }
    }

    const allErrors = [...result.errors, ...persistErrors];
    return {
      status: 'success',
      message: `Import: ${savedCount}/${result.totalRows} tai khoan cap nhat thanh cong`,
      data: {
        total_rows: result.totalRows,
        success_rows: savedCount,
        error_rows: allErrors.length,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
    };
  }
}
