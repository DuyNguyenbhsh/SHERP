/**
 * Mapping lỗi kỹ thuật → message nghiệp vụ Việt ngữ (BR-MPL-05).
 * Mọi ngoại lệ hiển thị cho end-user PHẢI đi qua bảng này,
 * không được leak stack / field name raw / UUID regex.
 */
export const ERROR_MESSAGES = {
  PROJECT_LOOKUP: {
    INVALID_QUERY: 'Tham số tìm kiếm không hợp lệ.',
    NO_PERMISSION: 'Bạn không có quyền xem danh sách dự án.',
    EMPTY: 'Không tìm thấy dự án khớp.',
    SERVER_ERROR: 'Không tải được danh sách dự án. Vui lòng thử lại.',
  },
  MASTER_PLAN_CREATE: {
    PROJECT_UUID_INVALID: 'Vui lòng chọn dự án hợp lệ từ danh sách.',
    PROJECT_NOT_FOUND: 'Dự án không còn tồn tại. Vui lòng chọn lại.',
    CONFLICT_YEAR: (year: number): string =>
      `Dự án này đã có Master Plan năm ${year}. Vui lòng chọn năm khác hoặc dự án khác.`,
    BUDGET_WARNING: (remaining: string): string =>
      `Ngân sách vượt ${remaining} VND còn lại của dự án — cần duyệt bổ sung.`,
  },
} as const;

export default ERROR_MESSAGES;
