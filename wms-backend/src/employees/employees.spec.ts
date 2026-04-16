import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EmployeesService } from './employees.service';
import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ExcelService } from '../shared/excel';
import { AuditLogService } from '../common/audit/audit-log.service';

// ── Mocks ──
const mockEmployeeRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  softRemove: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};
const mockOrgRepo = { findOne: jest.fn() };
const mockExcelService = {};
const mockDataSource = { query: jest.fn() };
const mockAuditLogService = { log: jest.fn() };

const EMP_ADMIN = {
  id: 'emp-001',
  employee_code: 'EMP-001',
  full_name: 'Nguyễn Trí Duy',
  status: 'WORKING',
};

const EMP_DRAFT = {
  id: 'emp-draft',
  employee_code: 'EMP-DRAFT',
  full_name: 'Nhân viên Nháp',
  status: 'WORKING',
};

describe('EmployeesService — Delete & Status', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        { provide: ExcelService, useValue: mockExcelService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    jest.clearAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 1: Xóa EMP-001 (Admin Duy) → Phải chặn
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 1: Xóa nhân viên có liên kết → CHẶN', () => {
    it('EMP-001 có user link + project → 400 với danh sách blockers', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ ...EMP_ADMIN });

      // Mock constraint checks: có user link + có project assignments
      mockDataSource.query
        .mockResolvedValueOnce([{ cnt: '2' }]) // project_assignments: 2 dự án
        .mockResolvedValueOnce([{ cnt: '1' }]) // projects.manager_id: 1 dự án
        .mockResolvedValueOnce([{ cnt: '1' }]) // users: có tài khoản
        .mockResolvedValueOnce([{ cnt: '0' }]); // subordinates: 0

      try {
        await service.remove('emp-001');
        fail('Should have thrown BadRequestException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = e.getResponse();
        expect(response.data.blockers.length).toBeGreaterThanOrEqual(2);
        expect(
          response.data.blockers.some((b: string) => b.includes('dự án')),
        ).toBe(true);
        expect(
          response.data.blockers.some((b: string) => b.includes('tài khoản')),
        ).toBe(true);
      }

      // Verify: KHÔNG gọi softRemove
      expect(mockEmployeeRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 2: Xóa nhân viên nháp không liên kết → OK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 2: Xóa nhân viên nháp → Soft Delete thành công', () => {
    it('không có liên kết → softRemove OK', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ ...EMP_DRAFT });

      // Tất cả constraint = 0
      mockDataSource.query
        .mockResolvedValueOnce([{ cnt: '0' }]) // project_assignments
        .mockResolvedValueOnce([{ cnt: '0' }]) // projects.manager_id
        .mockResolvedValueOnce([{ cnt: '0' }]) // users
        .mockResolvedValueOnce([{ cnt: '0' }]); // subordinates

      mockEmployeeRepo.softRemove.mockResolvedValue({
        ...EMP_DRAFT,
        deleted_at: new Date(),
      });

      const result = await service.remove('emp-draft');

      expect(result.message).toContain('Nhân viên Nháp');
      expect(result.message).toContain('soft delete');
      expect(mockEmployeeRepo.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'emp-draft' }),
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 3: Đổi trạng thái → WORKING → SUSPENDED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 3: Đổi trạng thái', () => {
    it('WORKING → SUSPENDED', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        ...EMP_ADMIN,
        status: 'WORKING',
      });
      mockEmployeeRepo.save.mockResolvedValue({
        ...EMP_ADMIN,
        status: 'SUSPENDED',
      });

      const result = await service.changeStatus('emp-001', {
        status: 'SUSPENDED',
      });

      expect(result.message).toContain('WORKING → SUSPENDED');
      expect(result.employee.status).toBe('SUSPENDED');
    });

    it('nhân viên không tồn tại → 404', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeStatus('ghost', { status: 'SUSPENDED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
