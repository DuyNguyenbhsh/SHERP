// Loại phiếu nhập kho
export enum InboundType {
  PO_RECEIPT = 'PO_RECEIPT', // Nhập từ PO mua hàng (luồng chính S2P)
  RETURN = 'RETURN', // Nhập hàng trả lại từ khách
  TRANSFER = 'TRANSFER', // Nhập chuyển kho nội bộ
  ADJUSTMENT = 'ADJUSTMENT', // Nhập điều chỉnh kiểm kê
}

// Trạng thái luồng Dock-to-Stock
export enum InboundStatus {
  PENDING = 'PENDING', // Chờ nhận hàng tại Dock
  INSPECTING = 'INSPECTING', // Đang kiểm tra chất lượng (QC)
  PUTAWAY = 'PUTAWAY', // Đang lên kệ (Putaway)
  COMPLETED = 'COMPLETED', // Đã nhập kho hoàn tất
  REJECTED = 'REJECTED', // Toàn bộ lô hàng bị từ chối
}

// Kết quả kiểm tra chất lượng từng dòng hàng
export enum QcStatus {
  PENDING = 'PENDING', // Chờ kiểm tra
  PASSED = 'PASSED', // Đạt chuẩn
  FAILED = 'FAILED', // Không đạt (toàn bộ)
  PARTIAL = 'PARTIAL', // Đạt một phần (accepted_qty < received_qty)
}
