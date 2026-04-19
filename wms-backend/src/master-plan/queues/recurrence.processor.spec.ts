import { Job } from 'bullmq';
import { RecurrenceProcessor } from './recurrence.processor';
import { WorkItemType } from '../../work-items/enums/work-item.enum';
import { GenerateItemJobData } from './recurrence.constants';

type Mock<T> = { [K in keyof T]: jest.Mock };

describe('RecurrenceProcessor.handleGenerate', () => {
  let tplRepo: Mock<{ findOne: jest.Mock }>;
  let workItemRepo: Mock<{ findOne: jest.Mock }>;
  let mgr: Mock<{ create: jest.Mock; save: jest.Mock; update: jest.Mock }>;
  let dataSource: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  };
  let checklists: Mock<{ createInstance: jest.Mock }>;
  let officeTasks: Mock<{ create: jest.Mock }>;
  let energy: Mock<{ listMeters: jest.Mock; createInspection: jest.Mock }>;
  let producer: { enqueueGenerate: jest.Mock };
  let processor: RecurrenceProcessor;

  const makeJob = (
    name: string,
    data: GenerateItemJobData,
  ): Job<GenerateItemJobData> =>
    ({ name, data }) as unknown as Job<GenerateItemJobData>;

  beforeEach(() => {
    workItemRepo = { findOne: jest.fn() };
    mgr = {
      create: jest.fn((_: unknown, obj: unknown) => obj),
      save: jest.fn(async (obj: unknown) => ({
        id: 'wi-new',
        ...(obj as object),
      })),
      update: jest.fn(async () => undefined),
    };
    dataSource = {
      getRepository: jest.fn(() => workItemRepo),
      transaction: jest.fn(async (cb: (m: typeof mgr) => Promise<unknown>) =>
        cb(mgr),
      ),
    };
    tplRepo = { findOne: jest.fn() };
    checklists = { createInstance: jest.fn() };
    officeTasks = { create: jest.fn() };
    energy = { listMeters: jest.fn(), createInspection: jest.fn() };
    producer = { enqueueGenerate: jest.fn() };

    processor = new RecurrenceProcessor(
      tplRepo as never,
      dataSource as never,
      checklists as never,
      officeTasks as never,
      energy as never,
      producer as never,
    );
  });

  it('idempotent: work_item đã tồn tại → skip, không tạo mới', async () => {
    workItemRepo.findOne.mockResolvedValue({ id: 'wi-existing' });

    const result = await processor.process(
      makeJob('generate-item', {
        taskTemplateId: 'tpl-1',
        scheduledAt: '2026-04-20T07:00:00.000Z',
      }),
    );

    expect(result).toEqual({
      status: 'already-exists',
      workItemId: 'wi-existing',
    });
    expect(tplRepo.findOne).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('throw khi TaskTemplate không tồn tại', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue(null);

    await expect(
      processor.process(
        makeJob('generate-item', {
          taskTemplateId: 'tpl-missing',
          scheduledAt: '2026-04-20T07:00:00.000Z',
        }),
      ),
    ).rejects.toThrow(/TaskTemplate không tồn tại/);
  });

  it('skip khi WBS node thiếu responsible_employee_id', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue({
      id: 'tpl-1',
      work_item_type: WorkItemType.CHECKLIST,
      wbs_node: {
        wbs_code: '1.1.1',
        responsible_employee_id: null,
        master_plan: { project_id: 'p1' },
      },
    });

    const result = await processor.process(
      makeJob('generate-item', {
        taskTemplateId: 'tpl-1',
        scheduledAt: '2026-04-20T07:00:00.000Z',
      }),
    );

    expect(result).toMatchObject({ status: 'skipped-no-assignee' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('skip INCIDENT — không auto-generate vì reactive', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue({
      id: 'tpl-inc',
      work_item_type: WorkItemType.INCIDENT,
      wbs_node: {
        wbs_code: '1.2.1',
        responsible_employee_id: 'user-1',
        master_plan: { project_id: 'p1' },
      },
    });

    const result = await processor.process(
      makeJob('generate-item', {
        taskTemplateId: 'tpl-inc',
        scheduledAt: '2026-04-20T07:00:00.000Z',
      }),
    );

    expect(result).toEqual({ status: 'skipped-incident-not-auto' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('CHECKLIST: throw nếu template_ref_id thiếu', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue({
      id: 'tpl-chk',
      work_item_type: WorkItemType.CHECKLIST,
      template_ref_id: null,
      sla_hours: 24,
      name: 'PCCC weekly',
      wbs_node: {
        wbs_code: '1.1.1',
        responsible_employee_id: 'user-1',
        master_plan: { project_id: 'p1' },
      },
    });

    await expect(
      processor.process(
        makeJob('generate-item', {
          taskTemplateId: 'tpl-chk',
          scheduledAt: '2026-04-20T07:00:00.000Z',
        }),
      ),
    ).rejects.toThrow(/template_ref_id/);
  });

  it('CHECKLIST happy path: tạo WorkItem + ChecklistInstance + update last_generated_date', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue({
      id: 'tpl-chk',
      work_item_type: WorkItemType.CHECKLIST,
      template_ref_id: 'chkTpl-1',
      sla_hours: 24,
      name: 'PCCC weekly',
      wbs_node: {
        wbs_code: '1.1.1',
        responsible_employee_id: 'user-1',
        master_plan: { project_id: 'p1' },
      },
    });
    checklists.createInstance.mockResolvedValue({ id: 'ci-1' });

    const result = await processor.process(
      makeJob('generate-item', {
        taskTemplateId: 'tpl-chk',
        scheduledAt: '2026-04-20T07:00:00.000Z',
      }),
    );

    expect(result).toMatchObject({
      status: 'created',
      subjectId: 'ci-1',
    });
    expect(checklists.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        template_id: 'chkTpl-1',
        assignee_id: 'user-1',
      }),
    );
    expect(mgr.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'tpl-chk' },
      { last_generated_date: '2026-04-20' },
    );
  });

  it('ENERGY: throw khi project chưa có active meter', async () => {
    workItemRepo.findOne.mockResolvedValue(null);
    tplRepo.findOne.mockResolvedValue({
      id: 'tpl-en',
      work_item_type: WorkItemType.ENERGY_INSPECTION,
      sla_hours: 48,
      name: 'Monthly meter reading',
      wbs_node: {
        wbs_code: '1.1.2',
        responsible_employee_id: 'user-1',
        master_plan: { project_id: 'p1' },
      },
    });
    energy.listMeters.mockResolvedValue([]);

    await expect(
      processor.process(
        makeJob('generate-item', {
          taskTemplateId: 'tpl-en',
          scheduledAt: '2026-04-20T07:00:00.000Z',
        }),
      ),
    ).rejects.toThrow(/chưa có active meter/);
  });

  it('unknown job name → throw', async () => {
    await expect(
      processor.process(makeJob('unknown-name', {} as GenerateItemJobData)),
    ).rejects.toThrow(/Unknown job name/);
  });
});
