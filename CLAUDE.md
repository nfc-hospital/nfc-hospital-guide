# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 코드 작업을 할 때 지침을 제공합니다.

## 프로젝트 아키텍처

Django 백엔드와 React PWA 프론트엔드로 구성된 NFC 기반 병원 안내 시스템입니다. pnpm workspace로 구성된 4개의 주요 애플리케이션:

- **Backend**: Django 5.2 API 서버 (REST framework, WebSocket, JWT 인증)
- **Frontend PWA**: React 18 + Vite 환자용 Progressive Web App
- **Admin Dashboard**: 병원 직원용 React 관리 인터페이스
- **Chatbot Server**: Python Flask AI 챗봇 서비스 (부분 구현)

실시간 WebSocket 통신과 NFC 태그 스캔 기능을 갖춘 마이크로서비스 아키텍처를 사용합니다.

## 핵심 명령어

### 개발 서버 실행
```bash
# 모든 서비스 실행 (Django + React PWA + Admin + Chatbot)
pnpm dev

# 개별 서비스 실행
pnpm dev:backend      # Django 서버 (WebSocket 포함)
pnpm dev:frontend     # React PWA (포트 5174)
pnpm dev:admin        # Admin 대시보드 (포트 5173)
pnpm dev:chatbot      # Python Flask 챗봇 (포트 5000)

# 백엔드 실행 옵션
pnpm dev:backend:daphne    # Daphne ASGI 서버 (권장)
pnpm dev:backend:simple    # Django 개발 서버만
```

### 데이터베이스 작업
```bash
# Django 마이그레이션
pnpm dev:db                           # makemigrations + migrate
cd backend/nfc_hospital_system
python manage.py makemigrations       # 마이그레이션 생성
python manage.py migrate              # 마이그레이션 적용
python manage.py createsuperuser      # Django 관리자 계정 생성
```

### 빌드 및 테스트
```bash
pnpm build                # 모든 워크스페이스 빌드
pnpm build:frontend       # React PWA만 빌드
pnpm test                 # 모든 테스트 실행
pnpm lint                 # Prettier로 코드 포맷팅
```

### API 개발
```bash
pnpm type:generate        # Django 모델에서 TypeScript 타입 생성
pnpm type:convert         # OpenAPI 스키마를 TypeScript로 변환
```

## 기술 스택 상세

### 백엔드 (Django)
- **프레임워크**: Django 5.2.4 + DRF 3.14.0
- **데이터베이스**: MySQL (개발) / PostgreSQL (운영)
- **실시간 통신**: Django Channels 4.0.0 + Redis
- **인증**: SimpleJWT 5.3.0 (커스텀 인증 포함)
- **API 문서화**: drf-spectacular (Swagger/OpenAPI)
- **주요 앱**: authentication, appointments, p_queue, nfc, admin_dashboard, integrations

### 프론트엔드 아키텍처
- **PWA 프레임워크**: React 18.2 + Vite 5.1 + TypeScript
- **스타일링**: Tailwind CSS 3.4 (유틸리티 클래스만 사용)
- **상태 관리**: Context API + 커스텀 훅
- **HTTP 클라이언트**: Axios 1.6 (JWT 처리용 인터셉터)
- **라우팅**: React Router 6.22
- **실시간 통신**: 대기열 업데이트용 WebSocket 훅

### 데이터베이스 아키텍처
6개 앱에 걸쳐 19개 Django 모델을 사용하며 핵심 관계는 다음과 같습니다:
- **User** (중심): DeviceToken, Appointment, Queue, TagLog, Notification과 연결
- **대기열 시스템**: Queue ↔ Appointment ↔ Exam (실시간 상태 추적)
- **NFC 통합**: NFCTag ↔ TagLog ↔ User (위치 매핑)
- **EMR 연동**: EmrSyncStatus ↔ PatientState (외부 시스템 동기화)

## API 명세서 v3.0.0 기반 개발 지침

