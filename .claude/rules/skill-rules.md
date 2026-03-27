# AI SKILLS: AUTOMATED WORKFLOWS

Bạn được trang bị các kỹ năng tự động sau để hỗ trợ Duy quản lý SH-GROUP:

## 🛠 SKILL 1: ARCHITECTURAL VISUALIZER
- **Trigger:** Mỗi khi thay đổi Entity hoặc logic nghiệp vụ phức tạp.
- **Action:** Tự động tạo/cập nhật đoạn mã Mermaid.js trong thư mục `docs/diagrams/`.
- **Output:** Sequence Diagram cho luồng API và Class Diagram cho Database.

## 🛠 SKILL 2: ERP IMPACT RADAR
- **Trigger:** Khi Duy yêu cầu sửa đổi cấu trúc bảng hoặc Interface dùng chung.
- **Action:** Quét toàn bộ project, liệt kê danh sách "Affected Components". 
- **Requirement:** Phải báo cáo cho Duy: "Duy ơi, sửa cái này sẽ làm lỗi 3 trang Dashboard, Duy có chắc không?".

## 🛠 SKILL 3: ORACLE DATA GENERATOR
- **Trigger:** Khi có module mới hoặc khi Duy cần test UI.
- **Action:** Viết script `seed` tự động. Dữ liệu phải có tính nghiệp vụ (ví dụ: Revenue phải tính theo POC: $Revenue = \%Progress \times ContractValue$).

## 🛠 SKILL 4: CLEAN ARCHITECTURE ENFORCER
- **Trigger:** Khi tạo file `.ts` hoặc `.tsx` mới.
- **Action:** Tự động tạo Boilerplate đúng chuẩn: DTO -> Service -> Controller -> Module. 
- **Strict Rule:** Nếu code logic nằm sai layer (ví dụ DB query nằm ở Controller), phải tự động đề xuất refactor.

## 🛠 SKILL 5: SECURITY & PERFORMANCE SCAN
- **Trigger:** Trước khi kết thúc mỗi Task.
- **Action:** Kiểm tra SQL Injection, check thiếu `@UseGuards(JwtAuthGuard)`, và check N+1 query.

## 🛠 SKILL 6: AUTO-PORT-CHECK
- **Trigger:** Mỗi khi khởi động Backend (`npm run start:dev`).
- **Action:** Tự động kiểm tra cổng 3000. Nếu bị chiếm → tự giải phóng (kill process) trước khi NestJS khởi động.
- **Implementation:** Script `wms-backend/scripts/kill-port.sh` chạy tự động qua npm `prestart:dev` hook.
- **Cross-platform:** Hỗ trợ cả Windows (taskkill) và Linux/macOS (lsof + kill).

## 🛠 SKILL 7: PROJECT METRICS & TOKEN TRACKER
- **Trigger:** Sau khi hoàn thành một Gate (BA/SA/DEV/TEST/DEPLOY).
- **Action:** Cập nhật `docs/management/token-logs.md` với dòng mới: Ngày, Gate, Task, Input/Output tokens, ghi chú.
- **KPIs:**
  - An toàn: < 150k tokens/session
  - Cảnh báo: > 170k tokens → đề xuất `/compact`
  - Tới hạn: > 190k tokens → bắt buộc dừng + tối ưu
- **Report:** Sau mỗi task lớn, nhận xét: "Task này tiêu tốn X tokens, chủ yếu do [phần nào]. Đề xuất tối ưu: [ghi chú]".