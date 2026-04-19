// Pure fn áp dụng business rules BR-CHK-01, BR-CHK-02 khi user submit 1 item result.

import { ChecklistItemTemplate } from '../../entities/checklist-item-template.entity';
import {
  ChecklistResultType,
  ItemResultState,
} from '../../enums/checklist.enum';

export interface SubmitPayload {
  result?: ItemResultState;
  value?: string;
  photos?: string[];
}

export function validateSubmit(
  item: Pick<
    ChecklistItemTemplate,
    'result_type' | 'require_photo' | 'value_unit'
  >,
  payload: SubmitPayload,
): { ok: true } | { ok: false; reason: string } {
  const needsResult = item.result_type !== ChecklistResultType.PHOTO_ONLY;
  const needsValue =
    item.result_type === ChecklistResultType.VALUE ||
    item.result_type === ChecklistResultType.MIXED;

  if (needsResult && !payload.result) {
    return { ok: false, reason: 'Cần chọn kết quả (Đạt/Không đạt/NA)' };
  }

  // BR-CHK-01: nếu item cần VALUE thì khi result=PASS phải có value
  if (
    needsValue &&
    payload.result === ItemResultState.PASS &&
    (payload.value === undefined || payload.value === '')
  ) {
    return {
      ok: false,
      reason: `BR-CHK-01: Kết quả Đạt phải kèm giá trị đo (${item.value_unit ?? 'giá trị'})`,
    };
  }

  // BR-CHK-02: require_photo=true thì phải có ≥ 1 ảnh
  if (item.require_photo && (!payload.photos || payload.photos.length === 0)) {
    return {
      ok: false,
      reason: 'BR-CHK-02: Item này bắt buộc có ít nhất 1 ảnh',
    };
  }

  return { ok: true };
}
