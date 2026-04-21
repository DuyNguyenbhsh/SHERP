import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskTemplateDto } from './create-task-template.dto';
import { ExecutorParty } from '../../facility-catalog/enums/executor-party.enum';
import { WorkItemType } from '../../work-items/enums/work-item.enum';

async function check(partial: Record<string, unknown>) {
  const dto = plainToInstance(CreateTaskTemplateDto, {
    name: 'Kiểm tra PCCC',
    work_item_type: WorkItemType.CHECKLIST,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
    sla_hours: 24,
    executor_party: ExecutorParty.INTERNAL,
    ...partial,
  });
  return validate(dto);
}

describe('CreateTaskTemplateDto — supplement validators', () => {
  it('chấp nhận executor INTERNAL không cần contractor_name', async () => {
    const errors = await check({});
    expect(errors).toHaveLength(0);
  });

  it('BR-MP-09: CONTRACTOR thiếu contractor_name → lỗi', async () => {
    const errors = await check({ executor_party: ExecutorParty.CONTRACTOR });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'contractor_name')).toBe(true);
  });

  it('BR-MP-09: MIXED + contractor_name có giá trị → PASS', async () => {
    const errors = await check({
      executor_party: ExecutorParty.MIXED,
      contractor_name: 'Công ty ABC',
    });
    expect(errors).toHaveLength(0);
  });

  it('freq_code sai enum → lỗi', async () => {
    const errors = await check({ freq_code: 'WEEKLY_CUSTOM' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'freq_code')).toBe(true);
  });

  it('freq_code hợp lệ Y_URGENT → PASS', async () => {
    const errors = await check({ freq_code: 'Y_URGENT' });
    expect(errors).toHaveLength(0);
  });

  it('regulatory_refs > 10 phần tử → lỗi ArrayMaxSize', async () => {
    const errors = await check({
      regulatory_refs: Array(11).fill('QCVN X'),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('regulatory_refs 3 phần tử chuỗi hợp lệ → PASS', async () => {
    const errors = await check({
      regulatory_refs: [
        'QCVN 02:2020/BCA',
        'TT 17/2021/TT-BCA',
        'TCVN 9385:2012',
      ],
    });
    expect(errors).toHaveLength(0);
  });
});
