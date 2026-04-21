/**
 * Mã tắt tần suất để render Annual Grid + export XLSX nhanh
 * (không phải parse RRULE mỗi lần). Xem BA §10.5.
 */
export const FREQ_CODES = [
  'D', // Daily
  'W', // Weekly
  'BW', // Biweekly
  'M', // Monthly
  'Q', // Quarterly (3 tháng)
  'BiQ', // Bi-quarterly (4 tháng)
  'HY', // Half-yearly (6 tháng)
  'Y', // Yearly
  'Y_URGENT', // Yearly + allow_adhoc_trigger=true (BR-MP-10)
] as const;

export type FreqCode = (typeof FREQ_CODES)[number];