### 베이스 URL 및 API 규칙
- **베이스 URL**: `https://api.nfc-hospital.kr/v1`
- **HTTPS 필수**, RESTful 규칙 준수 (GET, POST, PUT, DELETE)
- **JSON 규칙**: camelCase 속성명, ISO 8601 시간 형식
- **표준 응답**: `{"success": true/false, "data": {...} | "error": {...}}`
- **EMR 연동**: READ-ONLY, 가상 DB를 통한 동기화만 지원

### 환자 상태 모델 (9단계 여정)
환자의 병원 내 전체 여정을 나타내는 상태값:
```
UNREGISTERED  → 병원 도착 전, 예약 정보만 있는 상태
ARRIVED       → 병원 도착 후 NFC 태그했으나 접수/로그인 전
REGISTERED    → 접수/로그인 완료 후 첫 안내를 받은 상태
WAITING       → 특정 검사/진료를 위해 대기열에 등록된 상태
CALLED        → 의료진에 의해 호출된 상태
ONGOING       → 검사/진료가 진행 중인 상태
COMPLETED     → 검사/진료가 완료된 상태
PAYMENT       → 수납 대기 또는 수납 완료 상태
FINISHED      → 모든 여정이 끝나고 귀가 안내를 받은 상태
```

### 대기열 상세 상태 (queue.state)
특정 대기열 내에서의 세부 상태:
```
waiting    → 대기 중
called     → 호출됨
ongoing    → 진행 중 (검사실/진료실 입장)
completed  → 완료
delayed    → 지연
no_show    → 미방문/이탈 (No-Show)
cancelled  → 취소
```

## API 엔드포인트 구조 (명세서 v3 기준)

### 🔐 인증 API (`/api/v1/auth/`)
```bash
POST   /api/v1/auth/simple-login         # 전화번호+생년월일 간편 로그인 ✅
POST   /api/v1/auth/kakao                # 카카오 OAuth 로그인 ✅
POST   /api/v1/auth/pass                 # PASS 앱 본인인증 ❌
POST   /api/v1/auth/sms-verify           # SMS 인증번호 발송/검증 ❌
POST   /api/v1/auth/token/refresh/       # JWT 토큰 갱신 ✅
POST   /api/v1/auth/logout               # 로그아웃 및 토큰 무효화 ✅
GET    /api/v1/auth/profile/             # 환자 프로필 조회 ❌
PUT    /api/v1/users/profile             # 환자 개인정보 수정 ❌
```

### 🔗 가상 DB (EMR 중계) API (`/api/v1/virtual-db/`)
```bash
GET    /api/v1/virtual-db/patient/{emrId}      # EMR 환자 정보 조회 (READ-ONLY) ❌
GET    /api/v1/virtual-db/sync-status          # EMR 동기화 상태 확인 ❌
POST   /api/v1/virtual-db/refresh/{emrId}      # 특정 환자 EMR 재동기화 ❌
```

### 🏥 병원 정보 API (`/api/v1/hospital/`)
```bash
GET    /api/v1/hospital/info                   # 병원 기본 정보 ❌
GET    /api/v1/hospital/departments            # 진료과 목록 및 위치 ❌
GET    /api/v1/hospital/map                    # 병원 내부 지도 데이터 ❌
GET    /api/v1/hospital/facilities             # 편의시설 위치 ❌
GET    /api/v1/hospital/floors/{floorId}       # 층별 안내 정보 ❌
GET    /api/v1/hospital/voice-guide/{locationId} # 위치별 음성 안내 ❌
```

### 📱 NFC 태그 관리 (`/api/v1/nfc/`)
```bash
# 환자용 NFC API
POST   /api/v1/nfc/public-info              # 비로그인 NFC 공개 정보 ❌
POST   /api/v1/nfc/scan/                    # 로그인 사용자 NFC 스캔 🚧
POST   /api/v1/nfc/scan-log                 # NFC 스캔 로그 기록 ❌
GET    /api/v1/nfc/qr-backup/{tagId}        # QR 코드 백업 생성 ❌

# 관리자용 NFC API  
GET    /api/v1/dashboard/nfc/tags           # 태그 목록 조회 ✅
POST   /api/v1/dashboard/nfc/tags           # 새 태그 등록 ✅
PUT    /api/v1/dashboard/nfc/tags/{tagId}   # 태그 정보 수정 ✅
DELETE /api/v1/dashboard/nfc/tags/{tagId}   # 태그 비활성화 ✅
POST   /api/v1/dashboard/nfc/tag-exam-mapping # 태그-검사 매핑 ❌
```

