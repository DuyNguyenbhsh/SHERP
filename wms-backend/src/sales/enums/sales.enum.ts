// ── Khách hàng ──
export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL', // Cá nhân
  CORPORATE = 'CORPORATE', // Doanh nghiệp
  WHOLESALE = 'WHOLESALE', // Khách sỉ
  RETAIL = 'RETAIL', // Khách lẻ
}

export enum CustomerPaymentTerm {
  COD = 'COD',
  NET15 = 'NET15',
  NET30 = 'NET30',
  EOM = 'EOM',
  PREPAY = 'PREPAY',
}

// ── Quote lifecycle ──
export enum QuoteStatus {
  DRAFT = 'DRAFT', // Nháp — sửa tự do
  SENT = 'SENT', // Đã gửi khách — chờ phản hồi
  ACCEPTED = 'ACCEPTED', // Khách đồng ý — có thể convert SO
  REJECTED = 'REJECTED', // Khách từ chối — final
  EXPIRED = 'EXPIRED', // Quá hạn effective_date
}

// ── Sales Order lifecycle ──
export enum SalesOrderStatus {
  CONFIRMED = 'CONFIRMED', // SO đã xác nhận — đã tạo Outbound
  FULFILLING = 'FULFILLING', // Kho đang pick/pack
  DELIVERED = 'DELIVERED', // TMS xác nhận POD — revenue recognized
  CANCELED = 'CANCELED', // Đã hủy (trước khi PICKED)
}
