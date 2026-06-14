#!/bin/bash
set -euo pipefail

# 서버 배포 스크립트
# 사용법: ./deploy.sh [옵션]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$SCRIPT_DIR/.deploy/deploy.config.sh}"

# 기본 설정 (config 파일에서 override 가능)
SSH_KEY="${SSH_KEY:-$HOME/.ssh/gcp-foodtruck}"
SERVER_USER="${SERVER_USER:-oviwan1974}"
SERVER_HOST="${SERVER_HOST:-34.56.174.6}"
SERVER_PATH="${SERVER_PATH:-/home/oviwan1974}"
SERVICE_NAME="${SERVICE_NAME:-foodtruck-backend.service}"
USE_SUDO_INSTALL="${USE_SUDO_INSTALL:-false}"
TARGET_OWNER="${TARGET_OWNER:-$SERVER_USER}"
TARGET_GROUP="${TARGET_GROUP:-$SERVER_USER}"

if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
fi

REMOTE="${SERVER_USER}@${SERVER_HOST}"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10)

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

die() {
    log_error "$1"
    exit 1
}

show_usage() {
    echo -e "${BLUE}🚀 Food Truck 서버 배포 스크립트${NC}"
    echo "=================================="
    echo -e "${YELLOW}사용법:${NC}"
    echo "  ./deploy.sh [옵션]"
    echo ""
    echo -e "${YELLOW}옵션:${NC}"
    echo "  mobile-web           - 모바일웹 파일들 업로드"
    echo "  backend              - 백엔드 소스(src) 업로드"
    echo "  admin-web            - 어드민 웹 파일들 업로드"
    echo "  restart              - 서버 재시작"
    echo "  status               - 서버 상태 확인"
    echo "  logs                 - 실시간 로그 보기"
    echo "  upload [파일] [경로] - 특정 파일 업로드"
    echo "  key-info             - 현재 SSH 키 정보 출력"
    echo ""
    echo -e "${YELLOW}설정 파일:${NC}"
    echo "  $CONFIG_FILE"
    echo ""
    echo -e "${YELLOW}예시:${NC}"
    echo "  ./deploy.sh admin-web"
    echo "  ./deploy.sh upload mobile-web/index.html mobile-web/"
    echo "  ./deploy.sh restart"
}

check_prerequisites() {
    [[ -f "$SSH_KEY" ]] || die "SSH 키 파일이 없습니다: $SSH_KEY"
    chmod 600 "$SSH_KEY" 2>/dev/null || true
}

run_ssh() {
    ssh "${SSH_OPTS[@]}" "$REMOTE" "$1"
}

run_scp() {
    scp "${SSH_OPTS[@]}" "$@"
}

remote_full_path() {
    local relative_path="$1"
    echo "${SERVER_PATH%/}/${relative_path#/}"
}

upload_file() {
    local local_file="$1"
    local remote_relative_path="$2"
    local remote_path
    local remote_dir
    local tmp_remote_file

    [[ -f "$local_file" ]] || die "로컬 파일이 없습니다: $local_file"

    remote_path="$(remote_full_path "$remote_relative_path")"
    remote_dir="$(dirname "$remote_path")"

    log_info "업로드: $local_file -> $REMOTE:$remote_path"

    if [[ "$USE_SUDO_INSTALL" == "true" ]]; then
        tmp_remote_file="/tmp/foodtruck-deploy-$(basename "$local_file").$$"
        run_scp "$local_file" "$REMOTE:$tmp_remote_file"
        run_ssh "sudo mkdir -p '$remote_dir' && sudo install -o '$TARGET_OWNER' -g '$TARGET_GROUP' -m 644 '$tmp_remote_file' '$remote_path' && rm -f '$tmp_remote_file'"
    else
        run_ssh "mkdir -p '$remote_dir'"
        run_scp "$local_file" "$REMOTE:$remote_path"
    fi
}