### 🔗 환자용 (PWA) API
```bash
GET    /api/v1/schedule/today               # 당일 일정 조회 🚧
GET    /api/v1/queue/my-position            # 내 대기 순서 조회 🚧
POST   /api/v1/queue/checkin               # 검사실 도착 체크인 ❌
PUT    /api/v1/status/update               # 환자 상태 수동 업데이트 ❌
GET    /api/v1/payment/status              # 결제 상태 조회 ❌
POST   /api/v1/appointment/complete        # 진료 완료 처리 ❌
GET    /api/v1/exam/progress               # 검사 진행 상태 ❌
PUT    /api/v1/queue/acknowledge-call      # 환자 호출 확인 응답 ❌
```

### 📋 예약 및 진료 (`/api/v1/appointments/`)
```bash
GET    /api/v1/appointments/today          # 당일 예약 목록 🚧
GET    /api/v1/appointments/{appointmentId} # 예약 상세 정보 🚧
PUT    /api/v1/appointments/{appointmentId}/status # 예약 상태 업데이트 ❌
POST   /api/v1/appointments/{appointmentId}/arrive # 검사실 도착 확인 ❌
POST   /api/v1/appointments/{appointmentId}/complete # 검사 완료 처리 ❌
GET    /api/v1/appointments/{appointmentId}/preparation # 검사 준비사항 🚧
POST   /api/v1/appointments/emr-arrival    # EMR 도착 처리 연동 ❌
```

### ⏱️ 대기열 관리 (`/api/v1/queue/`)
```bash
# 환자용 대기열 API
GET    /api/v1/queue/status                # 실시간 대기 현황 🚧
POST   /api/v1/queue/join                  # 대기열 등록 🚧
GET    /api/v1/queue/my-position           # 내 대기 순서 조회 🚧
POST   /api/v1/queue/notification-settings # 대기 알림 설정 ❌

# 관리자용 대기열 API
GET    /api/v1/queue/dashboard/realtime-data/    # 실시간 대기열 데이터 ✅
GET    /api/v1/queue/dashboard/by-department/    # 부서별 대기열 ✅
POST   /api/v1/queue/medical/call-patient/       # 환자 호출 ✅
PUT    /api/v1/queue/dashboard/{queueId}         # 대기열 수동 수정 🚧
GET    /api/v1/queue/dashboard/logs              # 대기열 로그 조회 ❌
```

### 🗺 경로 안내 (`/api/v1/navigation/`)
```bash
POST   /api/v1/navigation/route             # 최적 경로 계산 ❌
POST   /api/v1/navigation/accessible-route  # 접근성 경로 조회 ❌
POST   /api/v1/navigation/route-refresh     # 경로 재확인 ❌
GET    /api/v1/navigation/voice-guide/{routeId} # 음성 경로 안내 ❌
GET    /api/v1/navigation/congestion-aware-route # 혼잡도 반영 경로 ❌
```

### 🤖 AI 챗봇 (`/api/chatbot/`)
```bash
POST   /api/chatbot/query                   # 텍스트 질문 처리 🚧
POST   /api/chatbot/voice-query             # 음성 질문 처리 ❌
GET    /api/v1/chatbot/faq                  # FAQ 목록 조회 ❌
GET    /api/v1/chatbot/suggestions          # 맞춤 질문 추천 ❌
POST   /api/chatbot/medical-terms           # 의료용어 쉬운 설명 ❌
GET    /api/v1/chatbot/guide                # 챗봇 사용 가이드 ❌
```

