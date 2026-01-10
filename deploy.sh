#!/bin/bash

# 서버 배포 스크립트
# 사용법: ./deploy.sh [파일명] [서버경로]

# 기본 설정
# 기본 설정
SSH_KEY="$HOME/.ssh/gcp-foodtruck"
SERVER="oviwan1974@34.173.65.195"
SERVER_PATH="/home/oviwan1974"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Food Truck 서버 배포 스크립트${NC}"
echo "=================================="

# 인자 확인
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}사용법:${NC}"
    echo "  ./deploy.sh [옵션]"
    echo ""
    echo -e "${YELLOW}옵션:${NC}"
    echo "  mobile-web          - 모바일웹 파일들 업로드"
    echo "  backend             - 백엔드 파일들 업로드"
    echo "  admin-web           - 어드민 웹 파일들 업로드"
    echo "  restart             - 서버 재시작"
    echo "  status              - 서버 상태 확인"
    echo "  logs                - 실시간 로그 보기"
    echo "  upload [파일] [경로] - 특정 파일 업로드"
    echo ""
    echo -e "${YELLOW}예시:${NC}"
    echo "  ./deploy.sh mobile-web"
    echo "  ./deploy.sh upload mobile-web/index.html mobile-web/"
    echo "  ./deploy.sh restart"
    exit 1
fi

case $1 in
    "mobile-web")
        echo -e "${YELLOW}📱 모바일웹 파일들 업로드 중...${NC}"
        
        # HTML 파일
        echo "업로드: index.html"
        scp -i "$SSH_KEY" mobile-web/index.html $SERVER:$SERVER_PATH/mobile-web/
        
        # CSS 파일
        echo "업로드: style.css"
        scp -i "$SSH_KEY" mobile-web/css/style.css $SERVER:$SERVER_PATH/mobile-web/css/
        
        # JS 파일
        echo "업로드: app.js"
        scp -i "$SSH_KEY" mobile-web/js/app.js $SERVER:$SERVER_PATH/mobile-web/js/
        
        echo -e "${GREEN}✅ 모바일웹 파일 업로드 완료!${NC}"
        ;;
        
    "backend")
        echo -e "${YELLOW}🔧 백엔드 파일들 업로드 중...${NC}"
        
        # 백엔드 소스 파일들
        echo "업로드: 백엔드 소스 파일들"
        scp -i "$SSH_KEY" -r backend/src/ $SERVER:$SERVER_PATH/backend/
        
        echo -e "${GREEN}✅ 백엔드 파일 업로드 완료!${NC}"
        echo -e "${YELLOW}⚠️  서버 재시작이 필요합니다: ./deploy.sh restart${NC}"
        ;;
        
    "admin-web")
        echo -e "${YELLOW}🖥️  어드민 웹 파일들 업로드 중...${NC}"
        
        # HTML 파일
        echo "업로드: index.html"
        scp -i "$SSH_KEY" admin-web/index.html $SERVER:$SERVER_PATH/admin-web/
        
        # JS 파일
        echo "업로드: admin.js"
        scp -i "$SSH_KEY" admin-web/admin.js $SERVER:$SERVER_PATH/admin-web/
        
        echo -e "${GREEN}✅ 어드민 웹 파일 업로드 완료!${NC}"
        ;;
        
    "restart")
        echo -e "${YELLOW}🔄 서버 재시작 중...${NC}"
        ssh -i "$SSH_KEY" $SERVER "sudo systemctl restart foodtruck-backend.service"
        
        echo -e "${GREEN}✅ 서버 재시작 완료!${NC}"
        echo -e "${BLUE}📊 서버 상태 확인: ./deploy.sh status${NC}"
        ;;
        
    "status")
        echo -e "${YELLOW}📊 서버 상태 확인 중...${NC}"
        ssh -i "$SSH_KEY" $SERVER "sudo systemctl status foodtruck-backend.service"
        ;;
        
    "logs")
        echo -e "${YELLOW}📋 실시간 로그 보기 (Ctrl+C로 종료)${NC}"
        ssh -i "$SSH_KEY" $SERVER "sudo journalctl -u foodtruck-backend.service -f"
        ;;
        
    "upload")
        if [ $# -ne 3 ]; then
            echo -e "${RED}❌ 사용법: ./deploy.sh upload [로컬파일] [서버경로]${NC}"
            echo -e "${YELLOW}예시: ./deploy.sh upload mobile-web/index.html mobile-web/${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}📤 파일 업로드 중...${NC}"
        echo "업로드: $2 → $SERVER:$SERVER_PATH/$3"
        scp -i $SSH_KEY $2 $SERVER:$SERVER_PATH/$3
        
        echo -e "${GREEN}✅ 파일 업로드 완료!${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ 알 수 없는 옵션: $1${NC}"
        echo -e "${YELLOW}사용 가능한 옵션: mobile-web, backend, restart, status, logs, upload${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}🎉 작업 완료!${NC}"
