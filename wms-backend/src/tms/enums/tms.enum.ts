// Trạng thái luồng vận đơn (Dock-to-Door)
export enum WaybillStatus {
  DRAFT = 'DRAFT', // Nháp — đang gom đơn hàng
  READY_TO_PICK = 'READY_TO_PICK', // Chờ lấy hàng từ kho
  IN_TRANSIT = 'IN_TRANSIT', // Đang vận chuyển
  DELIVERED = 'DELIVERED', // Đã giao thành công (POD)
  CANCELED = 'CANCELED', // Đã hủy
}

// Trạng thái tiền thu hộ COD
export enum CodStatus {
  PENDING = 'PENDING', // Đang giữ — chưa nộp
  COLLECTED = 'COLLECTED', // Đã nộp về công ty
}
