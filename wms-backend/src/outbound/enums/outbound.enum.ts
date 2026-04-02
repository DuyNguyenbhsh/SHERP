// Trạng thái luồng Order-to-Fulfillment
export enum OutboundStatus {
  PENDING = 'PENDING', // Chờ phân bổ (Wave Planning)
  ALLOCATED = 'ALLOCATED', // Đã phân bổ tồn kho (Reserved)
  PICKING = 'PICKING', // Đang lấy hàng (Picker đang gom)
  PICKED = 'PICKED', // Đã lấy xong, chờ đóng gói
  PACKING = 'PACKING', // Đang đóng gói (Packing Station)
  PACKED = 'PACKED', // Đã đóng gói, chờ xuất kho
  SHIPPED = 'SHIPPED', // Đã xuất kho / bàn giao TMS
  DELIVERED = 'DELIVERED', // Đã giao hàng thành công (TMS xác nhận POD)
  CANCELED = 'CANCELED', // Đã hủy
}

// Trạng thái lấy hàng từng dòng
export enum PickStatus {
  PENDING = 'PENDING', // Chờ lấy
  PARTIAL = 'PARTIAL', // Lấy một phần (thiếu hàng tại vị trí)
  PICKED = 'PICKED', // Đã lấy đủ
  SHORT = 'SHORT', // Thiếu hàng hoàn toàn (hết tồn kho)
}

// Loại phiếu xuất kho
export enum OutboundType {
  SALES_ORDER = 'SALES_ORDER', // Xuất bán hàng (luồng chính O2C)
  TRANSFER = 'TRANSFER', // Xuất chuyển kho nội bộ
  PRODUCTION = 'PRODUCTION', // Xuất NVL cho sản xuất (MES)
  RETURN_VENDOR = 'RETURN_VENDOR', // Trả hàng nhà cung cấp
  SAMPLE = 'SAMPLE', // Xuất hàng mẫu / Demo
}
