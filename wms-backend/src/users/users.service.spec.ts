import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_pw'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: any;
  let empRepo: any;
  let roleRepo: any;
  let dataSource: any;

  const mockEmployee = {
    id: 'emp-uuid',
    employee_code: 'EMP001',
    full_name: 'Nguyen Van A',
    email: 'a@test.com',
    status: 'WORKING',
    department: { id: 'dept-uuid', organization_name: 'Phong IT' },
  };

  const mockRole = {
    id: 'role-uuid',
    role_code: 'ADMIN',
    role_name: 'Admin',
    is_active: true,
  };

  const dto: CreateUserDto = {
    employee_id: 'emp-uuid',
    username: 'nguyenvana',
    password: 'Test@123',
    role_id: 'role-uuid',
  };

  const txManager = {
    create: jest.fn().mockImplementation((_e, d) => d),
    save: jest.fn().mockImplementation((_e, d) => ({ id: 'new-uuid', ...d })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        { provide: getRepositoryToken(Role), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(UserRole), useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    empRepo = module.get(getRepositoryToken(Employee));
    roleRepo = module.get(getRepositoryToken(Role));
    dataSource = module.get(DataSource);

    txManager.create.mockClear();
    txManager.save.mockClear();
  });

  // ── TEST 1: Username trùng ──
  it('rejects duplicate username', async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: 'x' }); // username exists
    await expect(service.create(dto)).rejects.toThrow(
      'Tên đăng nhập đã tồn tại!',
    );
  });

  // ── TEST 2: Employee không tồn tại ──
  it('rejects non-existent employee', async () => {
    userRepo.findOne.mockResolvedValueOnce(null); // no dup username
    empRepo.findOne.mockResolvedValueOnce(null); // emp not found
    await expect(service.create(dto)).rejects.toThrow(
      'Nhân viên không tồn tại!',
    );
  });

  // ── TEST 3: Employee không WORKING ──
  it('rejects employee not WORKING', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    empRepo.findOne.mockResolvedValueOnce({
      ...mockEmployee,
      status: 'TERMINATED',
    });
    await expect(service.create(dto)).rejects.toThrow(
      'không ở trạng thái WORKING',
    );
  });

  // ── TEST 4: Employee đã có tài khoản ──
  it('rejects employee already linked', async () => {
    userRepo.findOne
      .mockResolvedValueOnce(null) // no dup username
      .mockResolvedValueOnce({ id: 'old' }); // emp already linked
    empRepo.findOne.mockResolvedValueOnce(mockEmployee);
    await expect(service.create(dto)).rejects.toThrow(
      'đã được cấp tài khoản rồi',
    );
  });

  // ── TEST 5: Role không tồn tại ──
  it('rejects non-existent role', async () => {
    userRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    empRepo.findOne.mockResolvedValueOnce(mockEmployee);
    roleRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.create(dto)).rejects.toThrow('Vai trò không tồn tại!');
  });

  // ── TEST 6: Role bị vô hiệu hóa ──
  it('rejects inactive role', async () => {
    userRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    empRepo.findOne.mockResolvedValueOnce(mockEmployee);
    roleRepo.findOne.mockResolvedValueOnce({ ...mockRole, is_active: false });
    await expect(service.create(dto)).rejects.toThrow('đang bị vô hiệu hóa');
  });

  // ── TEST 7: Happy path — tạo thành công ──
  it('creates user with transaction on happy path', async () => {
    userRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    empRepo.findOne.mockResolvedValueOnce(mockEmployee);
    roleRepo.findOne.mockResolvedValueOnce(mockRole);
    dataSource.transaction.mockImplementation(async (cb: any) => cb(txManager));

    const result = await service.create(dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(txManager.create).toHaveBeenCalledTimes(2); // User + UserRole
    expect(txManager.save).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
});