### 📊 분석 API (`/api/v1/analytics/`)
```bash
GET    /api/v1/analytics/patient-flow       # 환자 동선 분석 🚧
GET    /api/v1/analytics/waiting-time       # 대기시간 통계 🚧
GET    /api/v1/analytics/congestion-heatmap # 혼잡도 히트맵 ❌
GET    /api/v1/analytics/chatbot-queries    # 챗봇 질문 분석 ❌
GET    /api/v1/analytics/nfc-usage          # NFC 태그 사용 통계 ❌
GET    /api/v1/analytics/bottlenecks        # 병목 구간 식별 ❌
POST   /api/v1/analytics/custom-report      # 커스텀 보고서 생성 ❌
GET    /api/v1/analytics/export             # 데이터 내보내기 ❌
```

### 🚨 관리자 대시보드 (`/api/v1/dashboard/`)
```bash
# 콘텐츠 관리 (Dept-Admin 이상)
GET    /api/v1/dashboard/content/exams      # 검사/진료 목록 ❌
POST   /api/v1/dashboard/content/exams      # 새 검사/진료 등록 ❌
PUT    /api/v1/dashboard/content/exams/{examId} # 검사/진료 수정 ❌
DELETE /api/v1/dashboard/content/exams/{examId} # 검사/진료 비활성화 ❌

# 알림 및 모니터링 (Super/Dept-Admin)
GET    /api/v1/dashboard/monitor/hospital-status # 실시간 병원 현황 ❌
GET    /api/v1/dashboard/monitor/system-alerts   # 시스템 알림 조회 ❌
POST   /api/v1/dashboard/announcements           # 공지사항 발송 ❌

# 감사 로그 (Super-Admin 전용)
GET    /api/v1/dashboard/audit/logs          # 감사 로그 조회 ❌
GET    /api/v1/dashboard/audit/logs/filter   # 로그 필터링 ❌
GET    /api/v1/dashboard/audit/export        # 로그 내보내기 ❌
```

### 🌐 실시간 갱신 (WebSocket)
```bash
ws://api.nfc-hospital.kr/ws/queue/    # 환자 대기 상태 실시간 업데이트 🚧
ws://api.nfc-hospital.kr/ws/admin/    # 관리자 대시보드 실시간 모니터링 🚧
```

## 역할 기반 접근 제어 (RBAC)

### 사용자 역할 정의
- **Patient**: 환자용 PWA 접근
- **Staff**: 대기열 관리만 접근
- **Dept-Admin**: 부서 관리자 (태그, 콘텐츠, 대기열 관리)
- **Super-Admin**: 최고 관리자 (모든 기능 + 사용자 관리)
- **System**: 시스템 내부 API 호출

### 권한별 접근 가능 API
```bash
Patient:     /api/v1/auth/, /api/v1/nfc/scan/, /api/v1/queue/my-*, /api/v1/appointments/, /api/chatbot/
Staff:       /api/v1/queue/dashboard/ (조회/수정만)
Dept-Admin:  + /api/v1/dashboard/nfc/, /api/v1/dashboard/content/, /api/v1/analytics/
Super-Admin: + /api/v1/dashboard/users/, /api/v1/dashboard/audit/
System:      /api/v1/virtual-db/, 내부 동기화 API
```

## 개발 패턴

### Django API 개발 지침
- **URL 패턴**: 명세서 v3의 정확한 엔드포인트 구조 준수
- **ViewSet 사용**: 복잡한 엔드포인트는 커스텀 액션이 있는 ViewSet 활용
- **시리얼라이저**: 모든 API 엔드포인트에 검증 포함 시리얼라이저 사용
- **권한 클래스**: 역할 기반 권한 시스템 구현 (IsAuthenticated + 커스텀 RBAC)
- **실시간 업데이트**: Django Signal → WebSocket consumer 패턴 사용

### React 컴포넌트 패턴
- **API 연동**: 커스텀 훅 (useAPI, useWebSocket, useAuth) 사용
- **타입 안전성**: 생성된 API 타입으로 적절한 TypeScript 타이핑
- **상태 관리**: 적절한 로딩 및 오류 상태 구현
- **UI 패턴**: 복잡한 UI에는 컴파운드 컴포넌트 패턴 사용
- **스타일링**: Tailwind 유틸리티 클래스만 사용, 커스텀 CSS 지양

