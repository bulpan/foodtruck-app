#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} 푸드트럭 백엔드 서버 시작 중..."

# 기존 서버 프로세스 종료
./stop-server.sh

# 로그 디렉토리 생성
mkdir -p logs

# 환경 변수 설정
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=foodtruck_db
export DB_USER=$USER
export DB_PASSWORD=""
export NODE_ENV=development
export PORT=3002
export FIREBASE_SERVICE_ACCOUNT_PATH="./serviceAccount.json"
export FIREBASE_PROJECT_ID="truckspot-9031e"
export ALLOWED_ORIGINS="http://localhost:3002,http://192.168.219.200:3002"

echo -e "${BLUE}[INFO]${NC} 환경 변수 설정 완료."
echo -e "${BLUE}[INFO]${NC} NODE_ENV: ${NODE_ENV}"
echo -e "${BLUE}[INFO]${NC} PORT: ${PORT}"
echo -e "${BLUE}[INFO]${NC} DB_HOST: ${DB_HOST}"

# backend 디렉토리로 이동하여 서버 실행
cd backend || { echo -e "${RED}[ERROR]${NC} backend 디렉토리를 찾을 수 없습니다."; exit 1; }

# 개발 모드로 서버 시작 (nodemon)
echo -e "${BLUE}[INFO]${NC} 개발 모드로 서버 시작 (nodemon)..."
npm run dev > ../logs/server-output.log 2>&1 &

SERVER_PID=$!
echo $SERVER_PID > ../server.pid

# 서버 시작 확인
sleep 3
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}[SUCCESS]${NC} ✅ 서버가 백그라운드에서 시작되었습니다. PID: ${SERVER_PID}"
    echo -e "${BLUE}[INFO]${NC} 로그는 logs/server-output.log 에서 확인하세요."
    echo -e "${BLUE}[INFO]${NC} 서버 상태 확인: ./check-server.sh"
    echo -e "${BLUE}[INFO]${NC} 서버 중지: ./stop-server.sh"
    
    # 헬스 체크
    echo -e "${BLUE}[INFO]${NC} 서버 헬스 체크 중..."
    sleep 2
    if curl -s http://localhost:3002/health > /dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} ✅ 서버가 정상적으로 응답하고 있습니다."
    else
        echo -e "${YELLOW}[WARN]${NC} ⚠️ 서버가 시작되었지만 아직 응답하지 않습니다. 잠시 후 다시 확인해주세요."
    fi
else
    echo -e "${RED}[ERROR]${NC} ❌ 서버 시작에 실패했습니다."
    echo -e "${BLUE}[INFO]${NC} 로그를 확인하세요: logs/server-output.log"
    exit 1
fi