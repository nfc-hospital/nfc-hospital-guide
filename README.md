# NFC 기반 병원 안내 시스템

병원 내 검사/진료 동선을 NFC 태그와 AI 챗봇으로 안내하는 스마트 병원 솔루션

## 프로젝트 소개

**"병원에서 길을 잃고 헤매던 경험, 이제는 과거가 됩니다"**

대형 병원에서 검사실을 찾아 헤매본 적 있으신가요? 특히 고령자분들에게 복잡한 병원 구조는 큰 스트레스입니다. 

우리 시스템은 스마트폰으로 NFC 태그를 가볍게 터치하는 것만으로 현재 위치를 파악하고, 다음 검사실까지 최적 경로를 안내합니다. 환자의 병원 내 전체 여정을 9단계로 세분화하여 각 단계별 맞춤 안내를 제공하며, 실시간 대기열 정보로 불필요한 기다림을 줄입니다.

### 핵심 가치

- **간편한 사용성**: NFC 태그 터치 한 번으로 모든 안내 시작
- **실시간 정보**: 내 차례가 언제인지, 어디로 가야 하는지 실시간 업데이트
- **맞춤형 여정**: 환자 상태별 9단계 여정 관리 (도착 전 → 귀가까지)
- **통합 대기열**: 여러 검사를 한 번에 관리하는 스마트 대기 시스템
- **접근성 우선**: 고령자도 쉽게 사용할 수 있는 큰 글씨와 음성 안내

## 시스템 아키텍처

### 마이크로서비스 구조
```
+------------------------------------------------------------------+
|                         Frontend Layer                           |
+--------------------+-------------------+-----------------------+
|   환자용 PWA       |   관리자 대시보드   |    AI 챗봇 UI        |
|  React + Vite      |   React + Vite    |   React Component   |
|  Port: 5174        |   Port: 5173      |   Embedded          |
+--------+-----------+---------+---------+----------+------------+
         |                     |                    |
         +---------------------+--------------------+
                               |
                     +---------+---------+
                     |   API Gateway     |
                     |   Nginx Reverse   |
                     +---------+---------+
                               |
+------------------------------------------------------------------+
|                         Backend Services                         |
+-----------------------+-----------------+------------------------+
|   Django REST API     | WebSocket Server|   Flask AI Service   |
|   - Authentication    | Django Channels |   - NLP Engine       |
|   - Queue Management  | - Real-time     |   - FAQ Matcher      |
|   - NFC Processing    | - Notifications |   Port: 5000         |
|   Port: 8000          | Port: 8000/ws   |                      |
+-----------+-----------+--------+--------+---------+-------------+
            |                    |                  |
+---------------+--------+---------------+------------------+
|  MySQL Database       |  Redis Cache      |  EMR Integration |
|  - User Data          |  - Session Store  |  - Virtual DB API|
|  - Queue State        |  - WebSocket Pub  |  - Read-Only Sync|
|  - NFC Mappings       |  - Rate Limiting  |  - Patient State |
+-----------------------+-------------------+------------------+
```

### 데이터 플로우
```
Patient Phone --[NFC Scan]--> PWA --[HTTPS/WSS]--> Django API
                                                         |
Admin PC ------[Dashboard]--> Admin --[REST API]--> Queue Update
                                                         |
                                                         v
                                                    WebSocket
                                                    Broadcast
                                                         |
                                                         v
                                                  All Connected
                                                     Clients
```

## 기술 스택

### Frontend
- **React 18** + TypeScript + Vite
- **PWA** (Progressive Web App)
- **Tailwind CSS** 3.4
- **React Router** 6
- **Axios** + JWT 인증

### Backend
- **Django 5.2** + Django REST Framework
- **Django Channels** (WebSocket)
- **MySQL** / PostgreSQL
- **Redis** (캐싱 및 실시간 통신)
- **SimpleJWT** 인증

### DevOps
- **AWS EC2** + RDS + S3
- **Docker** + Docker Compose
- **GitHub Actions** CI/CD
- **Nginx** + Gunicorn/Daphne

## 빠른 시작

### 사전 요구사항

- Node.js 18+ 및 pnpm 8+
- Python 3.10+
- MySQL 8.0+ 또는 PostgreSQL 14+
- Redis 6+

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/nfc-hospital/nfc-hospital-guide
cd nfc-hospital-guide

# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 환경에 맞게 수정

# 데이터베이스 마이그레이션
pnpm dev:db

# 개발 서버 실행 (모든 서비스)
pnpm dev

# 개별 서비스 실행
pnpm dev:backend      # Django API 서버
pnpm dev:frontend     # 환자용 PWA
pnpm dev:admin        # 관리자 대시보드
pnpm dev:chatbot      # AI 챗봇 서버
```

### 접속 주소

- 환자용 PWA: http://localhost:5174
- 관리자 대시보드: http://localhost:5173
- Django API: http://localhost:8000
- API 문서: http://localhost:8000/api/docs

## 프로젝트 구조

```
nfc-hospital-guide/
├── backend/                  # Django 백엔드
│   └── nfc_hospital_system/ # 메인 Django 프로젝트
│       ├── authentication/   # 인증 및 사용자 관리
│       ├── appointments/     # 예약 및 일정 관리
│       ├── p_queue/         # 대기열 관리
│       ├── nfc/             # NFC 태그 관리
│       └── admin_dashboard/ # 관리자 API
├── frontend-pwa/            # 환자용 React PWA
├── admin-dashboard/         # 관리자 React 앱
├── chatbot-server/          # AI 챗봇 Flask 서버
├── scripts/                 # 유틸리티 스크립트
└── docs/                    # 프로젝트 문서
```

## API 명세

전체 API 문서는 다음 위치에서 확인 가능합니다:
- Swagger UI: `http://localhost:8000/api/docs`
- OpenAPI Schema: `http://localhost:8000/api/schema`

### 주요 엔드포인트

- `POST /api/v1/auth/simple-login` - 간편 로그인
- `POST /api/v1/nfc/scan/` - NFC 태그 스캔
- `GET /api/v1/queue/my-position` - 내 대기 순서 조회
- `POST /api/v1/navigation/route` - 경로 안내
- `WS /ws/queue/` - 실시간 대기열 업데이트

## 배포

### 프로덕션 빌드

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm build:frontend
pnpm build:admin
```

### Docker 배포

```bash
# Docker 이미지 빌드
docker-compose build

# 서비스 실행
docker-compose up -d
```

## 개발 가이드

- [개발 환경 설정](docs/guides/development.md)
- [코드 스타일 가이드](docs/guides/code-style.md)
- [Git 워크플로우](docs/guides/git-workflow.md)
- [API 개발 가이드](docs/guides/api-development.md)

## 기여하기

이 프로젝트는 오픈소스 프로젝트입니다. 기여를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 문의

- 이슈 트래커: [GitHub Issues](https://github.com/nfc-hospital/nfc-hospital-guide/issues)
- 이메일: contact@nfc-hospital.kr

---

2025 한이음 공모전 출품작