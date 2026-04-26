import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Employee } from '../users/entities/employee.entity';
import { Role } from '../users/entities/role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrgType } from '../organizations/enums/org-type.enum';
import { UserRole } from '../users/entities/user-role.entity';
import { Privilege } from '../users/entities/privilege.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { Position } from '../organizations/entities/position.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Privilege) private privilegeRepo: Repository<Privilege>,
    @InjectRepository(RolePrivilege)
    private rolePrivilegeRepo: Repository<RolePrivilege>,
    @InjectRepository(Position) private positionRepo: Repository<Position>,
    @InjectRepository(SystemSetting)
    private settingRepo: Repository<SystemSetting>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('🌱 Đang kiểm tra Dữ liệu gốc & Ma trận phân quyền...');

    try {
      // === PHẦN 1: ĐỒNG BỘ PRIVILEGE (Luôn chạy, bất kể admin đã tồn tại) ===
      const privilegesData = [
        { code: 'VIEW_PO', name: 'Xem danh sách PO', module: 'PROCUREMENT' },
        { code: 'CREATE_PO', name: 'Tạo mới PO', module: 'PROCUREMENT' },
        { code: 'UPDATE_PO', name: 'Sửa PO', module: 'PROCUREMENT' },
        { code: 'APPROVE_PO', name: 'Duyệt PO', module: 'PROCUREMENT' },
        {
          code: 'EXPORT_PO',
          name: 'Export danh sách PO (Excel)',
          module: 'PROCUREMENT',
        },

        { code: 'VIEW_INVENTORY', name: 'Xem tồn kho', module: 'WMS' },
        { code: 'RECEIVE_INBOUND', name: 'Nhập kho', module: 'WMS' },
        { code: 'SHIP_OUTBOUND', name: 'Xuất kho', module: 'WMS' },
        {
          code: 'EXPORT_INVENTORY',
          name: 'Export Báo cáo Tồn (Excel)',
          module: 'WMS',
        },

        {
          code: 'MANAGE_PRODUCT',
          name: 'Quản lý Hàng hóa',
          module: 'MASTER_DATA',
        },
        {
          code: 'MANAGE_SUPPLIER',
          name: 'Quản lý Nhà cung cấp',
          module: 'MASTER_DATA',
        },
        {
          code: 'MANAGE_MASTER_DATA',
          name: 'Quản lý Dữ liệu danh mục',
          module: 'MASTER_DATA',
        },
        {
          code: 'IMPORT_MASTER_DATA',
          name: 'Import dữ liệu (Excel)',
          module: 'MASTER_DATA',
        },
        {
          code: 'EXPORT_MASTER_DATA',
          name: 'Export dữ liệu (Excel)',
          module: 'MASTER_DATA',
        },

        {
          code: 'MANAGE_USER',
          name: 'Quản lý Tài khoản người dùng',
          module: 'ADMIN',
        },
        {
          code: 'MANAGE_ROLE',
          name: 'Quản lý Vai trò & Phân quyền',
          module: 'ADMIN',
        },
        {
          code: 'MANAGE_ORGANIZATION',
          name: 'Quản lý Sơ đồ tổ chức',
          module: 'ADMIN',
        },
        { code: 'MANAGE_EMPLOYEE', name: 'Quản lý Nhân sự', module: 'HCM' },
        {
          code: 'MANAGE_INBOUND',
          name: 'Quản lý Nhập kho (Dock-to-Stock)',
          module: 'WMS',
        },
        {
          code: 'MANAGE_INVENTORY',
          name: 'Quản lý Tồn kho & Vị trí kệ',
          module: 'WMS',
        },
        {
          code: 'MANAGE_OUTBOUND',
          name: 'Quản lý Xuất kho (Order-to-Fulfillment)',
          module: 'WMS',
        },

        {
          code: 'MANAGE_TMS',
          name: 'Quản lý Vận đơn & Giao vận',
          module: 'TMS',
        },
        { code: 'MANAGE_VEHICLE', name: 'Quản lý Đội xe', module: 'TMS' },

        // System & HRM — VIEW privileges cho frontend sidebar
        {
          code: 'VIEW_USERS',
          name: 'Xem danh sách tài khoản',
          module: 'ADMIN',
        },
        { code: 'VIEW_ROLES', name: 'Xem danh sách vai trò', module: 'ADMIN' },
        {
          code: 'VIEW_EMPLOYEES',
          name: 'Xem danh sách nhân viên',
          module: 'HCM',
        },

        // Project module (Upcoming)
        {
          code: 'VIEW_PROJECTS',
          name: 'Xem danh sách dự án',
          module: 'PROJECT',
        },
        { code: 'MANAGE_PROJECTS', name: 'Quản lý Dự án', module: 'PROJECT' },
        {
          code: 'VIEW_ALL_PROJECTS',
          name: 'Xem toàn bộ dự án (bỏ qua filter tổ chức)',
          module: 'PROJECT',
        },

        // Approval workflow
        {
          code: 'MANAGE_APPROVALS',
          name: 'Quản lý Cấu hình phê duyệt',
          module: 'ADMIN',
        },
        {
          code: 'APPROVE_REQUESTS',
          name: 'Phê duyệt / Từ chối yêu cầu',
          module: 'ADMIN',
        },
        {
          code: 'MANAGE_WORKFLOW',
          name: 'Quản lý Quy trình phê duyệt',
          module: 'ADMIN',
        },

        // Document Control v2.1
        {
          code: 'VIEW_AUDIT',
          name: 'Xem nhật ký kiểm toán tài liệu',
          module: 'DOCUMENT',
        },
      ];

      const savedPrivileges: Privilege[] = [];
      let newPrivCount = 0;
      for (const item of privilegesData) {
        let priv = await this.privilegeRepo.findOne({
          where: { privilege_code: item.code },
        });
        if (!priv) {
          priv = await this.privilegeRepo.save({
            privilege_code: item.code,
            privilege_name: item.name,
            module: item.module,
          });
          newPrivCount++;
        }
        savedPrivileges.push(priv);
      }

      if (newPrivCount > 0) {
        this.logger.log(`✅ Đã thêm ${newPrivCount} quyền mới vào hệ thống.`);
      }

      // === PHẦN 2: GÁN QUYỀN MỚI CHO ROLE SUPER_ADMIN (nếu role đã tồn tại) ===
      const roleAdmin = await this.roleRepo.findOne({
        where: { role_code: 'SUPER_ADMIN' },
      });
      if (roleAdmin) {
        // Lấy danh sách privilege_id đã gán cho SUPER_ADMIN
        const existingMappings = await this.rolePrivilegeRepo.find({
          where: { role: { id: roleAdmin.id } },
          relations: ['privilege'],
        });
        const assignedPrivIds = new Set(
          existingMappings.map((rp) => rp.privilege.id),
        );

        // Chỉ gán những privilege chưa có
        const missingPrivs = savedPrivileges.filter(
          (p) => !assignedPrivIds.has(p.id),
        );
        if (missingPrivs.length > 0) {
          const newMappings = missingPrivs.map((priv) =>
            this.rolePrivilegeRepo.create({ role: roleAdmin, privilege: priv }),
          );
          await this.rolePrivilegeRepo.save(newMappings);
          this.logger.log(
            `✅ Đã gán thêm ${missingPrivs.length} quyền mới cho SUPER_ADMIN.`,
          );
        }
      }

      // === PHẦN 3: TẠO DỮ LIỆU MẪU (Chỉ chạy lần đầu khi chưa có admin) ===
      // === PHẦN 3: SEED SƠ ĐỒ TỔ CHỨC (Idempotent — luôn chạy) ===
      await this.seedOrganizationTree();

      // === PHẦN 3B: SEED POSITIONS (Idempotent) ===
      await this.seedPositions();

      // === PHẦN 3C: SEED SYSTEM SETTINGS (Idempotent) ===
      await this.seedSystemSettings();

      // === PHẦN 4: TẠO ADMIN USER (Chỉ chạy lần đầu khi chưa có admin) ===
      const adminExist = await this.userRepo.findOne({
        where: { username: 'admin' },
      });
      if (adminExist) {
        this.logger.log('✅ Hoàn tất đồng bộ. Tài khoản Admin đã tồn tại.');
        return;
      }

      const shGroup = await this.orgRepo.findOne({
        where: { organization_code: 'SH-GROUP' },
      });

      // Tạo Role Admin
      let newRoleAdmin = roleAdmin;
      if (!newRoleAdmin) {
        newRoleAdmin = await this.roleRepo.save({
          role_code: 'SUPER_ADMIN',
          role_name: 'Quản trị viên cấp cao',
          description: 'Toàn quyền hệ thống',
        });
        for (const priv of savedPrivileges) {
          await this.rolePrivilegeRepo.save({
            role: newRoleAdmin,
            privilege: priv,
          });
        }
      }

      // Tạo Nhân viên Admin
      let employee = await this.employeeRepo.findOne({
        where: { employee_code: 'EMP-001' },
      });
      if (!employee) {
        employee = await this.employeeRepo.save({
          employee_code: 'EMP-001',
          full_name: 'Nguyễn Trí Duy',
          email: 'duy.nguyen@shvisionary.com',
          department: shGroup ?? undefined,
        });
      }

      // Tạo User Admin
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('admin123', salt);
      const user = await this.userRepo.save({
        username: 'admin',
        password_hash,
        employee: employee,
      });

      // Gán User vào Role
      const newUserRole = this.userRoleRepo.create({
        user: user,
        role: newRoleAdmin,
        organization: shGroup ?? undefined,
      });
      await this.userRoleRepo.save(newUserRole);

      this.logger.log(
        '🔥 Hoàn tất! Hệ thống đã được khởi tạo đầy đủ dữ liệu mẫu & phân quyền.',
      );
    } catch (error: unknown) {
      const isDuplicate =
        error instanceof Object &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505';
      if (isDuplicate) {
        this.logger.warn(
          '🌱 Phát hiện dữ liệu mẫu đã tồn tại (Duplicate Key). Tự động bỏ qua.',
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('❌ Lỗi không xác định khi chạy Seed:', message);
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // MASTER SEED — Sơ đồ tổ chức thực tế SH Group
  // Chạy MỘT LẦN: kiểm tra sentinel code 'SC-VP'. Nếu chưa có → wipe & reseed.
  // ══════════════════════════════════════════════════════
  private async seedOrganizationTree() {
    const sentinel = await this.orgRepo.findOne({
      where: { organization_code: 'SC-VP' },
    });
    if (sentinel) {
      this.logger.log('🏢 Master Seed đã chạy trước đó. Bỏ qua.');
      return;
    }

    this.logger.log(
      '🔄 Bắt đầu Master Seed — Xây dựng sơ đồ tổ chức SH Group...',
    );
    const mgr = this.orgRepo.manager;

    // ── PHASE 1: Wipe — Giải phóng FK rồi xóa sạch ──
    await mgr.query('UPDATE user_roles SET organization_id = NULL');
    await mgr.query('UPDATE users SET employee_id = NULL');
    await mgr.query('DELETE FROM employees');
    await mgr.query('UPDATE organizations SET parent_id = NULL');
    await mgr.query('DELETE FROM organizations');
    this.logger.log('🗑️  Đã xóa toàn bộ tổ chức & nhân viên cũ.');

    // ── PHASE 2: Xây cây tổ chức mới ──
    const C = OrgType.CORPORATE_DEPT;
    const R = OrgType.RETAIL_STORE;

    const mk = (
      code: string,
      name: string,
      desc: string,
      type: OrgType,
      parent?: Organization,
    ): Promise<Organization> => {
      const org = this.orgRepo.create({
        organization_code: code,
        organization_name: name,
        description: desc,
        org_type: type,
      });
      if (parent) org.parent = parent;
      return this.orgRepo.save(org);
    };

    // Level 1 — Tập đoàn
    const shGroup = await mk(
      'SH-GROUP',
      'Tập đoàn SH',
      'Trụ sở chính Tập đoàn SH',
      C,
    );

    // Level 2 — Công ty con
    const sc = await mk(
      'SC',
      'Star Computer',
      'Công ty TNHH Star Computer',
      C,
      shGroup,
    );
    const sg = await mk(
      'SG',
      'Star Gaming',
      'Công ty TNHH Star Gaming',
      C,
      shGroup,
    );
    const impc = await mk(
      'IMPC',
      'IMPC',
      'Công ty CP IMPC Trading',
      C,
      shGroup,
    );

    // ── Star Computer — Khối Văn phòng ──
    const scVp = await mk(
      'SC-VP',
      'Khối Văn phòng (SC)',
      'Khối văn phòng Star Computer',
      C,
      sc,
    );
    const scFin = await mk(
      'SC-FIN',
      'Kế toán & Tài chính',
      'Phòng Kế toán & Tài chính SC',
      C,
      scVp,
    );
    const scHr = await mk('SC-HR', 'Nhân sự (HR)', 'Phòng Nhân sự SC', C, scVp);
    const scProc = await mk(
      'SC-PROC',
      'Thu mua (Procurement)',
      'Phòng Thu mua SC',
      C,
      scVp,
    );

    // ── Star Computer — Khối Cửa hàng ──
    const scRetail = await mk(
      'SC-RETAIL',
      'Khối Cửa hàng (SC Retail)',
      'Hệ thống cửa hàng Star Computer',
      R,
      sc,
    );
    const scCmt8 = await mk(
      'SC-CMT8',
      'Showroom CMT8',
      'Showroom CMT8 — 234 CMT8, Q3',
      R,
      scRetail,
    );
    const scQ7 = await mk(
      'SC-Q7',
      'Showroom Quận 7',
      'Showroom Q7 — Phú Mỹ Hưng',
      R,
      scRetail,
    );
    const scEcom = await mk(
      'SC-ECOM',
      'Showroom Online (E-commerce)',
      'Kênh bán hàng trực tuyến',
      R,
      scRetail,
    );

    // ── Star Gaming ──
    const sgTech = await mk(
      'SG-TECH',
      'Kỹ thuật & Bảo trì Net',
      'Đội kỹ thuật Star Gaming',
      C,
      sg,
    );
    const sgQ10 = await mk(
      'SG-Q10',
      'Star Gaming Center Q10',
      'Trung tâm Gaming Q10 — 123 3/2, Q10',
      R,
      sg,
    );

    // ── IMPC — Central Departments ──
    const D = OrgType.DIVISION;
    const S = OrgType.PROJECT_SITE;

    // Cập nhật IMPC thành DIVISION
    impc.org_type = D;
    impc.description = 'IMPC — Xây dựng & Phát triển';
    await this.orgRepo.save(impc);

    const impcPmo = await mk(
      'IMPC-PMO',
      'Phòng PMO',
      'Phòng Quản lý Dự án IMPC',
      C,
      impc,
    );
    await mk('IMPC-FIN', 'Phòng Tài chính', 'Phòng Tài chính IMPC', C, impc);
    await mk('IMPC-HR', 'Phòng Nhân sự', 'Phòng Nhân sự IMPC', C, impc);
    await mk('IMPC-PROC', 'Phòng Mua hàng', 'Phòng Mua hàng IMPC', C, impc);
    await mk('IMPC-CC', 'Bộ phận C&C', 'Bộ phận Cost & Contract IMPC', C, impc);
    const impcProd = await mk(
      'IMPC-PROD',
      'Phát triển Sản phẩm',
      'Phòng Phát triển SP IMPC',
      C,
      impc,
    );

    // ── IMPC — Project Sites ──
    await mk(
      'SITE-VCQ7',
      'CT Vincom Quận 7',
      'Công trình Vincom Quận 7',
      S,
      impc,
    );
    await mk(
      'SITE-TDC',
      'CT Thủ Đức Central',
      'Công trình Thủ Đức Central Park',
      S,
      impc,
    );
    await mk(
      'SITE-SGA',
      'CT SaiGon Airport',
      'Công trình SaiGon Airport Plaza',
      S,
      impc,
    );

    this.logger.log(
      '🏢 Đã tạo 26 đơn vị tổ chức (4 cấp, 3 công ty con, 6 phòng IMPC, 3 công trình).',
    );

    // ── PHASE 3: Nhân viên mẫu ──
    const mkEmp = (
      code: string,
      name: string,
      email: string,
      phone: string,
      dept: Organization,
    ): Promise<Employee> => {
      return this.employeeRepo.save(
        this.employeeRepo.create({
          employee_code: code,
          full_name: name,
          email,
          phone,
          department: dept,
        }),
      );
    };

    // CTO — Root level
    const emp001 = await mkEmp(
      'EMP-001',
      'Nguyễn Trí Duy',
      'duy.nguyen@shvisionary.com',
      '0901000001',
      shGroup,
    );

    // Star Computer — Văn phòng
    await mkEmp(
      'EMP-002',
      'Trần Văn Cường',
      'cuong.tran@shvisionary.com',
      '0901000002',
      scFin,
    );
    await mkEmp(
      'EMP-003',
      'Lê Thị Mai',
      'mai.le@shvisionary.com',
      '0901000003',
      scFin,
    );
    await mkEmp(
      'EMP-004',
      'Phạm Minh Tuấn',
      'tuan.pham@shvisionary.com',
      '0901000004',
      scHr,
    );
    await mkEmp(
      'EMP-005',
      'Võ Hoàng Nam',
      'nam.vo@shvisionary.com',
      '0901000005',
      scProc,
    );

    // Star Computer — Cửa hàng
    await mkEmp(
      'EMP-006',
      'Nguyễn Thị Lan',
      'lan.nguyen@shvisionary.com',
      '0901000006',
      scCmt8,
    );
    await mkEmp(
      'EMP-007',
      'Đặng Quốc Bảo',
      'bao.dang@shvisionary.com',
      '0901000007',
      scQ7,
    );
    await mkEmp(
      'EMP-008',
      'Huỳnh Minh Châu',
      'chau.huynh@shvisionary.com',
      '0901000008',
      scEcom,
    );

    // Star Gaming
    await mkEmp(
      'EMP-009',
      'Bùi Thanh Hà',
      'ha.bui@shvisionary.com',
      '0901000009',
      sgTech,
    );
    await mkEmp(
      'EMP-010',
      'Trương Văn Đức',
      'duc.truong@shvisionary.com',
      '0901000010',
      sgQ10,
    );

    // IMPC
    await mkEmp(
      'EMP-011',
      'Lý Hoàng Sơn',
      'son.ly@shvisionary.com',
      '0901000011',
      impcPmo,
    );
    await mkEmp(
      'EMP-012',
      'Phan Thị Ngọc',
      'ngoc.phan@shvisionary.com',
      '0901000012',
      impcProd,
    );

    this.logger.log('👥 Đã tạo 12 nhân viên và map vào đơn vị tương ứng.');

    // ── PHASE 4: Re-link Admin user → EMP-001 + SH-GROUP ──
    const adminUser = await this.userRepo.findOne({
      where: { username: 'admin' },
    });
    if (adminUser) {
      adminUser.employee = emp001;
      await this.userRepo.save(adminUser);

      const adminUserRole = await this.userRoleRepo.findOne({
        where: { user: { id: adminUser.id } },
      });
      if (adminUserRole) {
        adminUserRole.organization = shGroup;
        await this.userRoleRepo.save(adminUserRole);
      }
      this.logger.log(
        '🔗 Đã re-link Admin → EMP-001 (Nguyễn Trí Duy) @ Tập đoàn SH.',
      );
    }

    this.logger.log('✅ Master Seed hoàn tất — 26 đơn vị, 12 nhân viên.');
  }

  // ══════════════════════════════════════════════════════
  // SEED POSITIONS — 13 chức danh (6 Site + 7 Central)
  // Idempotent: kiểm tra code trước khi tạo
  // ══════════════════════════════════════════════════════
  private async seedPositions() {
    const positionsData = [
      // Site Positions — Luồng NTP
      {
        code: 'SITE_SUPERVISOR',
        name: 'Giám sát Hiện trường (GSHT)',
        scope: 'SITE' as const,
        deptType: 'CONSTRUCTION',
        sort: 1,
      },
      {
        code: 'SITE_QS',
        name: 'QS Công trình',
        scope: 'SITE' as const,
        deptType: 'CONSTRUCTION',
        sort: 2,
      },
      {
        code: 'SITE_DIRECTOR',
        name: 'Chỉ huy trưởng (CHT)',
        scope: 'SITE' as const,
        deptType: 'CONSTRUCTION',
        sort: 3,
      },
      {
        code: 'SITE_ACCOUNTANT',
        name: 'Kế toán Công trình',
        scope: 'SITE' as const,
        deptType: 'FINANCE',
        sort: 4,
      },
      {
        code: 'SITE_ENGINEER',
        name: 'Kỹ sư Công trình',
        scope: 'SITE' as const,
        deptType: 'CONSTRUCTION',
        sort: 5,
      },
      {
        code: 'SITE_SAFETY',
        name: 'An toàn Lao động',
        scope: 'SITE' as const,
        deptType: 'CONSTRUCTION',
        sort: 6,
      },

      // Central Positions — Luồng NTP + Portfolio
      {
        code: 'PROJECT_DIRECTOR',
        name: 'Giám đốc Dự án (GĐDA)',
        scope: 'CENTRAL' as const,
        deptType: 'PMO',
        sort: 1,
      },
      {
        code: 'CC_SPECIALIST',
        name: 'Chuyên viên C&C',
        scope: 'CENTRAL' as const,
        deptType: 'PMO',
        sort: 2,
      },
      {
        code: 'CC_MANAGER',
        name: 'Trưởng phòng C&C',
        scope: 'CENTRAL' as const,
        deptType: 'PMO',
        sort: 3,
      },
      {
        code: 'PMO_MANAGER',
        name: 'Trưởng phòng PMO',
        scope: 'CENTRAL' as const,
        deptType: 'PMO',
        sort: 4,
      },
      {
        code: 'CHIEF_ACCOUNTANT',
        name: 'Kế toán trưởng (KTT)',
        scope: 'CENTRAL' as const,
        deptType: 'FINANCE',
        sort: 5,
      },
      {
        code: 'HR_MANAGER',
        name: 'Trưởng phòng Nhân sự',
        scope: 'CENTRAL' as const,
        deptType: 'HR',
        sort: 6,
      },
      {
        code: 'PROCUREMENT_MGR',
        name: 'Trưởng phòng Mua hàng',
        scope: 'CENTRAL' as const,
        deptType: 'PROCUREMENT',
        sort: 7,
      },
    ];

    let newCount = 0;
    for (const p of positionsData) {
      const exists = await this.positionRepo.findOne({
        where: { position_code: p.code },
      });
      if (!exists) {
        await this.positionRepo.save({
          position_code: p.code,
          position_name: p.name,
          scope: p.scope,
          department_type: p.deptType,
          sort_order: p.sort,
        });
        newCount++;
      }
    }

    if (newCount > 0) {
      this.logger.log(
        `📋 Đã tạo ${newCount} chức danh mới (${positionsData.length} tổng).`,
      );
    } else {
      this.logger.log('📋 Positions đã tồn tại. Bỏ qua.');
    }
  }

  // ══════════════════════════════════════════════════════
  // SEED SYSTEM SETTINGS — Tham số cấu hình mặc định
  // Idempotent: kiểm tra key trước khi tạo
  // ══════════════════════════════════════════════════════
  private async seedSystemSettings() {
    const defaults = [
      {
        setting_key: 'COMPANY_NAME',
        setting_value: 'SH Group',
        value_type: 'STRING',
        category: 'GENERAL',
        description: 'Tên công ty hiển thị trên hệ thống',
      },
      {
        setting_key: 'COMPANY_SHORT_NAME',
        setting_value: 'SH',
        value_type: 'STRING',
        category: 'GENERAL',
        description: 'Tên viết tắt',
      },
      {
        setting_key: 'COMPANY_PHONE',
        setting_value: '028-1234-5678',
        value_type: 'STRING',
        category: 'GENERAL',
        description: 'Hotline công ty',
      },
      {
        setting_key: 'IT_HOTLINE',
        setting_value: '1900-XXXX',
        value_type: 'STRING',
        category: 'SYSTEM',
        description: 'Hotline IT hỗ trợ kỹ thuật',
      },
      {
        setting_key: 'DEFAULT_CURRENCY',
        setting_value: 'VND',
        value_type: 'STRING',
        category: 'FINANCE',
        description: 'Đơn vị tiền tệ mặc định',
      },
      {
        setting_key: 'USD_EXCHANGE_RATE',
        setting_value: '25400',
        value_type: 'NUMBER',
        category: 'FINANCE',
        description: 'Tỷ giá USD/VND',
      },
      {
        setting_key: 'FISCAL_YEAR_START',
        setting_value: '01-01',
        value_type: 'STRING',
        category: 'FINANCE',
        description: 'Ngày bắt đầu năm tài chính (MM-DD)',
      },
      {
        setting_key: 'MAX_LOGIN_ATTEMPTS',
        setting_value: '5',
        value_type: 'NUMBER',
        category: 'SYSTEM',
        description: 'Số lần đăng nhập sai tối đa',
      },
      {
        setting_key: 'PASSWORD_EXPIRY_DAYS',
        setting_value: '90',
        value_type: 'NUMBER',
        category: 'SYSTEM',
        description: 'Số ngày hết hạn mật khẩu',
      },
    ];

    let newCount = 0;
    for (const s of defaults) {
      const exists = await this.settingRepo.findOne({
        where: { setting_key: s.setting_key },
      });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(s));
        newCount++;
      }
    }

    if (newCount > 0) {
      this.logger.log(`⚙️ Đã tạo ${newCount} cài đặt hệ thống mặc định.`);
    } else {
      this.logger.log('⚙️ System Settings đã tồn tại. Bỏ qua.');
    }
  }
}
