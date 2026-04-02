// File: hooks/read_hook.js

async function main() {
  const chunks = [];
  
  // 1. Hứng toàn bộ dữ liệu (Đơn xin phép) Claude gửi qua Standard Input
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  // 2. Dịch dữ liệu thành Object JSON
  const toolArgs = JSON.parse(Buffer.concat(chunks).toString());
  
  // 3. Lấy đường dẫn file mà Claude đang định đọc hoặc tìm kiếm (Grep)
  // Claude có thể dùng biến 'file_path' (cho Read) hoặc 'path' (cho Grep)
  const readPath = toolArgs.tool_input?.file_path || toolArgs.tool_input?.path || "";
  
  // 4. KIỂM TRA: Có phải đang nhòm ngó file .env không?
  if (readPath.includes('.env')) {
    // Phản hồi thẳng vào mặt Claude (nó sẽ đọc được dòng này)
    console.error("❌ BẢO MẬT: AI không được phép đọc hoặc tìm kiếm trong file .env của hệ thống!");
    
    // Ném Exit Code 2 để BLOCK ngay lập tức
    process.exit(2);
  }

  // Nếu file an toàn (vd: file .ts, .tsx), cho phép qua cửa (Exit Code 0)
  process.exit(0);
}

// Chạy hàm
main();