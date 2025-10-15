#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} 푸드트럭 백엔드 서버 상태 확인 중..."

PID_FILE="server.pid"
SERVER_PORT=${PORT:-3002}

# 실행 중인 Node.js 프로세스 확인
NODE_PIDS=$(ps aux | grep 'node.*server.js' | grep -v grep | awk '{print $2}')

if [ -n "$NODE_PIDS" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} ✅ 서버가 실행 중입니다."
    echo -e "${BLUE}[INFO]${NC} 프로세스 ID들: $NODE_PIDS"
    
    # 서버 응답 확인
    echo -e "${BLUE}[INFO]${NC} 서버 응답 확인 중... (포트: ${SERVER_PORT})"
    HEALTH_CHECK_URL="http://localhost:${SERVER_PORT}/health"
    
    if curl -s -f $HEALTH_CHECK_URL > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} ✅ 서버가 정상적으로 응답하고 있습니다."
        
        # 서버 정보 가져오기
        echo -e "\n${BLUE}[INFO]${NC} 📊 서버 정보:"
        curl -s $HEALTH_CHECK_URL | jq '.' 2>/dev/null || curl -s $HEALTH_CHECK_URL
        
    else
        echo -e "${YELLOW}[WARN]${NC} ⚠️ 서버가 실행 중이지만, 헬스 체크 응답이 비정상입니다."
        echo -e "${BLUE}[INFO]${NC} URL: $HEALTH_CHECK_URL"
    fi
    
    # 로그 파일 정보
    LOG_FILE="logs/server-output.log"
    echo -e "\n${BLUE}[INFO]${NC} 📝 로그 파일: ${LOG_FILE}"
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}[INFO]${NC} 최근 로그 (마지막 5줄):"
        tail -n 5 "$LOG_FILE"
    else
        echo -e "${YELLOW}[WARN]${NC} 로그 파일을 찾을 수 없습니다: ${LOG_FILE}"
    fi
    
    # PID 파일 확인
    if [ -f "$PID_FILE" ]; then
        STORED_PID=$(cat "$PID_FILE")
        echo -e "${BLUE}[INFO]${NC} 저장된 PID: ${STORED_PID}"
        if ps -p $STORED_PID > /dev/null 2>&1; then
            echo -e "${GREEN}[SUCCESS]${NC} ✅ 저장된 PID가 유효합니다."
        else
            echo -e "${YELLOW}[WARN]${NC} ⚠️ 저장된 PID가 유효하지 않습니다. PID 파일을 정리합니다."
            rm -f "$PID_FILE"
        fi
    fi
    
else
    echo -e "${RED}[ERROR]${NC} ❌ 서버가 실행 중이 아닙니다."
    
    # PID 파일 확인
    if [ -f "$PID_FILE" ]; then
        STORED_PID=$(cat "$PID_FILE")
        echo -e "${YELLOW}[WARN]${NC} PID 파일이 존재하지만 프로세스가 실행 중이 아닙니다. PID: ${STORED_PID}"
        rm -f "$PID_FILE"
    fi
    
    echo -e "${BLUE}[INFO]${NC} 서버를 시작하려면: ./start-server.sh"
fi

echo -e "\n${BLUE}[INFO]${NC} 서버를 중지하려면: ./stop-server.sh"
echo -e "${BLUE}[INFO]${NC} 서버를 재시작하려면: ./restart-server.sh"