### 인증 플로우
1. **간편 로그인**: 전화번호 뒷자리 4자리 + 생년월일 6자리
2. **JWT 토큰**: 1시간 만료, 자동 갱신 지원
3. **카카오 OAuth**: 소셜 로그인 연동
4. **역할 기반 접근**: patient, staff, dept-admin, super-admin
5. **자동 인증**: 디바이스 UUID 기반 재로그인

## 현재 구현 상태 및 우선순위

### ✅ 완전 구현 (36%)
- **인증 시스템**: 간편 로그인, 카카오 OAuth, JWT 토큰 관리
- **관리자 NFC 관리**: 태그 CRUD, 통계
- **관리자 대기열 관리**: 실시간 조회, 환자 호출
- **기본 RBAC**: 역할별 권한 제어

### 🚧 부분 구현/Mock 데이터 (26%)
- **환자 메인 기능**: 일정 조회, 대기 위치 확인 (Mock 데이터 사용)
- **검사 정보**: 검사 상세, 준비사항 조회 (Mock 데이터 사용)
- **분석 대시보드**: 차트 UI만 구현, 실제 데이터 연동 필요
- **WebSocket**: 연결 로직 존재하나 안정화 필요

### ❌ 미구현 (38%)
- **Web NFC API**: NFC 태그 스캔 기능 미작동
- **EMR 연동**: 가상 DB API 전체
- **병원 정보 API**: 지도, 편의시설, 음성 안내
- **경로 안내**: 네비게이션 전체 기능
- **AI 챗봇**: 실제 Python 서버 연동
- **알림 시스템**: FCM 푸시 알림
- **예약 시스템**: 예약 생성/수정/취소

## 개발 우선순위 지침

Claude가 API 개발을 할 때는 다음 우선순위를 따라야 합니다:

### 1순위: 환자용 핵심 기능 완성
```bash
# Mock 데이터 → 실제 API 연동
GET    /api/v1/schedule/today           # 당일 일정 조회
GET    /api/v1/queue/my-position        # 내 대기 순서
GET    /api/v1/appointments/{id}/       # 예약 상세 정보
POST   /api/v1/queue/join               # 대기열 등록
```

### 2순위: NFC 기능 구현
```bash
# Web NFC API 연동 필요
POST   /api/v1/nfc/scan/                # NFC 태그 스캔
POST   /api/v1/nfc/public-info          # 비로그인 NFC 정보
```

### 3순위: WebSocket 안정화
```bash
# 실시간 업데이트 안정화
ws://api.nfc-hospital.kr/ws/queue/      # 환자 대기 상태
ws://api.nfc-hospital.kr/ws/admin/      # 관리자 모니터링
```

## 보안 및 성능 고려사항

### 보안 정책
- **JWT 토큰**: httpOnly 쿠키 저장 고려
- **CORS 설정**: 개발/운영 환경별 적절한 구성
- **속도 제한**: 사용자 60req/min, 관리자 120req/min
- **개인정보 암호화**: AES-256-GCM 사용
- **SQL 인젝션**: Django ORM 사용으로 방지

### 성능 최적화
- **데이터베이스**: 자주 쿼리되는 필드에 인덱스 적용
- **연결 풀링**: MySQL 연결 풀링 사용
- **캐싱**: Redis를 통한 세션 및 실시간 데이터 캐싱
- **페이지네이션**: 기본 10개, 최대 100개 항목
- **코드 스플리팅**: 프론트엔드 지연 로딩 준비

## 가상 환경 구조 (한이음 공모전 데모용)

### 🏥 실제 병원 시스템 미연동 방식
현재 우리는 **실제 병원 EMR/HIS와 직접 연동하지 않는** 환경에서 개발하고 있습니다. 대신 **가상 환경**을 구성해 실제 병원과 비슷한 동작을 재현합니다.

