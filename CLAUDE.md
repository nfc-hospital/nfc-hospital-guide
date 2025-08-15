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
- **대기열 시스템**: Queue ↔ Appointment ↔ Exam (실시간 상태 추적). Queue 모델이 대기열의 모든 상태를 관리하는 단일 진실 원천(Single Source of Truth) 역할을 합니다.
- **NFC 통합**: NFCTag ↔ TagLog ↔ User (위치 매핑)
- **EMR 연동**: EmrSyncStatus ↔ PatientState (외부 시스템 동기화). 당일 일정은 Appointment 모델에서 직접 조회하여 사용합니다.

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
POST   /api/v1/auth/simple-login         # 전화번호+생년월일 간편 로그인 
POST   /api/v1/auth/kakao                # 카카오 OAuth 로그인 
POST   /api/v1/auth/pass                 # PASS 앱 본인인증 
POST   /api/v1/auth/sms-verify           # SMS 인증번호 발송/검증 
POST   /api/v1/auth/token/refresh/       # JWT 토큰 갱신 
POST   /api/v1/auth/logout               # 로그아웃 및 토큰 무효화 
GET    /api/v1/auth/profile/             # 환자 프로필 조회 
PUT    /api/v1/users/profile             # 환자 개인정보 수정 
```

### 🔗 가상 DB (EMR 중계) API (`/api/v1/virtual-db/`)
```bash
GET    /api/v1/virtual-db/patient/{emrId}      # EMR 환자 정보 조회 (READ-ONLY) 
GET    /api/v1/virtual-db/sync-status          # EMR 동기화 상태 확인 
POST   /api/v1/virtual-db/refresh/{emrId}      # 특정 환자 EMR 재동기화 
```

### 🏥 병원 정보 API (`/api/v1/hospital/`)
```bash
GET    /api/v1/hospital/info                   # 병원 기본 정보 
GET    /api/v1/hospital/departments            # 진료과 목록 및 위치 
GET    /api/v1/hospital/map                    # 병원 내부 지도 데이터 
GET    /api/v1/hospital/facilities             # 편의시설 위치 
GET    /api/v1/hospital/floors/{floorId}       # 층별 안내 정보 
GET    /api/v1/hospital/voice-guide/{locationId} # 위치별 음성 안내 
```

### 📱 NFC 태그 관리 (`/api/v1/nfc/`)
```bash
# 환자용 NFC API
POST   /api/v1/nfc/public-info              # 비로그인 NFC 공개 정보 
POST   /api/v1/nfc/scan/                    # 로그인 사용자 NFC 스캔 
POST   /api/v1/nfc/scan-log                 # NFC 스캔 로그 기록 
GET    /api/v1/nfc/qr-backup/{tagId}        # QR 코드 백업 생성 

# 관리자용 NFC API  
GET    /api/v1/dashboard/nfc/tags           # 태그 목록 조회
POST   /api/v1/dashboard/nfc/tags           # 새 태그 등록 
PUT    /api/v1/dashboard/nfc/tags/{tagId}   # 태그 정보 수정 
DELETE /api/v1/dashboard/nfc/tags/{tagId}   # 태그 비활성화 
POST   /api/v1/dashboard/nfc/tag-exam-mapping # 태그-검사 매핑 
```

### 🔗 환자용 (PWA) API
```bash
GET    /api/v1/schedule/today               # 당일 일정 조회 
GET    /api/v1/queue/my-position            # 내 대기 순서 조회 
POST   /api/v1/queue/checkin               # 검사실 도착 체크인 
PUT    /api/v1/status/update               # 환자 상태 수동 업데이트 
GET    /api/v1/payment/status              # 결제 상태 조회 
POST   /api/v1/appointment/complete        # 진료 완료 처리 
GET    /api/v1/exam/progress               # 검사 진행 상태 
PUT    /api/v1/queue/acknowledge-call      # 환자 호출 확인 응답 
```

### 📋 예약 및 진료 (`/api/v1/appointments/`)
```bash
GET    /api/v1/appointments/today          # 당일 예약 목록 
GET    /api/v1/appointments/{appointmentId} # 예약 상세 정보
PUT    /api/v1/appointments/{appointmentId}/status # 예약 상태 업데이트 
POST   /api/v1/appointments/{appointmentId}/arrive # 검사실 도착 확인 
POST   /api/v1/appointments/{appointmentId}/complete # 검사 완료 처리 
GET    /api/v1/appointments/{appointmentId}/preparation # 검사 준비사항 
POST   /api/v1/appointments/emr-arrival    # EMR 도착 처리 연동 
```

### ⏱️ 대기열 관리 (`/api/v1/queue/`)
```bash
# 환자용 대기열 API
GET    /api/v1/queue/status                # 실시간 대기 현황 
POST   /api/v1/queue/join                  # 대기열 등록 
GET    /api/v1/queue/my-position           # 내 대기 순서 조회 
POST   /api/v1/queue/notification-settings # 대기 알림 설정 

