#!/bin/bash
# Skill 6: Auto-Port-Check — Chờ Backend sẵn sàng trước khi mở browser
# Sử dụng: bash scripts/wait-for-backend.sh [PORT] [TIMEOUT_SECONDS]

PORT=${1:-3000}
TIMEOUT=${2:-30}
ELAPSED=0

echo "⏳ Đang chờ Backend (port $PORT) khởi động..."

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Kiểm tra bằng curl health-check
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/auth/login" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null)

  if [ "$RESPONSE" != "000" ] && [ "$RESPONSE" != "" ]; then
    echo "✅ Backend đã sẵn sàng trên cổng $PORT (HTTP $RESPONSE sau ${ELAPSED}s)"
    exit 0
  fi

  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo "❌ Backend chưa sẵn sàng sau ${TIMEOUT}s. Kiểm tra lại logs!"
exit 1