### 📊 가상 EMR (Thin Virtual EMR)
```bash
# 기존 DB 테이블 활용
EmrSyncStatus     # EMR 동기화 상태 및 환자 정보
DailySchedule     # 당일 예약 일정
PatientState      # 환자 현재 상태 (mapped_state)

# 데이터 구조
{
  "mapped_state": "WAITING",           # 9단계 환자 여정 상태
  "appointments": [...],               # 당일 예약 목록
  "last_emr_sync": "2025-08-09T14:30:00Z",
  "emr_appointments": {...},           # JSON 형태 예약 데이터
  "lastSyncedAt": "2025-08-09T14:30:00Z"
}
```

**가상 EMR 특징:**
- **READ-ONLY 전용**: `/api/v1/virtual-db/**` GET 메서드만 허용
- **시드 데이터**: 외부 EMR 대신 JSON/시드 데이터를 60~120초마다 주기적 업데이트
- **동기화 표시**: 모든 응답에 `lastSyncedAt` 포함 → 프론트엔드에서 "데이터 기준 14:30" 배지 표시
- **쓰기 금지**: EMR에는 절대 쓰기/삭제 없음, 단지 읽어서 PWA/대시보드에 표시만

### ⏱️ 가상 대기열 (Virtual Queue System)
```bash
# 기존 DB 테이블 활용
Queue             # 대기열 정보
QueueStatusLog    # 대기열 상태 변경 로그

# 역할 정의
- 병원 대기열이 있다고 가정
- 우리는 내부 큐를 보조적으로 운영
- 관리자 대시보드에서 호출/순번 조정 가능
- 외부(EMR)에는 영향을 주지 않음
```

**가상 대기열 특징:**
- **관리자 제어**: 권한(staff/dept-admin/super-admin)에 따라 호출/순번 조정 가능
- **실시간 알림**: 변경 시 WebSocket/SSE로 환자 PWA에 `queue_update` 이벤트 전송
- **독립 운영**: 외부 EMR에는 영향을 주지 않는 보조 시스템

### 🎮 데모 모드 동작
```bash
# 가상 EMR 시뮬레이션
- 타이머로 환자 상태를 한 단계씩 자동 변경
- UNREGISTERED → ARRIVED → REGISTERED → ... → FINISHED

# 가상 대기열 제어
- 관리자 대시보드 버튼으로 호출/순번 변경
- 실시간 WebSocket으로 환자 PWA 업데이트
- 병원 시스템 건드리지 않고 흐름 재현
```

## UI/UX 디자인 지침 (고령자 친화적 + 현대적)

### 🎨 디자인 원칙
Claude가 UI 컴포넌트를 만들 때 반드시 따라야 할 디자인 원칙:

**1. 고령자 친화적이면서도 현대적이고 심미적**
- **큰 글씨**: 최소 18px, 중요 정보는 24px 이상
- **높은 대비**: 텍스트와 배경 대비비 4.5:1 이상
- **충분한 터치 영역**: 버튼 최소 44x44px, 권장 56x56px
- **부드러운 애니메이션**: transition 300ms, easing 사용

**2. 직관적이고 단순한 인터페이스**
- **원클릭 중심**: 복잡한 네비게이션 지양, 명확한 CTA 하나
- **시각적 계층**: 중요도에 따른 명확한 정보 구조
- **일관된 패턴**: 같은 행동은 같은 UI 패턴 사용
- **즉시 피드백**: 모든 상호작용에 즉각적인 반응

### 📱 환자 PWA UI 구조
```
┌─────────────────────────────────────┐
│ 🟢 상태 배지 + 데이터 기준 시각      │ ← 현재 상태 명확히 표시
├─────────────────────────────────────┤
│         한 줄 현재 상황 안내         │ ← 다음에 해야 할 것
├─────────────────────────────────────┤
│      [거대한 메인 CTA 버튼]         │ ← 가장 중요한 액션 하나
├─────────────────────────────────────┤
│  📊 요약 정보 3칸 (대기인원/시간등)  │ ← 핵심 정보만 간결히
├─────────────────────────────────────┤
│ 🔊 음성  💬 도움말  🤖 AI  📋 메뉴  │ ← 하단 보조 기능
└─────────────────────────────────────┘
```