upload_directory() {
    local local_dir="$1"
    local remote_relative_path="$2"
    local remote_path
    local remote_parent
    local tmp_remote_dir
    local dir_name

    [[ -d "$local_dir" ]] || die "로컬 디렉터리가 없습니다: $local_dir"

    dir_name="$(basename "$local_dir")"
    remote_path="$(remote_full_path "$remote_relative_path")"
    remote_parent="$(dirname "$remote_path")"

    log_info "업로드(디렉터리): $local_dir -> $REMOTE:$remote_path"

    if [[ "$USE_SUDO_INSTALL" == "true" ]]; then
        tmp_remote_dir="/tmp/foodtruck-deploy-${dir_name}-$$"
        run_ssh "rm -rf '$tmp_remote_dir' && mkdir -p '$tmp_remote_dir'"
        run_scp -r "$local_dir" "$REMOTE:$tmp_remote_dir/"
        run_ssh "sudo mkdir -p '$remote_parent' && sudo rm -rf '$remote_path' && sudo cp -r '$tmp_remote_dir/$dir_name' '$remote_path' && sudo chown -R '$TARGET_OWNER:$TARGET_GROUP' '$remote_path' && rm -rf '$tmp_remote_dir'"
    else
        run_ssh "mkdir -p '$remote_parent'"
        run_scp -r "$local_dir" "$REMOTE:$remote_path"
    fi
}

upload_arbitrary() {
    local local_file="$1"
    local remote_input="$2"

    if [[ "$remote_input" == */ ]]; then
        upload_file "$local_file" "${remote_input}$(basename "$local_file")"
    else
        upload_file "$local_file" "$remote_input"
    fi
}

show_key_info() {
    local pub_key="${SSH_KEY}.pub"
    echo -e "${BLUE}🔐 SSH 키 정보${NC}"
    echo "  private: $SSH_KEY"
    if [[ -f "$pub_key" ]]; then
        echo "  public : $pub_key"
        echo ""
        cat "$pub_key"
    else
        log_warn "공개키 파일이 없습니다: $pub_key"
    fi
}

check_prerequisites

echo -e "${BLUE}🚀 Food Truck 서버 배포 스크립트${NC}"
echo "=================================="
log_info "서버: $REMOTE"
log_info "경로: $SERVER_PATH"
log_info "키  : $SSH_KEY"

if [[ $# -eq 0 ]]; then
    show_usage
    exit 1
fi

case "$1" in
    "mobile-web")
        log_info "📱 모바일웹 파일들 업로드 중..."
        upload_file "mobile-web/index.html" "mobile-web/index.html"
        upload_file "mobile-web/css/style.css" "mobile-web/css/style.css"
        upload_file "mobile-web/js/app.js" "mobile-web/js/app.js"
        log_success "모바일웹 파일 업로드 완료"
        ;;

    "backend")
        log_info "🔧 백엔드 src 업로드 중..."
        upload_directory "backend/src" "backend/src"
        log_success "백엔드 파일 업로드 완료"
        log_warn "서버 재시작 필요: ./deploy.sh restart"
        ;;

    "admin-web")
        log_info "🖥️  어드민 웹 파일들 업로드 중..."
        upload_file "admin-web/index.html" "admin-web/index.html"
        upload_file "admin-web/admin.js" "admin-web/admin.js"
        log_success "어드민 웹 파일 업로드 완료"
        ;;

    "restart")
        log_info "🔄 서버 재시작 중..."
        run_ssh "sudo systemctl restart '$SERVICE_NAME' && sudo systemctl is-active '$SERVICE_NAME'"
        log_success "서버 재시작 완료"
        ;;

    "status")
        log_info "📊 서버 상태 확인 중..."
        run_ssh "sudo systemctl status '$SERVICE_NAME' --no-pager"
        ;;

    "logs")
        log_info "📋 실시간 로그 보기 (Ctrl+C로 종료)"
        run_ssh "sudo journalctl -u '$SERVICE_NAME' -f"
        ;;

    "upload")
        [[ $# -eq 3 ]] || die "사용법: ./deploy.sh upload [로컬파일] [서버경로]"
        upload_arbitrary "$2" "$3"
        log_success "파일 업로드 완료"
        ;;

    "key-info")
        show_key_info
        ;;

    *)
        show_usage
        die "알 수 없는 옵션: $1"
        ;;
esac

echo ""
echo -e "${BLUE}🎉 작업 완료!${NC}"
