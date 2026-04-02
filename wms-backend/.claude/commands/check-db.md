Kiểm tra trạng thái đồng bộ giữa Entities và Database PostgreSQL.

Hướng dẫn:
1. Đọc file `CLAUDE.md` để lấy danh sách các Domain Modules và quy ước kiến trúc (Soft Delete, Optimistic Locking).
2. Sử dụng DATABASE_URL từ file `.env` để kiểm tra kết nối.
3. Liệt kê toàn bộ Entities trong thư mục `src/` và so sánh với các bảng hiện có trong Database.
4. Kiểm tra xem các bảng đã có đủ cột `is_active` và `@VersionColumn()` như quy định chưa.

Hành động:
- Sử dụng lệnh `psql` (thông qua Bash) để liệt kê danh sách các bảng.
- Nếu phát hiện bảng nào thiếu hoặc sai cấu trúc so với Entity, hãy liệt kê chi tiết.
- Kiểm tra log của `SeedService` để đảm bảo dữ liệu mẫu (master data) đã được nạp đủ.