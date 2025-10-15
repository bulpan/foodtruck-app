# 🚚 푸드트럭 앱 프로젝트

하이브리드 모바일 앱과 웹 기반 관리자 패널을 포함한 푸드트럭 서비스입니다.

## 📁 프로젝트 구조

```
truck_new/
├── android/                 # 안드로이드 앱 (Kotlin + Jetpack Compose)
├── backend/                 # Node.js 백엔드 서버
├── admin-web/              # 관리자 웹 패널
├── start-server.sh         # 서버 시작 스크립트
├── stop-server.sh          # 서버 중지 스크립트
├── check-server.sh         # 서버 상태 확인 스크립트
└── README.md              # 이 파일
```

## 🚀 빠른 시작

### 1. 서버 시작
```bash
# 개발 환경으로 서버 시작
./start-server.sh

# 또는 프로덕션 환경으로 시작
./start-server.sh prod
```

### 2. 서버 상태 확인
```bash
./check-server.sh
```

### 3. 서버 중지
```bash
./stop-server.sh
```

## 🔧 서버 관리 스크립트

### `start-server.sh` - 서버 시작
- 기존 서버 프로세스 자동 종료
- 환경변수 자동 설정
- 색상 구분된 로그 출력
- 개발/프로덕션 환경 지원

**사용법:**
```bash
./start-server.sh [dev|prod]
```

### `stop-server.sh` - 서버 중지
- 실행 중인 서버 프로세스 안전하게 종료
- 강제 종료 기능 포함
- 종료 상태 확인

**사용법:**
```bash
./stop-server.sh
```

### `check-server.sh` - 서버 상태 확인
- 서버 프로세스 실행 상태 확인
- 서버 응답 테스트
- 환경 설정 정보 출력
- 최근 로그 확인

**사용법:**
```bash
./check-server.sh
```

## 🌐 서버 접속 정보

서버가 실행되면 다음 URL로 접속할 수 있습니다:

- **서버 URL**: http://localhost:3002
- **어드민 페이지**: http://localhost:3002/admin
- **API 문서**: http://localhost:3002/api
- **헬스 체크**: http://localhost:3002/health

### 모바일 앱에서 접속
- **로컬 네트워크**: http://192.168.219.200:3002
- **안드로이드 에뮬레이터**: http://10.0.2.2:3002

## 📊 로깅 시스템

### 로그 파일 위치
```
backend/logs/server-YYYY-MM-DD.log
```

### 로그 레벨
- **INFO**: 일반 정보 (파란색)
- **SUCCESS**: 성공 메시지 (초록색)
- **WARNING**: 경고 메시지 (노란색)
- **ERROR**: 오류 메시지 (빨간색)
- **DEBUG**: 디버그 정보 (청록색)

### 로그 내용
- 요청/응답 상세 정보
- API 호출 추적 (requestId)
- 응답 시간 측정
- 에러 상세 정보
- 요청 바디, 헤더, 파라미터

## 🔐 관리자 계정

기본 관리자 계정:
- **사용자명**: admin
- **비밀번호**: admin123

## 📱 앱 기능

### 고객용 앱 (안드로이드)
- 홈 화면 (웹뷰)
- 메뉴 화면 (웹뷰)
- 알림 설정 (네이티브)

### 관리자 패널 (웹)
- 로그인/인증
- 대시보드
- 메뉴 관리
- 위치 관리
- 푸시 알림 발송
- FCM 토큰 관리

## 🛠️ 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- PostgreSQL 15+
- Android Studio
- Firebase 프로젝트

### 환경변수
```bash
# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodtruck_db
DB_USER=$USER
DB_PASSWORD=""

# 서버
NODE_ENV=development
PORT=3002

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
FIREBASE_PROJECT_ID=truckspot-9031e
```

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/auth/login` - 관리자 로그인
- `POST /api/auth/register` - 관리자 등록

### 메뉴 관리
- `GET /api/menu` - 메뉴 목록 조회
- `POST /api/menu` - 메뉴 등록
- `PUT /api/menu/:id` - 메뉴 수정
- `DELETE /api/menu/:id` - 메뉴 삭제

### 위치 관리
- `GET /api/location/current` - 현재 위치 조회
- `POST /api/location` - 위치 등록
- `PUT /api/location/:id` - 위치 수정

### 푸시 알림
- `POST /api/push/send` - 푸시 발송
- `GET /api/push/history` - 발송 이력
- `GET /api/push/stats` - 통계

### FCM 토큰
- `POST /api/fcm/register` - 토큰 등록
- `GET /api/fcm/tokens` - 토큰 목록

## 🐛 문제 해결

### 서버가 시작되지 않는 경우
1. 포트 3002가 사용 중인지 확인
2. PostgreSQL이 실행 중인지 확인
3. 환경변수 설정 확인

### 로그 확인
```bash
# 실시간 로그 확인
tail -f backend/logs/server-$(date +%Y-%m-%d).log

# 에러 로그만 확인
grep "ERROR" backend/logs/server-$(date +%Y-%m-%d).log
```

### 서버 상태 확인
```bash
./check-server.sh
```

## 📞 지원

문제가 발생하면 로그 파일을 확인하고, 상세한 에러 정보를 포함하여 문의해주세요.