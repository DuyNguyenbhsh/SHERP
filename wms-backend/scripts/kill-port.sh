#!/bin/bash
# Auto-Port-Check: Giải phóng cổng trước khi khởi động Backend
# Sử dụng: bash scripts/kill-port.sh [PORT]

PORT=${1:-3000}
echo "🔍 Kiểm tra cổng $PORT..."

# Windows (Git Bash / MSYS2)
if command -v taskkill &>/dev/null; then
  PIDS=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep "LISTENING" | awk '{print $NF}' | sort -u)
  if [ -n "$PIDS" ]; then
    for PID in $PIDS; do
      echo "⚡ Đang giải phóng PID $PID trên cổng $PORT..."
      taskkill //F //PID "$PID" 2>/dev/null
    done
    echo "✅ Cổng $PORT đã được giải phóng."
  else
    echo "✅ Cổng $PORT đang trống."
  fi
# Linux / macOS
elif command -v lsof &>/dev/null; then
  PID=$(lsof -ti:"$PORT" 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "⚡ Đang giải phóng PID $PID trên cổng $PORT..."
    kill -9 "$PID" 2>/dev/null
    echo "✅ Cổng $PORT đã được giải phóng."
  else
    echo "✅ Cổng $PORT đang trống."
  fi
else
  echo "⚠️ Không tìm thấy lsof hoặc netstat. Bỏ qua kiểm tra cổng."
fi
