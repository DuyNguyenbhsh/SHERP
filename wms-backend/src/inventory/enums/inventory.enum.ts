// Loại vị trí kho (Zone/Bin hierarchy)
export enum LocationType {
  WAREHOUSE = 'WAREHOUSE', // Kho tổng (VD: WH-HCM-01)
  ZONE = 'ZONE', // Khu vực trong kho (VD: Khu A - Linh kiện)
  AISLE = 'AISLE', // Dãy kệ (VD: Dãy 01)
  BIN = 'BIN', // Ô kệ cụ thể — đơn vị lưu trữ nhỏ nhất (VD: A-01-03-02)
  STAGING = 'STAGING', // Khu tập kết tạm (Dock nhận/xuất hàng)
  QC_AREA = 'QC_AREA', // Khu kiểm tra chất lượng
}

// Trạng thái vị trí kho
export enum LocationStatus {
  ACTIVE = 'ACTIVE', // Đang hoạt động, có thể Putaway
  FULL = 'FULL', // Đã đầy, không nhận thêm hàng
  BLOCKED = 'BLOCKED', // Bị khóa (bảo trì, kiểm kê)
  INACTIVE = 'INACTIVE', // Ngưng sử dụng
}

// Trạng thái tồn kho của 1 bản ghi InventoryItem
export enum StockStatus {
  AVAILABLE = 'AVAILABLE', // Sẵn sàng bán/xuất kho
  RESERVED = 'RESERVED', // Đã giữ cho đơn hàng (chờ Picking)
  IN_TRANSIT = 'IN_TRANSIT', // Đang vận chuyển nội bộ giữa các kho
  QUARANTINE = 'QUARANTINE', // Tạm giữ kiểm tra (QC hold / RMA)
  DAMAGED = 'DAMAGED', // Hư hỏng, chờ xử lý
}
