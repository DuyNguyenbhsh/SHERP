Thực hiện kiểm tra API Login cho user: $ARGUMENTS

Hướng dẫn:
1. Sử dụng lệnh curl để gửi yêu cầu POST tới endpoint login.
2. Kiểm tra mã trạng thái HTTP (201 cho thành công, 401 cho sai thông tin).
3. Hiển thị nội dung JWT token trả về để kiểm tra các privileges.

Hành động:
bash curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ARGUMENTS\", \"password\": \"Sen198714@\"}"