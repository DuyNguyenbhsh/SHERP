export enum PoStatus {
  DRAFT = 'DRAFT', // Đang nháp
  APPROVED = 'APPROVED', // Đã duyệt, chờ nhập kho
  RECEIVING = 'RECEIVING', // Đang nhập kho dở dang
  COMPLETED = 'COMPLETED', // Đã nhập đủ
  CANCELED = 'CANCELED', // Đã hủy
}

export enum SerialStatus {
  IN_STOCK = 'IN_STOCK', // Đang nằm trong kho
  SOLD = 'SOLD', // Đã bán
  RMA = 'RMA', // Đang bảo hành
  RETURNED = 'RETURNED', // Khách trả lại
}