# 관리자용 대기열 API
GET    /api/v1/queue/dashboard/realtime-data/    # 실시간 대기열 데이터 
GET    /api/v1/queue/dashboard/by-department/    # 부서별 대기열 
POST   /api/v1/queue/medical/call-patient/       # 환자 호출 
PUT    /api/v1/queue/dashboard/{queueId}         # 대기열 수동 수정 
GET    /api/v1/queue/dashboard/logs              # 대기열 로그 조회 
```

### 🗺 경로 안내 (`/api/v1/navigation/`)
```bash
POST   /api/v1/navigation/route             # 최적 경로 계산 
POST   /api/v1/navigation/accessible-route  # 접근성 경로 조회 
POST   /api/v1/navigation/route-refresh     # 경로 재확인 
GET    /api/v1/navigation/voice-guide/{routeId} # 음성 경로 안내
GET    /api/v1/navigation/congestion-aware-route # 혼잡도 반영 경로
```

### 🤖 AI 챗봇 (`/api/chatbot/`)
```bash
POST   /api/chatbot/query                   # 텍스트 질문 처리 
POST   /api/chatbot/voice-query             # 음성 질문 처리 
GET    /api/v1/chatbot/faq                  # FAQ 목록 조회 
GET    /api/v1/chatbot/suggestions          # 맞춤 질문 추천 
POST   /api/chatbot/medical-terms           # 의료용어 쉬운 설명 
GET    /api/v1/chatbot/guide                # 챗봇 사용 가이드 
```

### 📊 분석 API (`/api/v1/analytics/`)
```bash
GET    /api/v1/analytics/patient-flow       # 환자 동선 분석 
GET    /api/v1/analytics/waiting-time       # 대기시간 통계 
GET    /api/v1/analytics/congestion-heatmap # 혼잡도 히트맵 
GET    /api/v1/analytics/chatbot-queries    # 챗봇 질문 분석 
GET    /api/v1/analytics/nfc-usage          # NFC 태그 사용 통계 
GET    /api/v1/analytics/bottlenecks        # 병목 구간 식별 
POST   /api/v1/analytics/custom-report      # 커스텀 보고서 생성 
GET    /api/v1/analytics/export             # 데이터 내보내기 
```

### 🚨 관리자 대시보드 (`/api/v1/dashboard/`)
```bash
# 콘텐츠 관리 (Dept-Admin 이상)
GET    /api/v1/dashboard/content/exams      # 검사/진료 목록 
POST   /api/v1/dashboard/content/exams      # 새 검사/진료 등록 
PUT    /api/v1/dashboard/content/exams/{examId} # 검사/진료 수정 
DELETE /api/v1/dashboard/content/exams/{examId} # 검사/진료 비활성화 

# 알림 및 모니터링 (Super/Dept-Admin)
GET    /api/v1/dashboard/monitor/hospital-status # 실시간 병원 현황 
GET    /api/v1/dashboard/monitor/system-alerts   # 시스템 알림 조회 
POST   /api/v1/dashboard/announcements           # 공지사항 발송 

# 감사 로그 (Super-Admin 전용)
GET    /api/v1/dashboard/audit/logs          # 감사 로그 조회 
GET    /api/v1/dashboard/audit/logs/filter   # 로그 필터링 
GET    /api/v1/dashboard/audit/export        # 로그 내보내기 
```

### 🌐 실시간 갱신 (WebSocket)
```bash
ws://api.nfc-hospital.kr/ws/queue/    # 환자 대기 상태 실시간 업데이트 
ws://api.nfc-hospital.kr/ws/admin/    # 관리자 대시보드 실시간 모니터링 
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
EmrSyncStatus      # EMR 동기화 상태 및 환자 정보
Appointment        # 당일 예약 일정 (직접 필터링)
PatientState       # 환자 현재 상태 (mapped_state)

