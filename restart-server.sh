#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} 푸드트럭 백엔드 서버 재시작 중..."

# 서버 중지
echo -e "${BLUE}[INFO]${NC} 기존 서버 중지 중..."
./stop-server.sh

# 잠시 대기
sleep 2

# 서버 시작
echo -e "${BLUE}[INFO]${NC} 서버 시작 중..."
./start-server.sh

echo -e "${GREEN}[SUCCESS]${NC} ✅ 서버 재시작 완료!"


