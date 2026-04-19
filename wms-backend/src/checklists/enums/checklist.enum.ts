export enum ChecklistFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  SHIFT = 'SHIFT',
}

// Cách tính kết quả cho từng item trong template
export enum ChecklistResultType {
  PASS_FAIL = 'PASS_FAIL', // Đạt / Không đạt
  VALUE = 'VALUE', // Nhập giá trị đo (kWh, °C…)
  PHOTO_ONLY = 'PHOTO_ONLY', // Chỉ cần ảnh bằng chứng
  MIXED = 'MIXED', // PASS_FAIL + VALUE + PHOTO
}

export enum ChecklistInstanceStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ItemResultState {
  PASS = 'PASS',
  FAIL = 'FAIL',
  NA = 'NA',
}

export enum PhotoCategory {
  BEFORE_FIX = 'BEFORE_FIX',
  AFTER_FIX = 'AFTER_FIX',
  EVIDENCE = 'EVIDENCE',
}