### 🖥️ 관리자 대시보드 UI 구조
```
┌─────────────────────────────────────┐
│ 병원명 + 사용자 정보 + 알림         │ ← 헤더
├─────────────────────────────────────┤
│    RBAC 기반 메뉴 (role별 차등)     │ ← 권한별 메뉴
├─────────────────────────────────────┤
│ 📊 📊 📊 📊 📊 📊 📊 📊 📊 📊      │ ← 카드형 대시보드
│ 📊 📊 📊 📊 📊 📊 📊 📊 📊 📊      │   (역할별 기능 차등)
│ 📊 📊 📊 📊 📊 📊 📊 📊 📊 📊      │
└─────────────────────────────────────┘
```


```javascript
// 역할별 메뉴 접근 권한
const menuAccess = {
  'staff': ['대기열 관리'],
  'dept-admin': ['대기열 관리', 'NFC 태그 관리', '검사 콘텐츠 관리'],
  'super-admin': ['모든 메뉴', '사용자 관리', '감사 로그']
};

// 역할별 버튼 표시
{role === 'staff' && <QueueControlButton />}
{['dept-admin', 'super-admin'].includes(role) && <TagManagementButton />}
{role === 'super-admin' && <UserManagementButton />}
```

### 📲 하단 네비게이션 가이드라인
환자 PWA 하단 보조 기능바는 직관적이고 헷갈리지 않게:

```
1. TTS로 현재 화면 정보 읽어 주는 버튼튼
2. 간단한 사용법 툴팁/가이드(도움말말)
3. AI 챗봇에게 질문하기 모달
4. 전체 메뉴 - 다른 페이지 접근 (설정, 이력 등)
```

**접근성 고려사항:**
- 아이콘과 함께 텍스트 라벨 병기
- 터치 영역 충분히 확보 (최소 44px)
- 색상에만 의존하지 않는 정보 전달
- 고대비 모드 지원

## 개발 환경 및 API 연동 가이드

### 🔄 가상 EMR API 패턴
```javascript
// 가상 EMR 데이터 조회 (READ-ONLY)
const fetchPatientState = async () => {
  try {
    const response = await api.get('/api/v1/virtual-db');
    return {
      ...response.data,
      isVirtual: true,  // 가상 데이터임을 표시
      lastSyncedAt: response.data.lastSyncedAt
    };
  } catch (error) {
    console.error('가상 EMR 조회 실패:', error);
    return null;
  }
};

// 프론트엔드에서 동기화 시간 표시
<Badge className="text-xs text-gray-500">
  데이터 기준: {formatTime(lastSyncedAt)}
</Badge>
```

### ⚡ 실시간 대기열 업데이트 패턴
```javascript
// WebSocket으로 대기열 실시간 업데이트
const useQueueWebSocket = () => {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/queue/');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'queue_update') {
        // 부드러운 애니메이션과 함께 UI 업데이트
        setQueueData(data.queue);
        showNotification('대기 상태가 업데이트되었습니다', 'info');
      }
    };
    
    return () => ws.close();
  }, []);
};
```

### 🎯 현대적이고 부드러운 상호작용
```javascript
// 버튼 클릭 시 부드러운 피드백
const handleButtonClick = async (action) => {
  // 1. 즉시 시각적 피드백
  setIsLoading(true);
  
  // 2. 부드러운 애니메이션
  buttonRef.current?.classList.add('scale-95');
  
  try {
    // 3. API 호출
    await performAction(action);
    
    // 4. 성공 피드백
    showNotification('✅ 완료되었습니다', 'success');
  } catch (error) {
    // 5. 오류 피드백
    showNotification('❌ 오류가 발생했습니다', 'error');
  } finally {
    // 6. 상태 복원
    setIsLoading(false);
    buttonRef.current?.classList.remove('scale-95');
  }
};
```

---

**중요**: Claude는 이 문서의 API 명세서 v3 기준 엔드포인트 구조를 벗어나지 않고, **가상 환경 구조**를 정확히 이해하여 실제 병원 시스템을 건드리지 않는 데모용 코드를 생성해야 합니다. UI는 **고령자 친화적이면서도 현대적이고 부드러운** 디자인을 지향하며, 모든 상호작용은 **직관적이고 즉각적인 피드백**을 제공해야 합니다.