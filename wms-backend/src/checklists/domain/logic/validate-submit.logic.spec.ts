import {
  ChecklistResultType,
  ItemResultState,
} from '../../enums/checklist.enum';
import { validateSubmit } from './validate-submit.logic';

describe('validateSubmit (BR-CHK-01, BR-CHK-02)', () => {
  const base = {
    result_type: ChecklistResultType.PASS_FAIL,
    require_photo: false,
    value_unit: null as string | null,
  };

  it('PASS_FAIL không chọn kết quả → FAIL validate', () => {
    const out = validateSubmit(base, {});
    expect(out.ok).toBe(false);
  });

  it('PASS_FAIL chọn PASS → OK', () => {
    const out = validateSubmit(base, { result: ItemResultState.PASS });
    expect(out.ok).toBe(true);
  });

  it('BR-CHK-01: VALUE type + PASS + không nhập value → FAIL', () => {
    const out = validateSubmit(
      { ...base, result_type: ChecklistResultType.VALUE, value_unit: 'kWh' },
      { result: ItemResultState.PASS },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain('BR-CHK-01');
  });

  it('BR-CHK-01: VALUE type + PASS + có value → OK', () => {
    const out = validateSubmit(
      { ...base, result_type: ChecklistResultType.VALUE, value_unit: 'kWh' },
      { result: ItemResultState.PASS, value: '42.5' },
    );
    expect(out.ok).toBe(true);
  });

  it('BR-CHK-02: require_photo=true + không ảnh → FAIL', () => {
    const out = validateSubmit(
      { ...base, require_photo: true },
      { result: ItemResultState.PASS },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain('BR-CHK-02');
  });

  it('BR-CHK-02: require_photo=true + có ảnh → OK', () => {
    const out = validateSubmit(
      { ...base, require_photo: true },
      { result: ItemResultState.PASS, photos: ['https://cdn/1.jpg'] },
    );
    expect(out.ok).toBe(true);
  });

  it('PHOTO_ONLY + không cần result + có ảnh → OK', () => {
    const out = validateSubmit(
      {
        ...base,
        result_type: ChecklistResultType.PHOTO_ONLY,
        require_photo: true,
      },
      { photos: ['https://cdn/1.jpg'] },
    );
    expect(out.ok).toBe(true);
  });
});
