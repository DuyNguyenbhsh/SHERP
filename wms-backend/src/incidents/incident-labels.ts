import {
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from './enums/incident.enum';

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  [IncidentStatus.NEW]: 'Mới báo',
  [IncidentStatus.IN_PROGRESS]: 'Đang xử lý',
  [IncidentStatus.RESOLVED]: 'Đã khắc phục',
  [IncidentStatus.COMPLETED]: 'Đã đóng',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.LOW]: 'Thấp',
  [IncidentSeverity.MEDIUM]: 'Trung bình',
  [IncidentSeverity.HIGH]: 'Cao',
  [IncidentSeverity.CRITICAL]: 'Nghiêm trọng',
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  [IncidentCategory.ELECTRICAL]: 'Điện',
  [IncidentCategory.PLUMBING]: 'Cấp/thoát nước',
  [IncidentCategory.HVAC]: 'Điều hoà/thông gió',
  [IncidentCategory.SECURITY]: 'An ninh',
  [IncidentCategory.OTHER]: 'Khác',
};
