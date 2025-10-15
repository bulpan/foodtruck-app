#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} 푸드트럭 백엔드 서버 중지 중..."

PID_FILE="server.pid"

# 모든 Node.js 프로세스 확인 및 종료
echo -e "${BLUE}[INFO]${NC} 실행 중인 Node.js 프로세스 확인 중..."
NODE_PIDS=$(ps aux | grep 'node.*server.js' | grep -v grep | awk '{print $2}')

if [ -n "$NODE_PIDS" ]; then
    echo -e "${BLUE}[INFO]${NC} 발견된 Node.js 프로세스들: $NODE_PIDS"
    for pid in $NODE_PIDS; do
        echo -e "${BLUE}[INFO]${NC} 프로세스 $pid 종료 중..."
        kill $pid
    done
    
    # 5초 대기 후 강제 종료
    sleep 5
    REMAINING_PIDS=$(ps aux | grep 'node.*server.js' | grep -v grep | awk '{print $2}')
    if [ -n "$REMAINING_PIDS" ]; then
        echo -e "${YELLOW}[WARN]${NC} 일부 프로세스가 정상 종료되지 않았습니다. 강제 종료 시도 중..."
        for pid in $REMAINING_PIDS; do
            kill -9 $pid
        done
        sleep 2
    fi
fi

# PID 파일 처리
if [ -f "$PID_FILE" ]; then
    SERVER_PID=$(cat "$PID_FILE")
    echo -e "${BLUE}[INFO]${NC} PID 파일에서 발견된 프로세스: ${SERVER_PID}"
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${BLUE}[INFO]${NC} 프로세스 $SERVER_PID 종료 중..."
        kill $SERVER_PID
        sleep 3
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}[WARN]${NC} 프로세스가 정상 종료되지 않았습니다. 강제 종료 시도 중..."
            kill -9 $SERVER_PID
            sleep 2
        fi
    fi
    rm -f "$PID_FILE"
fi

# 최종 확인
REMAINING_PIDS=$(ps aux | grep 'node.*server.js' | grep -v grep | awk '{print $2}')
if [ -z "$REMAINING_PIDS" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} ✅ 모든 서버 프로세스가 성공적으로 종료되었습니다."
else
    echo -e "${RED}[ERROR]${NC} ❌ 일부 프로세스가 여전히 실행 중입니다: $REMAINING_PIDS"
    echo -e "${BLUE}[INFO]${NC} 수동으로 종료하려면: kill -9 $REMAINING_PIDS"
fi