# 데이터 구조
{
  "mapped_state": "WAITING",
  "appointments": [...], // Appointment 테이블에서 직접 조회
  "last_emr_sync": "2025-08-09T14:30:00Z",
  "emr_appointments": {...},
  "lastSyncedAt": "2025-08-09T14:30:00Z"
}
```

**가상 EMR 특징:**
- **READ-ONLY 전용**: `/api/v1/virtual-db/**` GET 메서드만 허용
- **시드 데이터**: 외부 EMR 대신 JSON/시드 데이터를 `Appointment` 테이블에 직접 생성하고, 60~120초마다 주기적으로 상태를 업데이트합니다.
- **동기화 표시**: 모든 응답에 `lastSyncedAt` 포함 → 프론트엔드에서 "데이터 기준 14:30" 배지 표시
- **쓰기 금지**: EMR에는 절대 쓰기/삭제 없음, 단지 읽어서 PWA/대시보드에 표시만

### ⏱️ 가상 대기열 (Virtual Queue System)
```bash
# 기존 DB 테이블 활용
Queue              # 대기열 정보 (단일 진실 원천)
QueueStatusLog     # 대기열 상태 변경 로그

# 역할 정의
- 병원 대기열이 있다고 가정
- 우리는 내부 큐를 보조적으로 운영
- 관리자 대시보드에서 호출/순번 조정 가능
- 외부(EMR)에는 영향을 주지 않음
```

**가상 대기열 특징:**
- **관리자 제어**: 권한(staff/dept-admin/super-admin)에 따라 `Queue` 모델의 상태를 직접 호출/순번 조정 가능
- **실시간 알림**: `Queue` 모델 변경 시 WebSocket/SSE로 환자 PWA에 `queue_update` 이벤트 전송
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

## 전체 데이터베이스 스키마 (Merged)
프로젝트에서 사용하는 모든 테이블의 스키마 정의입니다.

SQL
```
-- nfc_hospital_db_admin_logs.txt
DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(10) NOT NULL,
  `target_table` varchar(100) NOT NULL,
  `target_id` varchar(100) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `admin_logs_user_id_916751_idx` (`user_id`,`timestamp`),
  KEY `admin_logs_action_cc36f2_idx` (`action`,`timestamp`),
  KEY `admin_logs_target__315337_idx` (`target_table`,`target_id`),
  KEY `admin_logs_timesta_952aa9_idx` (`timestamp`),
  CONSTRAINT `admin_logs_user_id_7cc6dd52_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_appointment_histories.txt
CREATE TABLE `appointment_histories` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(20) NOT NULL,
  `note` longtext,
  `created_at` datetime(6) NOT NULL,
  `appointment_id` varchar(50) NOT NULL,
  `created_by_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `appointment_appoint_08501f_idx` (`appointment_id`,`created_at`),
  KEY `appointment_action_7efe73_idx` (`action`),
  KEY `appointment_histories_created_by_id_74318ed3_fk_users_user_id` (`created_by_id`),
  CONSTRAINT `appointment_historie_appointment_id_55ea2fdd_fk_appointme` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`),
  CONSTRAINT `appointment_histories_created_by_id_74318ed3_fk_users_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_appointments.txt
CREATE TABLE `appointments` (
  `appointment_id` varchar(50) NOT NULL,
  `status` varchar(10) NOT NULL,
  `arrival_confirmed` tinyint(1) NOT NULL,
  `scheduled_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`appointment_id`),
  KEY `appointment_user_id_ed0db4_idx` (`user_id`,`scheduled_at`),
  KEY `appointment_exam_id_8a2787_idx` (`exam_id`,`scheduled_at`),
  KEY `appointment_status_e303fa_idx` (`status`,`scheduled_at`),
  KEY `appointment_schedul_2da7be_idx` (`scheduled_at`),
  CONSTRAINT `appointments_exam_id_b6e069e8_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `appointments_user_id_052f0814_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_auth_device_tokens.txt
CREATE TABLE `auth_device_tokens` (
  `device_id` char(32) NOT NULL,
  `token` varchar(255) NOT NULL,
  `device_uuid` varchar(255) NOT NULL,
  `device_type` varchar(10) NOT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_model` varchar(100) DEFAULT NULL,
  `user_agent` longtext,
  `app_version` varchar(20) DEFAULT NULL,
  `fcm_token` longtext,
  `is_active` tinyint(1) NOT NULL,
  `is_trusted` tinyint(1) NOT NULL,
  `last_ip_address` char(39) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `last_login_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `device_uuid` (`device_uuid`),
  KEY `auth_device_user_id_ea16f5_idx` (`user_id`,`is_active`),
  KEY `auth_device_token_755da8_idx` (`token`),
  KEY `auth_device_device__efe499_idx` (`device_uuid`),
  KEY `auth_device_user_id_6f08da_idx` (`user_id`,`device_type`,`is_active`),
  CONSTRAINT `auth_device_tokens_user_id_090c3099_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_auth_group.txt
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_auth_group_permissions.txt
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_auth_login_attempts.txt
CREATE TABLE `auth_login_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `phone_last4` varchar(4) DEFAULT NULL,
  `birth_date` varchar(6) DEFAULT NULL,
  `login_type` varchar(10) NOT NULL,
  `status` varchar(10) NOT NULL,
  `device_uuid` varchar(255) DEFAULT NULL,
  `user_agent` longtext,
  `ip_address` char(39) NOT NULL,
  `failure_reason` varchar(100) DEFAULT NULL,
  `attempted_at` datetime(6) NOT NULL,
  `user_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `auth_login__ip_addr_0fb781_idx` (`ip_address`,`attempted_at`),
  KEY `auth_login__phone_l_ae1e87_idx` (`phone_last4`,`attempted_at`),
  KEY `auth_login__device__25056d_idx` (`device_uuid`,`status`),
  KEY `auth_login_attempts_user_id_e6e72f0f_fk_users_user_id` (`user_id`),
  CONSTRAINT `auth_login_attempts_user_id_e6e72f0f_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_auth_permission.txt
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_django_admin_log.txt
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_django_content_type.txt
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_django_migrations.txt
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_django_session.txt
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_emr_sync_status.txt
CREATE TABLE `emr_sync_status` (
  `sync_id` varchar(36) NOT NULL,
  `patient_emr_id` varchar(100) NOT NULL,
  `last_sync_time` datetime(6) NOT NULL,
  `sync_success` tinyint(1) NOT NULL,
  `error_message` longtext,
  `retry_count` int NOT NULL,
  `emr_raw_status` varchar(50) DEFAULT NULL,
  `emr_department` varchar(50) DEFAULT NULL,
  `emr_appointment_date` date DEFAULT NULL,
  `emr_appointment_time` time(6) DEFAULT NULL,
  `emr_doctor_id` varchar(50) DEFAULT NULL,
  `emr_room_number` varchar(20) DEFAULT NULL,
  `mapped_state` varchar(20) DEFAULT NULL,
  `mapping_rules_version` varchar(10) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`sync_id`),
  KEY `emr_sync_status_user_id_02901d83_fk_users_user_id` (`user_id`),
  KEY `emr_sync_st_patient_660dd7_idx` (`patient_emr_id`),
  KEY `emr_sync_st_last_sy_c8ef0b_idx` (`last_sync_time`),
  KEY `emr_sync_st_mapped__c614b8_idx` (`mapped_state`),
  CONSTRAINT `emr_sync_status_user_id_02901d83_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_exam_preparations.txt
CREATE TABLE `exam_preparations` (
  `prep_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `is_required` tinyint(1) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `icon` varchar(200) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  PRIMARY KEY (`prep_id`),
  KEY `exam_prepar_exam_id_17dab8_idx` (`exam_id`,`is_required`),
  KEY `exam_prepar_exam_id_473f95_idx` (`exam_id`,`type`),
  CONSTRAINT `exam_preparations_exam_id_d47befcb_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_exams.txt
CREATE TABLE `exams` (
  `exam_id` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `department` varchar(100) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL,
  `building` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `floor` varchar(50) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `average_duration` int NOT NULL,
  `buffer_time` int NOT NULL,
  `x_coord` double NOT NULL,
  `y_coord` double NOT NULL,
  PRIMARY KEY (`exam_id`),
  KEY `exams_departm_022a01_idx` (`department`),
  KEY `exams_is_acti_5cee66_idx` (`is_active`),
  KEY `exams_buildin_9b27e8_idx` (`building`,`floor`,`room`),
  KEY `exams_categor_f7eb60_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_feedbacks.txt
CREATE TABLE `feedbacks` (
  `feedback_id` char(32) NOT NULL,
  `category` varchar(20) NOT NULL,
  `rating` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `response` longtext,
  `responded_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `assigned_to_user_id` char(32) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`feedback_id`),
  KEY `feedbacks_user_id_c7b83f_idx` (`user_id`,`created_at`),
  KEY `feedbacks_categor_862552_idx` (`category`,`status`),
  KEY `feedbacks_status_e7bc93_idx` (`status`,`created_at`),
  KEY `feedbacks_assigne_f7acd7_idx` (`assigned_to_user_id`,`status`),
  CONSTRAINT `feedbacks_assigned_to_user_id_6bb7cbdf_fk_users_user_id` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feedbacks_user_id_be6417c2_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_nfc_tag_exams.txt
CREATE TABLE `nfc_tag_exams` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `exam_name` varchar(100) NOT NULL,
  `exam_room` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `exam_id` varchar(50) DEFAULT NULL,
  `tag_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nfc_tag_exams_tag_id_exam_id_22cc91d3_uniq` (`tag_id`,`exam_id`),
  KEY `nfc_tag_exa_exam_id_60f10a_idx` (`exam_id`),
  KEY `nfc_tag_exa_is_acti_5d8225_idx` (`is_active`),
  CONSTRAINT `nfc_tag_exams_exam_id_4ec42a3e_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `nfc_tag_exams_tag_id_2f1da37f_fk_nfc_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `nfc_tags` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_nfc_tags.txt
CREATE TABLE `nfc_tags` (
  `tag_id` char(32) NOT NULL,
  `tag_uid` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `building` varchar(100) NOT NULL,
  `floor` int NOT NULL,
  `room` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `x_coord` double NOT NULL,
  `y_coord` double NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `last_scanned_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_uid` (`tag_uid`),
  UNIQUE KEY `code` (`code`),
  KEY `nfc_tags_tag_uid_9adf71_idx` (`tag_uid`),
  KEY `nfc_tags_code_017718_idx` (`code`),
  KEY `nfc_tags_buildin_b0674f_idx` (`building`,`floor`),
  KEY `nfc_tags_is_acti_fa2d8a_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_notification_settings.txt
CREATE TABLE `notification_settings` (
  `user_id` char(32) NOT NULL,
  `queue_update` tinyint(1) NOT NULL,
  `patient_call` tinyint(1) NOT NULL,
  `exam_ready` tinyint(1) NOT NULL,
  `exam_complete` tinyint(1) NOT NULL,
  `appointment_reminder` tinyint(1) NOT NULL,
  `system` tinyint(1) NOT NULL,
  `emergency` tinyint(1) NOT NULL,
  `do_not_disturb_enabled` tinyint(1) NOT NULL,
  `do_not_disturb_start` time(6) DEFAULT NULL,
  `do_not_disturb_end` time(6) DEFAULT NULL,
  `notification_sound` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `notification_settings_user_id_ce43fde1_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_notifications.txt
CREATE TABLE `notifications` (
  `notification_id` char(32) NOT NULL,
  `type` varchar(30) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` longtext NOT NULL,
  `data` json NOT NULL,
  `status` varchar(10) NOT NULL,
  `fcm_response` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `sent_at` datetime(6) DEFAULT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  `device_token_id` char(32) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `notifications_device_token_id_2ce41bda_fk_auth_devi` (`device_token_id`),
  KEY `notificatio_user_id_8ab96f_idx` (`user_id`,`status`),
  KEY `notificatio_type_cb6908_idx` (`type`,`created_at`),
  KEY `notificatio_status_dee16f_idx` (`status`,`created_at`),
  CONSTRAINT `notifications_device_token_id_2ce41bda_fk_auth_devi` FOREIGN KEY (`device_token_id`) REFERENCES `auth_device_tokens` (`device_id`),
  CONSTRAINT `notifications_user_id_468e288d_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_patient_states.txt
CREATE TABLE `patient_states` (
  `state_id` varchar(36) NOT NULL,
  `current_state` varchar(20) NOT NULL,
  `current_location` varchar(36) DEFAULT NULL,
  `current_exam` varchar(50) DEFAULT NULL,
  `emr_patient_id` varchar(100) DEFAULT NULL,
  `emr_raw_status` varchar(50) DEFAULT NULL,
  `emr_department` varchar(50) DEFAULT NULL,
  `emr_appointment_time` datetime(6) DEFAULT NULL,
  `emr_latest_update` datetime(6) DEFAULT NULL,
  `is_logged_in` tinyint(1) NOT NULL,
  `login_method` varchar(20) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`state_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `patient_sta_current_a968e4_idx` (`current_state`),
  KEY `patient_sta_emr_pat_9b31c8_idx` (`emr_patient_id`),
  KEY `patient_sta_emr_app_c28ecb_idx` (`emr_appointment_time`),
  CONSTRAINT `patient_states_user_id_792f249a_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_queue_status_logs.txt
CREATE TABLE `queue_status_logs` (
  `log_id` char(32) NOT NULL,
  `previous_state` varchar(20) DEFAULT NULL,
  `new_state` varchar(20) NOT NULL,
  `previous_number` int DEFAULT NULL,
  `new_number` int DEFAULT NULL,
  `reason` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `changed_by_id` char(32) DEFAULT NULL,
  `queue_id` char(32) NOT NULL,
  `estimated_wait_time_at_time` int DEFAULT NULL,
  `location` varchar(36) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `queue_position_at_time` int DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `queue_statu_queue_i_1a0e94_idx` (`queue_id`,`created_at`),
  KEY `queue_statu_new_sta_f4bd56_idx` (`new_state`),
  KEY `queue_status_logs_changed_by_id_14798e4d_fk_users_user_id` (`changed_by_id`),
  KEY `queue_statu_locatio_4ff469_idx` (`location`),
  CONSTRAINT `queue_status_logs_changed_by_id_14798e4d_fk_users_user_id` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `queue_status_logs_queue_id_682336a8_fk_queues_queue_id` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`queue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_queues.txt
CREATE TABLE `queues` (
  `queue_id` char(32) NOT NULL,
  `state` varchar(20) NOT NULL,
  `queue_number` int NOT NULL,
  `estimated_wait_time` int NOT NULL,
  `priority` varchar(10) NOT NULL,
  `called_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `appointment_id` varchar(50) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`queue_id`),
  KEY `queues_exam_id_eb605e_idx` (`exam_id`,`state`),
  KEY `queues_user_id_ccbcdb_idx` (`user_id`),
  KEY `queues_state_288652_idx` (`state`,`queue_number`),
  KEY `queues_created_3277e5_idx` (`created_at`),
  KEY `queues_priorit_75cf5b_idx` (`priority`,`state`),
  KEY `queues_appointment_id_230d4c72_fk_appointments_appointment_id` (`appointment_id`),
  CONSTRAINT `queues_appointment_id_230d4c72_fk_appointments_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`),
  CONSTRAINT `queues_exam_id_22792f2b_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `queues_user_id_703c55a5_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_state_transitions.txt
CREATE TABLE `state_transitions` (
  `transition_id` varchar(36) NOT NULL,
  `from_state` varchar(20) DEFAULT NULL,
  `to_state` varchar(20) NOT NULL,
  `trigger_type` varchar(20) NOT NULL,
  `trigger_source` varchar(100) DEFAULT NULL,
  `location_at_transition` varchar(36) DEFAULT NULL,
  `exam_id` varchar(50) DEFAULT NULL,
  `emr_reference` varchar(100) DEFAULT NULL,
  `emr_status_before` varchar(50) DEFAULT NULL,
  `emr_status_after` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`transition_id`),
  KEY `state_trans_user_id_835b0b_idx` (`user_id`,`created_at`),
  KEY `state_trans_trigger_fd1f45_idx` (`trigger_type`,`created_at`),
  KEY `state_trans_from_st_00880a_idx` (`from_state`,`to_state`),
  CONSTRAINT `state_transitions_user_id_bbb1bfef_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_tag_logs.txt
CREATE TABLE `tag_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `action_type` varchar(10) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `tag_id` char(32) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `tag_logs_user_id_cf33d7_idx` (`user_id`,`timestamp`),
  KEY `tag_logs_tag_id_48e147_idx` (`tag_id`,`timestamp`),
  KEY `tag_logs_action__104e61_idx` (`action_type`),
  KEY `tag_logs_timesta_efc753_idx` (`timestamp`),
  CONSTRAINT `tag_logs_tag_id_a1b736b8_fk_nfc_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `nfc_tags` (`tag_id`),
  CONSTRAINT `tag_logs_user_id_3457a980_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_users.txt
CREATE TABLE `users` (
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint NOT NULL DEFAULT '0',
  `user_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `birth_date` date NOT NULL,
  `patient_id` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `allergies` json NOT NULL,
  `last_login_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `is_staff` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_email_4b85f2_idx` (`email`),
  KEY `users_role_a8f2ba_idx` (`role`,`is_active`),
  KEY `users_phone_n_a3b1c5_idx` (`phone_number`),
  KEY `users_patient_96e1c9_idx` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_users_groups.txt
CREATE TABLE `users_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` char(32) NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_groups_user_id_group_id_fc7788e8_uniq` (`user_id`,`group_id`),
  KEY `users_groups_group_id_2f3517aa_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_groups_group_id_2f3517aa_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nfc_hospital_db_users_user_permissions.txt
CREATE TABLE `users_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` char(32) NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_permissions_user_id_permission_id_3b86cbdf_uniq` (`user_id`,`permission_id`),
  KEY `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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

### 🎨 Tailwind CSS 스타일 가이드
Claude가 사용해야 할 핵심 Tailwind 클래스 원칙:

**고령자 친화적 기본 스타일**
- 텍스트: `text-lg sm:text-xl font-medium leading-relaxed`
- 버튼: `px-8 py-4 text-xl font-semibold rounded-xl min-h-[56px]`
- 고대비: `bg-white text-gray-900 border-2 border-gray-300`

**현대적이고 부드러운 애니메이션**
- 전환: `transition-all duration-300 ease-in-out`
- 그림자: `shadow-lg hover:shadow-xl`
- 모서리: `rounded-2xl`

**상태별 색상 (직관적)**
- 대기중: `bg-amber-50 text-amber-800 border-amber-200`
- 호출됨: `bg-green-50 text-green-800 border-green-200`
- 진행중: `bg-blue-50 text-blue-800 border-blue-200`
- 완료: `bg-gray-50 text-gray-600 border-gray-200`

**중요도별 버튼**
- 주요 액션: `bg-blue-600 hover:bg-blue-700 text-white`
- 보조 액션: `bg-gray-100 hover:bg-gray-200 text-gray-700`
- 위험 액션: `bg-red-600 hover:bg-red-700 text-white`

### 🔐 RBAC 기반 UI 제어
관리자 대시보드에서 JWT 토큰의 `role` 클레임에 따른 UI 차등 노출:

**역할별 메뉴 접근 권한**
- `staff`: 대기열 관리 + 분석 정보
- `dept-admin`: 대기열 관리 + NFC 태그 관리 + 검사 콘텐츠 관리  
- `super-admin`: 모든 메뉴 + 사용자 관리 + 감사 로그

**구현 방식**
- 같은 `/dashboard` 화면 사용
- `role`에 따라 버튼/메뉴 조건부 렌더링
- 백엔드에서도 동일한 권한 검증 필요

### 📲 하단 네비게이션 가이드라인
환자 PWA 하단 보조 기능바는 직관적이고 헷갈리지 않게:

```
🔊 음성 안내    → TTS로 현재 화면 정보 읽어주기
💬 도움말      → 간단한 사용법 툴팁/가이드
🤖 AI 챗봇     → 질문하기 모달
📋 전체 메뉴   → 다른 페이지 접근 (설정, 이력 등)
```

**접근성 고려사항:**
- 아이콘과 함께 텍스트 라벨 병기
- 터치 영역 충분히 확보 (최소 44px)
- 색상에만 의존하지 않는 정보 전달
- 고대비 모드 지원

---

**중요**: Claude는 이 문서의 API 명세서 v3 기준 엔드포인트 구조를 벗어나지 않고, **가상 환경 구조**를 정확히 이해하여 실제 병원 시스템을 건드리지 않는 데모용 코드를 생성해야 합니다. UI는 **고령자 친화적이면서도 현대적이고 부드러운** 디자인을 지향하며, 모든 상호작용은 **직관적이고 즉각적인 피드백**을 제공해야 합니다.