/**
 * String catalog for master-plan project lookup feature.
 * All Vietnamese UI copy lives here — NO hardcoded strings in JSX.
 */
export const PROJECT_LOOKUP_STRINGS = {
  // Field labels
  LABEL_PROJECT: 'Dự án',
  LABEL_PROJECT_REQUIRED: 'Dự án *',

  // Picker UI
  PLACEHOLDER: 'Chọn dự án...',
  PLACEHOLDER_SEARCH: 'Tìm theo mã hoặc tên...',
  EMPTY_NO_RESULTS: 'Không tìm thấy dự án phù hợp',
  EMPTY_TYPE_TO_SEARCH: 'Nhập để tìm kiếm dự án',
  LOADING: 'Đang tải...',
  ERROR_LOAD_FAILED: 'Không tải được danh sách dự án. Vui lòng thử lại.',

  // Status badges (project lifecycle display — covers all 11 backend enum values)
  STATUS_WON_BID: 'Đã trúng thầu',
  STATUS_ACTIVE: 'Đang thi công',
  STATUS_ON_HOLD: 'Tạm dừng',
  STATUS_SETTLING: 'Đang quyết toán',
  STATUS_WARRANTY: 'Bảo hành',
  STATUS_CLOSED: 'Đã đóng',
  STATUS_CANCELLED: 'Đã huỷ',
  // Additional enum values (chỉ hiển thị khi includeInactive=true hoặc edit mode)
  STATUS_DRAFT: 'Nháp',
  STATUS_BIDDING: 'Đang đấu thầu',
  STATUS_LOST_BID: 'Trượt thầu',
  STATUS_SETTLED: 'Đã quyết toán',
  STATUS_RETENTION_RELEASED: 'Đã giải tỏa bảo lưu',
  STATUS_CANCELED: 'Đã huỷ',

  // Toggle
  TOGGLE_INCLUDE_INACTIVE: 'Hiển thị dự án đã đóng/huỷ',

  // Organization label on each picker row (shown for every item that exposes organization_name).
  ORG_PREFIX: 'Đơn vị:',

  // Budget warning banner
  BUDGET_WARNING_TITLE: 'Ngân sách vượt mức',
  BUDGET_WARNING_BODY: (headroomVnd: string): string =>
    `Ngân sách Master Plan đang sát/vượt ngưỡng an toàn. Hạn mức còn lại: ${headroomVnd} VND.`,
  BUDGET_WARNING_ACK: 'Đã hiểu, tiếp tục',
  // Budget warning — UX revision post-4B-review
  BUDGET_WARNING_SAVED_NOTICE: 'Master Plan đã được lưu. Bạn có thể xem lại trong danh sách.',
  BUDGET_WARNING_CLOSE: 'Đóng',

  // Errors (map từ backend error codes)
  ERROR_VALIDATION: 'Từ khoá không hợp lệ',
  ERROR_NETWORK: 'Không kết nối được máy chủ',
  ERROR_UNAUTHORIZED: 'Bạn không có quyền tra cứu dự án',
  ERROR_GENERIC: 'Có lỗi xảy ra khi tra cứu dự án',
} as const

export type ProjectLookupStringKey = keyof typeof PROJECT_LOOKUP_STRINGS
