import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import {
  IncidentApprovalStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from './enums/incident.enum';
import { PhotoCategory } from '../checklists/enums/checklist.enum';

type RepoStub = {
  find: jest.Mock;
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
};

type MgrStub = {
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
};

describe('IncidentsService', () => {
  let incRepo: RepoStub;
  let photoRepo: RepoStub;
  let commentRepo: RepoStub;
  let reopenRepo: RepoStub;
  let changeRepo: RepoStub;
  let mgr: MgrStub;
  let dataSource: { transaction: jest.Mock };
  let workItems: { syncProgress: jest.Mock };
  let notifications: {
    notifyIncidentCreated: jest.Mock;
    notifyIncidentAssigned: jest.Mock;
    notifyIncidentResolved: jest.Mock;
    notifyReopenRequested: jest.Mock;
  };
  let service: IncidentsService;

  const newRepo = (): RepoStub => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(async (obj: unknown) => obj),
    create: jest.fn((obj: unknown) => obj),
  });

  beforeEach(() => {
    incRepo = newRepo();
    photoRepo = newRepo();
    commentRepo = newRepo();
    reopenRepo = newRepo();
    changeRepo = newRepo();
    mgr = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(async (obj: unknown) => obj),
      create: jest.fn((_entity: unknown, obj: unknown) => obj),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: MgrStub) => Promise<unknown>) =>
        cb(mgr),
      ),
    };
    workItems = { syncProgress: jest.fn() };
    notifications = {
      notifyIncidentCreated: jest.fn(),
      notifyIncidentAssigned: jest.fn(),
      notifyIncidentResolved: jest.fn(),
      notifyReopenRequested: jest.fn(),
    };

    service = new IncidentsService(
      incRepo as never,
      photoRepo as never,
      commentRepo as never,
      reopenRepo as never,
      changeRepo as never,
      dataSource as never,
      workItems as never,
      notifications as never,
    );
  });

  // ── CREATE ──────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      title: 'Hỏng quạt thông gió',
      description: 'Quạt thông gió tầng hầm B2 không hoạt động',
      project_id: 'p1',
      severity: IncidentSeverity.MEDIUM,
      category: IncidentCategory.HVAC,
      photos: ['cloudinary://url1', 'cloudinary://url2'],
    };

    it('tạo incident với code IC-YYMMDD-001 cho ngày đầu + notify + save ảnh BEFORE_FIX', async () => {
      mgr.count.mockResolvedValue(0); // no existing incidents today
      const savedIncident = await service.create(dto as never, 'reporter-1');

      expect(savedIncident).toMatchObject({
        title: dto.title,
        project_id: 'p1',
        status: IncidentStatus.NEW,
        reported_by: 'reporter-1',
      });
      expect(savedIncident.incident_code).toMatch(/^IC-\d{6}-001$/);
      // save gọi ít nhất 2 lần: incident + photos array
      expect(mgr.save).toHaveBeenCalledTimes(2);
      expect(notifications.notifyIncidentCreated).toHaveBeenCalledWith(
        expect.objectContaining({ incident_code: savedIncident.incident_code }),
      );
    });

    it('sequence tăng theo số incident trong ngày cùng project', async () => {
      mgr.count.mockResolvedValue(4);
      const saved = await service.create(dto as never, 'reporter-1');
      expect(saved.incident_code).toMatch(/^IC-\d{6}-005$/);
    });
  });

  // ── ASSIGN ─────────────────────────────────────────────────
  describe('assign', () => {
    it('happy path NEW → IN_PROGRESS + notify assignee + sync WorkItem 25%', async () => {
      const inc = {
        id: 'inc-1',
        work_item_id: 'wi-1',
        status: IncidentStatus.NEW,
        incident_code: 'IC-260419-001',
        title: 'x',
      };
      incRepo.findOne.mockResolvedValue(inc);
      incRepo.save.mockImplementation(async (obj: unknown) => obj);

      const result = await service.assign('inc-1', {
        assigned_to: 'user-kt',
        sla_hours: 48,
      } as never);

      expect(result.status).toBe(IncidentStatus.IN_PROGRESS);
      expect(result.assigned_to).toBe('user-kt');
      expect(result.assigned_at).toBeInstanceOf(Date);
      expect(result.due_date).toBeInstanceOf(Date);
      expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 25, false);
      expect(notifications.notifyIncidentAssigned).toHaveBeenCalled();
    });

    it('block khi status != NEW', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.IN_PROGRESS,
      });
      await expect(
        service.assign('inc-1', { assigned_to: 'u' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('due_date explicit ưu tiên trên sla_hours', async () => {
      const inc = {
        id: 'inc-1',
        work_item_id: null,
        status: IncidentStatus.NEW,
      };
      incRepo.findOne.mockResolvedValue(inc);
      const explicitDue = '2026-05-01T00:00:00.000Z';

      const result = await service.assign('inc-1', {
        assigned_to: 'u',
        due_date: explicitDue,
        sla_hours: 1, // phải bị ignore
      } as never);

      expect(result.due_date.toISOString()).toBe(explicitDue);
    });
  });

  // ── RESOLVE ────────────────────────────────────────────────
  describe('resolve', () => {
    it('happy path IN_PROGRESS → RESOLVED + lưu AFTER_FIX photos + comment + notify + sync 75%', async () => {
      const inc = {
        id: 'inc-1',
        work_item_id: 'wi-1',
        status: IncidentStatus.IN_PROGRESS,
        incident_code: 'IC-260419-002',
        title: 't',
        project_id: 'p1',
      };
      mgr.findOne.mockResolvedValue(inc);

      const result = await service.resolve(
        'inc-1',
        {
          photos: ['after1', 'after2'],
          resolution_note: 'Đã thay quạt mới',
        } as never,
        'user-kt',
      );

      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolved_at).toBeInstanceOf(Date);
      expect(mgr.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ category: PhotoCategory.AFTER_FIX }),
      );
      expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 75, false);
      expect(notifications.notifyIncidentResolved).toHaveBeenCalled();
    });

    it('block khi status != IN_PROGRESS', async () => {
      mgr.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.NEW,
      });
      await expect(
        service.resolve('inc-1', { photos: ['x'] } as never, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('404 khi incident không tồn tại', async () => {
      mgr.findOne.mockResolvedValue(null);
      await expect(
        service.resolve('missing', { photos: ['x'] } as never, 'actor'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── CLOSE (BR-INC-05) ──────────────────────────────────────
  describe('close', () => {
    it('BR-INC-05: block khi không có ảnh AFTER_FIX', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.RESOLVED,
      });
      photoRepo.count.mockResolvedValue(0);

      await expect(service.close('inc-1')).rejects.toThrow(/BR-INC-05/);
    });

    it('happy path RESOLVED → COMPLETED + sync 100% + closed_at set', async () => {
      const inc = {
        id: 'inc-1',
        work_item_id: 'wi-1',
        status: IncidentStatus.RESOLVED,
      };
      incRepo.findOne.mockResolvedValue(inc);
      photoRepo.count.mockResolvedValue(2);

      const result = await service.close('inc-1');

      expect(result.status).toBe(IncidentStatus.COMPLETED);
      expect(result.closed_at).toBeInstanceOf(Date);
      expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 100, true);
    });

    it('block khi status != RESOLVED', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.NEW,
      });
      await expect(service.close('inc-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── REOPEN SUB-FLOW ────────────────────────────────────────
  describe('requestReopen', () => {
    it('BR-INC-03: chỉ reopen khi COMPLETED', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.RESOLVED,
      });
      await expect(
        service.requestReopen(
          'inc-1',
          { reason: 'Fan noise tái diễn' } as never,
          'requester',
        ),
      ).rejects.toThrow(/BR-INC-03/);
    });

    it('COMPLETED: tạo request + notify approver', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.COMPLETED,
      });

      const result = await service.requestReopen(
        'inc-1',
        { reason: 'Fan noise tái diễn' } as never,
        'requester-1',
      );

      expect(result).toMatchObject({
        incident_id: 'inc-1',
        requested_by: 'requester-1',
        reason: 'Fan noise tái diễn',
      });
      expect(notifications.notifyReopenRequested).toHaveBeenCalled();
    });
  });

  describe('decideReopen', () => {
    it('APPROVE: set status APPROVED + transition incident COMPLETED → NEW + sync 0%', async () => {
      const req = {
        id: 'rq-1',
        incident_id: 'inc-1',
        status: IncidentApprovalStatus.PENDING,
        decided_at: null,
      };
      const inc = {
        id: 'inc-1',
        work_item_id: 'wi-1',
        status: IncidentStatus.COMPLETED,
        resolved_at: new Date(),
        closed_at: new Date(),
      };
      mgr.findOne
        .mockResolvedValueOnce(req) // 1st: find request
        .mockResolvedValueOnce(inc); // 2nd: find incident

      const result = await service.decideReopen(
        'rq-1',
        true,
        { decision_note: 'OK mở lại' } as never,
        'approver-1',
      );

      expect(result.status).toBe(IncidentApprovalStatus.APPROVED);
      expect(result.decided_by).toBe('approver-1');
      expect(inc.status).toBe(IncidentStatus.NEW);
      expect(inc.resolved_at).toBeNull();
      expect(inc.closed_at).toBeNull();
      expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 0, false);
    });

    it('REJECT: chỉ set REJECTED, không transition incident', async () => {
      const req = {
        id: 'rq-1',
        incident_id: 'inc-1',
        status: IncidentApprovalStatus.PENDING,
      };
      mgr.findOne.mockResolvedValueOnce(req);

      const result = await service.decideReopen(
        'rq-1',
        false,
        { decision_note: 'Lý do không đủ' } as never,
        'approver-1',
      );

      expect(result.status).toBe(IncidentApprovalStatus.REJECTED);
      // incident findOne KHÔNG được gọi lần 2
      expect(mgr.findOne).toHaveBeenCalledTimes(1);
      expect(workItems.syncProgress).not.toHaveBeenCalled();
    });

    it('block khi request đã xử lý (không PENDING)', async () => {
      mgr.findOne.mockResolvedValueOnce({
        id: 'rq-1',
        status: IncidentApprovalStatus.APPROVED,
      });
      await expect(
        service.decideReopen('rq-1', true, {} as never, 'approver'),
      ).rejects.toThrow(/đã được xử lý/);
    });

    it('404 khi request không tồn tại', async () => {
      mgr.findOne.mockResolvedValueOnce(null);
      await expect(
        service.decideReopen('missing', true, {} as never, 'approver'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── ASSIGNEE CHANGE SUB-FLOW ──────────────────────────────
  describe('requestAssigneeChange', () => {
    it('block khi incident COMPLETED', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.COMPLETED,
      });
      await expect(
        service.requestAssigneeChange(
          'inc-1',
          { proposed_assignee_id: 'u2', reason: 'lý do' } as never,
          'requester',
        ),
      ).rejects.toThrow(/COMPLETED/);
    });

    it('IN_PROGRESS: tạo change request', async () => {
      incRepo.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.IN_PROGRESS,
      });

      const result = await service.requestAssigneeChange(
        'inc-1',
        { proposed_assignee_id: 'u2', reason: 'Bận ca khác' } as never,
        'requester-1',
      );

      expect(result).toMatchObject({
        incident_id: 'inc-1',
        proposed_assignee_id: 'u2',
        requested_by: 'requester-1',
      });
    });
  });

  describe('decideAssigneeChange', () => {
    it('APPROVE: set APPROVED + update incident.assigned_to', async () => {
      const req = {
        id: 'rq-1',
        incident_id: 'inc-1',
        proposed_assignee_id: 'u2',
        status: IncidentApprovalStatus.PENDING,
      };
      const inc = {
        id: 'inc-1',
        assigned_to: 'u1',
        status: IncidentStatus.IN_PROGRESS,
      };
      mgr.findOne.mockResolvedValueOnce(req).mockResolvedValueOnce(inc);

      const result = await service.decideAssigneeChange(
        'rq-1',
        true,
        {} as never,
        'approver-1',
      );

      expect(result.status).toBe(IncidentApprovalStatus.APPROVED);
      expect(inc.assigned_to).toBe('u2');
    });

    it('REJECT: không update incident', async () => {
      const req = {
        id: 'rq-1',
        incident_id: 'inc-1',
        status: IncidentApprovalStatus.PENDING,
      };
      mgr.findOne.mockResolvedValueOnce(req);

      const result = await service.decideAssigneeChange(
        'rq-1',
        false,
        { decision_note: 'No' } as never,
        'approver-1',
      );

      expect(result.status).toBe(IncidentApprovalStatus.REJECTED);
      expect(mgr.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
