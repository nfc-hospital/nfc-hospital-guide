# NFC + AI 기반 병원 검사·진료 안내 시스템 API 명세서

## 📋 시작하기

이 문서는 NFC + AI 기반 병원 검사·진료 안내 시스템 API에 대한 전반적 이해를 돕는 것을 목적으로 합니다.

> ❗ 인증 토큰 필요: API를 사용하려면 JWT 토큰이 필요합니다. 토큰은 /auth/simple-login 엔드포인트를 통해 전화번호와 생년월일로 인증 후 받을 수 있습니다.
> 

## 📊 프로젝트 정보

| 항목 | 내용 |
| --- | --- |
| 프로젝트명 | NFC + AI 기반 병원 검사·진료 안내 시스템 |
| API 버전 | v3.0.0 |
| 베이스 URL | `https://api.nfc-hospital.kr/v1` |
| 개발팀 | 정지현, 홍서윤, 홍윤기 |
| 작성일 | 2025년 8월 9일 |
| 기술 스택 | Django, MySQL, Python (Flask) |

## 🔧 API 규칙

### 기본 규칙

- 모든 API 요청의 기본 URL: `https://api.nfc-hospital.kr/v1`
- 모든 API 요청에는 **HTTPS** 필수
- RESTful 규칙 준수: `GET`, `POST`, `PUT`, `DELETE`
- 요청과 응답 본문은 **JSON** 인코딩
- **EMR/HIS는 가상 DB를 통해 동기화되며, 본 API는 EMR을 직접 변경하지 않습니다(READ-ONLY).**
- **환자 상태는 9단계 여정(state)과 대기열 상세 상태(queue.state)로 표현합니다.**

### JSON 규칙

- 최상위 응답에는 `"success"` 속성 포함 (`true` 또는 `false`)
- 성공 응답: `"data"` 속성에 실제 데이터
- 오류 응답: `"error"` 속성에 오류 정보
- 속성 이름: `camelCase` 사용
- 시간 값: ISO 8601 형식 (`2025-06-27T10:30:00Z`)
- 개인정보: AES-256-GCM 암호화 저장

### 표준 응답 형식

```json
{
  "success": true,
  "data": {},
  "message": "요청이 성공적으로 처리되었습니다",
  "timestamp": "2025-08-09T10:30:00Z"
}

```

## 🔐 인증

### 헤더 설정

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

```

### 권한 레벨 (RBAC)

- **Super-Admin**: 전산실 담당자 (모든 메뉴 + 사용자 관리)
- **Dept-Admin**: 간호부/검사실 책임자 (태그, 콘텐츠, 대기열, 환자 호출)
- **Staff**: 접수/창구 직원 (대기열 조회/수정만)
- **Patient**: 일반 환자 (본인 정보만 접근)

### 보안 정책

- **JWT 토큰**: 1시간 만료, Refresh Token으로 갱신
- **전송 암호화**: HTTPS/TLS 1.3 강제
- **데이터 암호화**: AES-256-GCM (개인정보)
- **CSP 정책**: `script-src 'self' cdn.jsdelivr.net`

## 📄 페이지네이션

### 파라미터

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10, 최대: 100)

### 응답 형식

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}

```

## ⚡ 요청 제한

### 속도 제한

- **일반 사용자**: 분당 60건
- **관리자**: 분당 120건
- **AI 챗봇**: 분당 30건

속도 제한 초과 시 `429 Too Many Requests` 반환

### 사이즈 제한

| 데이터 유형 | 최대 크기 |
| --- | --- |
| 요청 본문 | 1MB |
| NFC 태그 데이터 | 1KB |
| 챗봇 메시지 | 1,000자 |
| 검사 준비사항 텍스트 | 2,000자 |

## 📊 상태 코드

### 성공 코드

| HTTP 상태 | 설명 |
| --- | --- |
| 200 | 요청 성공 |
| 201 | 리소스 생성 성공 |
| 204 | 성공 (응답 본문 없음) |

### 오류 코드

| HTTP 상태 | 코드 | 설명 |
| --- | --- | --- |
| 400 | INVALID_REQUEST | 잘못된 요청 형식 |
| 401 | UNAUTHORIZED | 인증 실패 |
| 403 | FORBIDDEN | 접근 권한 없음 |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 |
| 409 | CONFLICT | 리소스 충돌 |
| 429 | RATE_LIMITED | 요청 한도 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

### 오류 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "JWT 토큰이 유효하지 않습니다",
    "details": {}
  },
  "timestamp": "2025-08-09T10:30:00Z"
}

```

---

# 📚 객체 정의

## 상태 모델 정의 (ENUM)

### 상위 여정 상태 (state)

환자의 병원 내 전체 여정을 나타내는 9단계 상태입니다.

| 상태값 | 설명 |
| --- | --- |
| `UNREGISTERED` | 병원 도착 전, 예약 정보만 있는 상태 |
| `ARRIVED` | 병원 도착 후 NFC를 태그했으나, 아직 접수/로그인 전 상태 |
| `REGISTERED` | 접수/로그인 완료 후 첫 안내를 받은 상태 |
| `WAITING` | 특정 검사/진료를 위해 대기열에 등록된 상태 |
| `CALLED` | 의료진에 의해 호출된 상태 |
| `ONGOING` | 검사/진료가 진행 중인 상태 |
| `COMPLETED` | 검사/진료가 완료된 상태 |
| `PAYMENT` | 수납 대기 또는 수납 완료 상태 |
| `FINISHED` | 모든 여정이 끝나고 귀가 안내를 받은 상태 |

### 대기열 상세 상태 (queue.state)

특정 대기열 내에서의 세부 상태를 나타냅니다.

| 상태값 | 설명 |
| --- | --- |
| `waiting` | 대기 중 |
| `called` | 호출됨 |
| `ongoing` | 진행 중 (검사실/진료실 입장) |
| `completed` | 완료 |
| `delayed` | 지연 |
| `no_show` | 미방문/이탈 (No-Show) |
| `cancelled` | 취소 |

## 👤 사용자 객체

### 사용자 객체 출현 위치

- 대기열 객체의 `생성자`, `최종 편집자` 속성
- 검사 객체의 `담당자`, `환자` 속성
- NFC 태그 객체의 `설치자`, `수정자` 속성
- AI 챗봇 응답에서 사용자 멘션 시
- 예약 객체의 `환자` 속성

### 모든 사용자 (공통 필드)

- 이 표시된 필드는 항상 존재하는 속성

| 속성 | 업데이트 가능 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- | --- |
| `object`* | 디스플레이 전용 | `"user"` | 항상 'user' | `"user"` |
| `userId`* | 디스플레이 전용 | `string`(UUID) | 사용자의 고유 식별자 | `"e79a0b74-3aba-4149-9f74-0bb5791a6ee6"` |
| `role` | 디스플레이 전용 | `string`(열거형) | 사용자 역할 타입 | `"patient"`, `"doctor"`, `"admin"` |
| `name` | 업데이트 가능 | `string` | 병원 시스템 표시 사용자 이름 | `"김환자"` |
| `phoneNumber` | 업데이트 가능 | `string` | 암호화된 전화번호 (뒷 4자리만 표시) | `"****5678"` |
| `birthDate` | 디스플레이 전용 | `string` | 생년월일 (YYYY-MM-DD) | `"1990-12-25"` |
| `lastLoginAt` | 디스플레이 전용 | `string` | 마지막 로그인 시간 | `"2025-08-09T10:30:00Z"` |

### 환자 사용자 (추가 속성)

| 속성 | 업데이트 가능 | 유형 | 설명 | 예시 |
| --- | --- | --- | --- | --- |
| `patientId` | 디스플레이 전용 | `string` | 병원 고유 환자 번호 | `"P2025060001"` |
| `emergencyContact` | 업데이트 가능 | `string` | 응급연락처 | `"01087654321"` |
| `allergies` | 업데이트 가능 | `array` | 알레르기 정보 | `["조영제", "페니실린"]` |

## 📱 NFC 태그 객체

### NFC 태그 객체 출현 위치

- 환자가 태그를 스캔할 때 스캔 이벤트 객체
- 검사실 객체의 `설치 위치` 속성
- 검사 객체의 `연결된 태그` 속성
- 관리자 대시보드의 태그 관리 목록

### NFC 태그 객체 예시

```json
{
  "object": "nfc_tag",
  "tagId": "tag-001",
  "code": "4a2b3c4d5e6f7890",
  "location": {
    "building": "본관",
    "floor": 3,
    "room": "304호",
    "description": "X-ray실 앞"
  },
  "isActive": true,
  "lastScannedAt": "2025-08-09T10:15:00Z"
}

```

### 모든 NFC 태그

| 속성 | 업데이트 가능 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- | --- |
| `object`* | 디스플레이 전용 | `"nfc_tag"` | 항상 'nfc_tag' | `"nfc_tag"` |
| `tagId`* | 디스플레이 전용 | `string` | 태그의 고유 식별자 | `"tag-001"` |
| `code` | 디스플레이 전용 | `string` | NFC 태그 하드웨어 코드 (NTAG-213) | `"4a2b3c4d5e6f7890"` |
| `isActive` | 업데이트 가능 | `boolean` | 태그 활성화 상태 | `true` |
| `location` | 업데이트 가능 | `object` | 태그 설치 위치 정보 | 아래 위치 객체 참고 |
| `examId` | 업데이트 가능 | `string` | 연결된 검사 ID | `"exam-xray-001"` |
| `lastScannedAt` | 디스플레이 전용 | `string` | 마지막 스캔 시간 | `"2025-08-09T10:15:00Z"` |
| `scanCount` | 디스플레이 전용 | `number` | 총 스캔 횟수 | `127` |
| `createdAt` | 디스플레이 전용 | `string` | 태그 등록 시간 | `"2025-06-01T09:00:00Z"` |

> 📝 참고: NTAG-213은 패시브 방식 NFC 태그로 배터리가 없으며, 스마트폰 NFC 전력으로 동작합니다.
> 

### 위치 객체

```json
{
  "building": "본관",
  "floor": 3,
  "room": "304호",
  "description": "X-ray실 앞",
  "coordinates": {
    "x": 120.5,
    "y": 85.3
  }
}

```

| 필드 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- |
| `building` | `string` | 건물명 | `"본관"`, `"신관"` |
| `floor` | `number` | 층수 | `3` |
| `room` | `string` | 호실 | `"304호"` |
| `description` | `string` | 위치 상세 설명 | `"X-ray실 앞"` |
| `coordinates` | `object` | 지도상 좌표 | `{"x": 120.5, "y": 85.3}` |

## 🔬 검사 객체

### 검사 객체 출현 위치

- 환자의 예약된 검사 목록의 사용자 대시보드
- 대기열 객체의 `현재 검사` 속성
- AI 챗봇의 검사 안내 응답
- 관리자의 검사 관리 대시보드

### 검사 객체 예시

```json
{
  "object": "exam",
  "examId": "exam-xray-001",
  "title": "흉부 X-ray 촬영",
  "description": "흉부 질환 진단을 위한 X-ray 촬영",
  "department": "영상의학과",
  "category": "imaging",
  "duration": 15,
  "isActive": true
}

```

### 모든 검사

| 속성 | 업데이트 가능 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- | --- |
| `object`* | 디스플레이 전용 | `"exam"` | 항상 'exam' | `"exam"` |
| `examId`* | 디스플레이 전용 | `string` | 검사의 고유 식별자 | `"exam-xray-001"` |
| `title` | 업데이트 가능 | `string` | 검사명 | `"흉부 X-ray 촬영"` |
| `description` | 업데이트 가능 | `string` | 검사 상세 설명 | `"흉부 질환 진단을 위한 X-ray 촬영"` |
| `department` | 업데이트 가능 | `string` | 담당 진료과 | `"영상의학과"` |
| `category` | 업데이트 가능 | `string`(열거형) | 검사 분류 | `"imaging"`, `"blood"`, `"urine"`, `"cardiac"` |
| `duration` | 업데이트 가능 | `number` | 예상 소요 시간 (분) | `15` |
| `isActive` | 업데이트 가능 | `boolean` | 검사 활성화 상태 | `true` |
| `preparations` | 업데이트 가능 | `array` | 검사 준비사항 목록 | 아래 준비사항 객체 참고 |
| `location` | 업데이트 가능 | `object` | 검사실 위치 정보 | 위의 위치 객체와 동일 |
| `createdAt` | 디스플레이 전용 | `string` | 검사 등록 시간 | `"2025-06-01T09:00:00Z"` |
| `updatedAt` | 디스플레이 전용 | `string` | 마지막 수정 시간 | `"2025-06-15T14:30:00Z"` |

### 준비사항 객체

```json
{
  "type": "fasting",
  "title": "금식",
  "description": "검사 8시간 전부터 금식하세요",
  "isRequired": true,
  "icon": "🚫"
}

```

| 필드 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- |
| `type` | `string`(열거형) | 준비사항 유형 | `"fasting"`, `"clothing"`, `"medication"`, `"arrival"` |
| `title` | `string` | 준비사항 제목 | `"금식"`, `"금속 제거"` |
| `description` | `string` | 상세 설명 | `"검사 8시간 전부터 금식하세요"` |
| `isRequired` | `boolean` | 필수 여부 | `true` |
| `icon` | `string` | 아이콘 이모지 | `"🚫"`, `"👕"`, `"💊"` |

## ⏱️ 대기열 객체

### 대기열 객체 출현 위치

- 환자의 현재 대기 상태를 보여주는 실시간 대시보드
- 의료진의 환자 호출 시스템
- 관리자의 대기열 모니터링 대시보드
- AI 기반 대기시간 예측 시스템

### 대기열 객체 예시

```json
{
  "object": "queue",
  "queueId": "queue-001",
  "userId": "e79a0b74-3aba-4149-9f74-0bb5791a6ee6",
  "examId": "exam-xray-001",
  "status": "waiting",
  "queueNumber": 3,
  "estimatedWaitTime": 20,
  "priority": "normal"
}

```

### 모든 대기열

| 속성 | 업데이트 가능 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- | --- |
| `object`* | 디스플레이 전용 | `"queue"` | 항상 'queue' | `"queue"` |
| `queueId`* | 디스플레이 전용 | `string` | 대기열의 고유 식별자 | `"queue-001"` |
| `userId` | 디스플레이 전용 | `string`(UUID) | 환자 사용자 ID | `"e79a0b74-3aba-4149-9f74-0bb5791a6ee6"` |
| `examId` | 디스플레이 전용 | `string` | 검사 ID | `"exam-xray-001"` |
| `status` | 업데이트 가능 | `string`(열거형) | 대기 상태 | `"waiting"`, `"called"`, `"in_progress"`, `"completed"`, `"cancelled"` |
| `queueNumber` | 디스플레이 전용 | `number` | 현재 대기 순번 | `3` |
| `estimatedWaitTime` | 디스플레이 전용 | `number` | 예상 대기 시간 (분) | `20` |
| `priority` | 업데이트 가능 | `string`(열거형) | 우선순위 | `"normal"`, `"urgent"`, `"emergency"` |
| `calledAt` | 디스플레이 전용 | `string` | 호출된 시간 | `"2025-08-09T10:45:00Z"` |
| `createdAt` | 디스플레이 전용 | `string` | 대기열 등록 시간 | `"2025-08-09T10:00:00Z"` |
| `updatedAt` | 디스플레이 전용 | `string` | 마지막 상태 변경 시간 | `"2025-08-09T10:30:00Z"` |

## 🤖 AI 채팅 객체

AI 챗봇과의 대화 내역을 담는 객체입니다. 의료 안내와 FAQ 응답에 사용됩니다.

### AI 채팅 객체 예시

```json
{
  "object": "chat_message",
  "messageId": "msg-001",
  "userId": "e79a0b74-3aba-4149-9f74-0bb5791a6ee6",
  "type": "user_query",
  "content": "X-ray 검사는 얼마나 걸리나요?",
  "response": {
    "type": "faq_answer",
    "content": "X-ray 검사는 보통 10-15분 정도 소요됩니다. 준비 시간을 포함하면 총 20분 정도 예상하시면 됩니다.",
    "confidence": 0.95,
    "sources": ["exam-xray-001"]
  },
  "timestamp": "2025-08-09T10:20:00Z"
}

```

### AI 채팅 필드

| 필드 | 속성 | 설명 | 예시 값 |
| --- | --- | --- | --- |
| `type` | `string`(열거형) | 메시지 유형 | `"user_query"`, `"system_response"`, `"error"` |
| `content` | `string` | 메시지 내용 | `"X-ray 검사는 얼마나 걸리나요?"` |
| `response` | `object` | AI 응답 객체 (사용자 질의에만 포함) | 아래 응답 객체 참고 |

### AI 응답 객체

| 필드 | 유형 | 설명 | 예시 값 |
| --- | --- | --- | --- |
| `type` | `string`(열거형) | 응답 유형 | `"faq_answer"`, `"exam_info"`, `"location_guide"`, `"wait_time"` |
| `content` | `string` | 응답 내용 | `"X-ray 검사는 보통 10-15분 정도 소요됩니다."` |
| `confidence` | `number` | 응답 신뢰도 (0-1) | `0.95` |
| `sources` | `array` | 참조 소스 ID 목록 | `["exam-xray-001"]` |

---

# 🌐 API 엔드포인트

## 🔐 인증 (Authentication)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 간편 로그인 | POST | `/api/v1/auth/simple-login` | 전화번호 뒷자리 4자리 + 생년월일 6자리로 간편 인증 후 JWT 토큰 발급 |
| 카카오톡 로그인 | POST | `/api/v1/auth/kakao` | 카카오톡 OAuth 연동 로그인 |
| PASS 인증 | POST | `/api/v1/auth/pass` | PASS 앱 연동 본인인증 |
| SMS 인증 | POST | `/api/v1/auth/sms-verify` | SMS 인증번호 발송 및 검증 |
| 토큰 갱신 | POST | `/api/v1/auth/token/refresh/` | JWT 토큰 갱신 (Refresh Token 사용) |
| 로그아웃 | POST | `/api/v1/auth/logout` | 사용자 로그아웃 및 토큰 무효화 |
| 개인정보 처리 동의 | POST | `/api/v1/auth/privacy-consent` | 개인정보 처리 동의 절차 |

## 🔗 가상 DB (EMR 중계) API

EMR/HIS 시스템의 데이터를 동기화하는 가상 DB를 읽기 전용으로 조회하고 관리합니다.

| 이름 | 타입 | URL | 설명 | Role |
| --- | --- | --- | --- | --- |
| 환자 EMR 정보 조회 | GET | `/api/v1/virtual-db/patient/{emrId}` | 특정 환자의 EMR 스냅샷 정보 조회 | System, Nurse |
| 동기화 상태 조회 | GET | `/api/v1/virtual-db/sync-status` | EMR 데이터의 마지막 동기화 상태 확인 | Dept-Admin |
| 재동기화 요청 | POST | `/api/v1/virtual-db/refresh/{emrId}` | 특정 환자의 EMR 정보 재동기화 트리거 | System |

## 👤 사용자 관리 (Users)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 환자 프로필 조회 | GET | `/api/v1/auth/profile/` | 현재 로그인한 환자의 기본 정보 조회 |
| 환자 정보 수정 | PUT | `/api/v1/users/profile` | 환자 개인정보 수정 (연락처, 주소 등) |
| 환자 진료 이력 조회 | GET | `/api/v1/users/medical-history` | 환자의 과거 진료 및 검사 이력 조회 (비식별화) |
| 디바이스 UUID 등록 | POST | `/api/v1/users/device-register` | 스마트폰 UUID 등록 (자동 로그인용) |
| 접근성 설정 | PUT | `/api/v1/users/accessibility` | 고령층/장애인 접근성 설정 (큰 글씨, 음성 안내 등) |

## 🏥 병원 정보 (Hospital Info)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 병원 기본 정보 | GET | `/api/v1/hospital/info` | 병원명, 주소, 연락처, 운영시간 등 기본 정보 |
| 진료과 목록 조회 | GET | `/api/v1/hospital/departments` | 모든 진료과 목록 및 위치 정보 |
| 병원 지도 정보 | GET | `/api/v1/hospital/map` | 병원 내부 지도 데이터 (JSON 형태, 2D/3D) |
| 편의시설 위치 | GET | `/api/v1/hospital/facilities` | 화장실, 카페, 약국, 엘리베이터 등 편의시설 위치 |
| 층별 안내 정보 | GET | `/api/v1/hospital/floors/{floorId}` | 특정 층의 상세 안내 정보 |
| 음성 안내 텍스트 | GET | `/api/v1/hospital/voice-guide/{locationId}` | 위치별 음성 안내 텍스트 (TTS 지원) |

## 📱 NFC 태그 관리 (NFC Tags)

NFC 태그는 EMR 시스템을 직접 변경하지 않으며, 가상 DB의 정보를 조회하여 환자에게 맞춤형 안내를 제공하고 내부 시스템의 큐 상태를 관리하는 역할을 합니다. 환자의 로그인 상태에 따라 제공되는 정보가 달라집니다.

- **비로그인(ARRIVED 상태):** NFC 스캔 시 위치 기반의 공용 정보(진료과 안내 등)를 제공합니다.
- **로그인(REGISTERED 이후):** 개인의 일정, 대기열 정보 등 개인화된 안내를 제공합니다.

| 이름 | 타입 | URL | 설명 | Role |
| --- | --- | --- | --- | --- |
| **NFC 공개 정보 처리** | **POST** | **/api/v1/nfc/public-info** | **비로그인 사용자가 NFC 스캔 시 위치 기반 공용 정보 제공** | **Public** |
| **NFC 상태 업데이트** | **POST** | **/api/v1/nfc/scan/** | **로그인 사용자가 NFC 스캔 시 내부 상태 업데이트 및 개인화 안내 (EMR 영향 없음)** | **Patient** |
| 태그 스캔 로그 기록 | POST | `/nfc/scan-log` | NFC 태그 스캔 이벤트 로그 기록 (환자 동선 추적용) | System |
| QR 코드 백업 생성 | GET | `/nfc/qr-backup/{tagId}` | NFC 오류 대비 QR 코드 백업 제공 | Patient |

### 관리자 전용 NFC 관리

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 태그 등록 | POST | `/api/v1/dashboard/nfc/tags` | 새로운 NFC 태그 등록 |
| 태그 수정 | PUT | `/api/v1/dashboard/nfc/tags/{tagId}` | 기존 NFC 태그 정보 수정 |
| 태그 비활성화 | DELETE | `/api/v1/dashboard/nfc/tags/{tagId}` | NFC 태그 soft-delete 처리 |
| 태그-검사 매핑 | POST | `/api/v1/dashboard/nfc/tag-exam-mapping` | NFC 태그와 검사/진료 연결 (1:N 매핑) |

## 🔗 환자용 (PWA) API

환자용 PWA에서 사용되는 핵심 API 목록입니다.

| 이름 | 타입 | URL | 설명 | Role |
| --- | --- | --- | --- | --- |
| 위치 기반 음성 안내 | POST | `/api/v1/voice/department-guide` | 비로그인 시, NFC 위치 기반 진료과 음성 안내 | Public |
| 당일 일정 조회 | GET | `/api/v1/schedule/today` | 로그인 후, 환자의 당일 예약된 검사/진료 목록 조회 | Patient |
| 내 대기 순서 조회 | GET | `/api/v1/queue/my-position` | 현재 환자의 대기 순서 및 예상 시간 조회 | Patient |
| 검사실 도착 체크인 | POST | `/api/v1/queue/checkin` | 환자가 검사실 앞에서 도착 알림 및 내부 상태 업데이트 (EMR 영향 없음) | Patient |
| 상태 업데이트 | PUT | `/api/v1/status/update` | 환자 상태 수동 업데이트 (REGISTERED → WAITING) | Patient |
| 결제 상태 조회 | GET | `/api/v1/payment/status` | 수납 대기 및 결제 상태 조회 | Patient |
| 진료 완료 처리 | POST | `/api/v1/appointment/complete` | 모든 진료 완료 후 귀가 안내 처리 | Patient |
| 검사 진행 상태 | GET | `/api/v1/exam/progress` | 현재 진행 중인 검사의 상태 조회 | Patient |
| 호출 확인 | PUT | `/api/v1/queue/acknowledge-call` | 환자 호출에 대한 확인 응답 | Patient |

## 🔗 큐잉/분석 API

시스템이 내부적으로 대기 시간을 계산하고 동선을 최적화하는 API입니다.

| 이름 | 타입 | URL | 설명 | Role |
| --- | --- | --- | --- | --- |
| 예상 대기시간 계산 | POST | `/api/v1/queueing/calculate-wait-time` | 대기행렬 이론 기반으로 개인별 예상 대기시간 계산 | System |
| 혼잡도 분석 | GET | `/api/v1/queueing/congestion-analysis` | 병원 내 공간별/시간대별 혼잡도 분석 | System |
| 동선 최적화 | POST | `/api/v1/queueing/optimize-flow` | 환자 동선 데이터 기반 최적 경로 추천 로직 실행 | System |

## 📋 예약 및 진료 (Appointments)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 오늘 예약 목록 | GET | `/api/v1/appointments/today` | 환자의 당일 예약된 검사/진료 목록 |
| 예약 상세 정보 | GET | `/api/v1/appointments/{appointmentId}` | 특정 예약의 상세 정보 및 준비사항 |
| 예약 상태 업데이트 | PUT | `/api/v1/appointments/{appointmentId}/status` | 예약 상태 변경 (WAITING/ONGOING/DONE/DELAYED) |
| 검사실 도착 확인 | POST | `/api/v1/appointments/{appointmentId}/arrive` | 검사실 도착 시 체크인 처리 |
| 검사 완료 처리 | POST | `/api/v1/appointments/{appointmentId}/complete` | 검사 완료 처리 및 다음 단계 안내 |
| 검사 준비사항 조회 | GET | `/api/v1/appointments/{appointmentId}/preparation` | 검사별 준비사항 체크리스트 (금식, 금속 제거 등) |
|  |  |  |  |

## ⏱️ 대기열 관리 (Queue Management)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 실시간 대기 현황 | GET | `/api/v1/queue/status` | 현재 대기 인원 및 참고용 예상 대기시간 |
| 대기열 등록 | POST | `/api/v1/queue/join` | 검사실 대기열에 환자 추가 |
| 내 대기 순서 조회 | GET | `/api/v1/queue/my-position` | 현재 환자의 대기 순서 및 예상 시간 |
| 대기 알림 설정 | POST | `/api/v1/queue/notification-settings` | 순서 2-3명 전 푸시 알림 설정 |

## 🗺️ 경로 안내 (Navigation)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 최적 경로 계산 | POST | `/api/v1/navigation/route` | 현재 위치에서 목적지까지 최적 경로 계산 |
| 접근성 경로 조회 | POST | `/api/v1/navigation/accessible-route` | 휠체어/엘리베이터 우선 경로 제공 |
| 경로 재확인 | POST | `/api/v1/navigation/route-refresh` | NFC 재스캔 시 경로 재계산 |
| 음성 경로 안내 | GET | `/api/v1/navigation/voice-guide/{routeId}` | 경로 안내용 음성 텍스트 제공 (TTS) |
| 실시간 혼잡도 반영 | GET | `/api/v1/navigation/congestion-aware-route` | 혼잡도를 고려한 대체 경로 추천 |

## 🤖 AI 챗봇 (Chatbot)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 텍스트 질문 처리 | POST | `/api/chatbot/query` | 사용자 텍스트 질문에 대한 AI 챗봇 응답 |
| 음성 질문 처리 | POST | `/api/chatbot/voice-query` | 음성 입력을 텍스트로 변환 후 챗봇 응답 |
| FAQ 목록 조회 | GET | `/api/v1/chatbot/faq` | 자주 묻는 질문 목록 제공 |
| 맞춤 질문 추천 | GET | `/api/v1/chatbot/suggestions` | 현재 위치/상황 기반 추천 질문 |
| 의료용어 쉬운 설명 | POST | `/api/chatbot/medical-terms` | 의료 용어를 일상 언어로 번역 설명 |
| 챗봇 사용 가이드 | GET | `/api/v1/chatbot/guide` | 챗봇 이용 방법 및 개인정보 보호 안내 |

### 관리자 전용 챗봇 관리

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| FAQ 관리 | POST | `/api/v1/dashboard/chatbot/faq` | 새로운 FAQ 추가 및 기존 응답 수정 |
| 미응답 질문 | GET | `/api/v1/dashboard/chatbot/unanswered` | 챗봇이 응답하지 못한 질문 분석 |

## 🔔 알림 서비스 (Notifications)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 푸시 알림 등록 | POST | `/api/v1/notifications/register` | FCM 기기 토큰 등록 및 알림 설정 |
| 검사 호출 알림 | POST | `/api/v1/notifications/call` | 검사 순서 호출 알림 발송 |
| 검사 결과 알림 | POST | `/api/v1/notifications/results` | 검사 결과 확인 가능 시점 알림 |
| 일정 리마인더 | POST | `/api/v1/notifications/reminder` | 다음 예약 일정 리마인더 |
| 혼잡도 경보 | POST | `/api/v1/notifications/congestion-alert` | 대기시간 기준 초과 시 혼잡 경보 |
| 알림 설정 관리 | PUT | `/api/v1/notifications/settings` | 알림 우선순위 및 방식 설정 |
| 알림 이력 조회 | GET | `/api/v1/notifications/history` | 받은 알림 기록 보관 및 조회 |

---

# 📊 관리자 대시보드 (Admin Dashboard)

## 👥 사용자 관리 (Super-Admin 전용)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 관리자 계정 생성 | POST | `/api/v1/dashboard/users` | 새로운 관리자 계정 생성 (role: super/dept/staff) |
| 관리자 권한 변경 | PUT | `/api/v1/dashboard/users/{userId}/role` | 관리자 권한 수준 변경 |
| 관리자 목록 조회 | GET | `/api/v1/dashboard/users` | 모든 관리자 계정 목록 |
| 계정 비활성화 | DELETE | `/api/v1/dashboard/users/{userId}` | 관리자 계정 비활성화 |

## 📋 콘텐츠 관리 (Dept-Admin 이상)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 검사/진료 등록 | POST | `/api/v1/dashboard/content/exams` | 새로운 검사/진료 콘텐츠 등록 |
| 검사/진료 수정 | PUT | `/api/v1/dashboard/content/exams/{examId}` | 기존 검사/진료 정보 수정 (title, prep, dept) |
| 검사 준비사항 관리 | PUT | `/api/v1/dashboard/content/exams/{examId}/preparation` | 검사별 준비사항 체크리스트 관리 (Markdown 지원) |
| 콘텐츠 목록 조회 | GET | `/api/v1/dashboard/content/exams` | 모든 검사/진료 콘텐츠 목록 |
| 콘텐츠 비활성화 | DELETE | `/api/v1/dashboard/content/exams/{examId}` | 검사/진료 콘텐츠 soft-delete |

## 📱 태그 관리 (Dept-Admin 이상)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 태그 목록 조회 | GET | `/dashboard/tags` | 모든 NFC 태그 목록 및 상태 |
| 태그 상태 모니터링 | GET | `/dashboard/tags/status` | 태그별 스캔 횟수 및 오류율 모니터링 |
| 태그-콘텐츠 연결 | POST | `/dashboard/tags/mapping` | 태그와 검사/진료 1:N 매핑 |
| 비정상 태그 감지 | GET | `/dashboard/tags/anomalies` | 오작동 태그 실시간 감지 |

## ⏱️ 대기열 관리 (Staff 이상)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 실시간 대기열 조회 | GET | `/dashboard/queue/realtime` | SSE 폴링으로 대기열 실시간 확인 |
| 대기열 수동 수정 | PUT | `/dashboard/queue/{queueId}` | 지연/완료 상태 수동 변경 |
| 대기 알람 설정 | PUT | `/dashboard/queue/alert-settings` | 지연 30분 이상 시 경고 표시 설정 |
| 부서별 대기 현황 | GET | `/dashboard/queue/by-department` | 진료과별 대기 현황 필터링 |
| **대기열 로그 조회** | **GET** | **`/dashboard/queue/logs`** | **기간/부서/환자별 상태 변경 이력 조회** |
| **대기열 수정** | **PUT** | **`/dashboard/queue/{queueId}`** | **대기 순서 변경 및 우선순위 조정** |
| **환자 호출** | **POST** | **`/dashboard/queue/call-patient`** | **환자 호출 푸시 알림 발송** |
| **긴급환자 표시** | **PUT** | **`/dashboard/queue/{queueId}/priority`** | **응급, 노약자 등 우선순위 태깅** |
| **누락환자 감지** | **GET** | **`/dashboard/queue/missing-patients`** | **장기 대기자나 태그 미통과자 식별** |

## 🚨 알림 및 모니터링 (Super/Dept-Admin)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 실시간 병원 현황 | GET | `/dashboard/monitor/hospital-status` | 부서별 환자 현황 및 대기 인원 시각화 |
| 시스템 알림 조회 | GET | `/dashboard/monitor/system-alerts` | 검사 누락, 이탈, 지연 감지 알림 |
| 혼잡도 예측 조회 | GET | `/dashboard/monitor/congestion-forecast` | LSTM 기반 시간대별 혼잡도 예측 |
| 접수 현황 관리 | GET | `/dashboard/monitor/reception` | 실시간 접수 환자 명단 확인 |
| 공지사항 발송 | POST | `/dashboard/announcements` | 병원 공지 FCM/웹소켓 전송 |

## 📊 감사 로그 (Super-Admin 전용)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 감사 로그 조회 | GET | `/dashboard/audit/logs` | 태그/콘텐츠/대기열 수정 내역 열람 |
| 로그 필터링 | GET | `/dashboard/audit/logs/filter` | 24시간 필터, 이벤트 타입별 조회 |
| 로그 내보내기 | GET | `/dashboard/audit/export` | CSV 형태로 감사 로그 다운로드 |
| 사용자 접근 로그 | GET | `/dashboard/audit/user-access` | 로그인/권한변경 이력 추적 |

## ⚙️ 시스템 설정 (Super-Admin 전용)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| SMTP 설정 | PUT | `/dashboard/settings/smtp` | 이메일 발송 SMTP 계정 설정 |
| QR URL 설정 | PUT | `/dashboard/settings/qr-prefix` | QR 코드 URL 프리픽스 설정 |
| 시스템 재시작 | POST | `/dashboard/settings/restart` | 설정 변경 후 앱 재시작 |
| 백업 설정 | PUT | `/dashboard/settings/backup` | 데이터 백업 정책 설정 |

---

# 🔗 외부 연동 및 AI 서비스

## 🔗 외부 연동 (External Integration)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| EMR 데이터 동기화 | POST | `/api/v1/integration/emr/sync` | 병원 EMR/HIS 시스템과 실시간 데이터 동기화 |
| EMR 예약 조회 | GET | `/api/v1/integration/emr/appointments` | EMR 시스템에서 예약 정보 Read-Only 조회 |
| 가상 DB 동기화 | POST | `/api/v1/integration/virtual-db/sync` | EMR과 가상 중계 DB 간 동기화 |
| 카카오톡 링크 전송 | POST | `/api/v1/integration/kakao/send-link` | 카카오톡 '나에게 보내기'로 일정 전송 |
| 구글 캘린더 연동 | POST | `/api/v1/integration/calendar/google` | 구글 캘린더 일정 등록 |
| 네이버 캘린더 연동 | POST | `/api/v1/integration/calendar/naver` | 네이버 캘린더 일정 등록 |
| Deep Link 처리 | GET | `/api/v1/integration/deeplink/{hospitalApp}` | 병원 앱 Deep Link 자동 실행 |

## 🧪 시연용 테스트 API (Test Demonstration)

시연 및 데모를 위한 가상 EMR 테스트 환경 API입니다. 실제 EMR 시스템과 연동하지 않고 독립적으로 동작합니다.

| 이름 | 타입 | URL | 설명 | Role |
| --- | --- | --- | --- | --- |
| 테스트 환자 목록 조회 | GET | `/api/v1/test/patients` | 시연용 테스트 환자 목록 및 상태 조회 | Public |
| 환자 상태 변경 | PUT | `/api/v1/test/patient-state` | 특정 환자의 상태 수동 변경 (9단계 상태) | Public |
| 큐 상태 변경 | PUT | `/api/v1/test/queue-state` | 큐 상태 변경 시 환자 상태 자동 연동 | Public |
| 환자 흐름 시뮬레이션 | POST | `/api/v1/test/simulate` | 환자 상태 자동 진행 시뮬레이션 | Public |
| 모든 환자 초기화 | POST | `/api/v1/test/reset` | 모든 테스트 환자 상태를 REGISTERED로 초기화 | Public |
| 사용 가능한 검사 목록 | GET | `/api/v1/test/available-exams` | 환자에게 추가 가능한 검사/진료 목록 조회 | Public |
| 환자에게 검사 추가 | POST | `/api/v1/test/add-exam` | 특정 환자에게 검사/진료 추가 (오늘/내일/어제) | Public |

### 테스트 API 사용 예시

#### 환자 상태 변경
```bash
PUT /api/v1/test/patient-state
Content-Type: application/json

{
  "user_id": "e79a0b74-3aba-4149-9f74-0bb5791a6ee6",
  "new_state": "WAITING"
}
```

#### 큐 상태 변경 (환자 상태 자동 연동)
```bash
PUT /api/v1/test/queue-state
Content-Type: application/json

{
  "queue_id": "queue-001",
  "new_state": "called"
}
```

#### 환자에게 검사 추가
```bash
POST /api/v1/test/add-exam
Content-Type: application/json

{
  "user_id": "e79a0b74-3aba-4149-9f74-0bb5791a6ee6",
  "exam_id": "exam-xray-001",
  "scheduled_for": "today"  // "today", "tomorrow", "yesterday"
}
```

## 🤖 AI 예측 모델 (AI Models)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| LSTM 혼잡도 예측 | POST | `/api/v1/ai/congestion/predict` | 현재 접수 수 및 과거 데이터 기반 혼잡도 예측 |
| 대기시간 예측 모델 | POST | `/api/v1/ai/waiting-time/predict` | 대기행렬 이론 기반 예상 대기시간 계산 |
| 모델 학습 데이터 수집 | POST | `/api/v1/ai/training/collect-data` | 비식별화된 환자 로그 데이터 수집 |
| 예측 정확도 분석 | GET | `/api/v1/ai/model/accuracy` | AI 예측 모델의 정확도 분석 |
| BERT 자연어 처리 | POST | `/api/v1/ai/nlp/process` | 의료 용어 자연어 처리 및 쉬운 설명 변환 |

## 💬 피드백 시스템 (Feedback)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 만족도 평가 제출 | POST | `/api/v1/feedback/satisfaction` | 검사 종료 후 5점 척도 만족도 평가 |
| 상세 피드백 제출 | POST | `/api/v1/feedback/detailed` | 장점/단점 상세 피드백 입력 |
| 개선 제안 제출 | POST | `/api/v1/feedback/suggestions` | 서비스 개선 제안 접수 |
| 피드백 진행상황 | GET | `/api/v1/feedback/progress/{feedbackId}` | 제출한 피드백의 처리 진행상황 조회 |

### 관리자 전용 피드백 관리

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 피드백 관리 | GET | `/api/v1/dashboard/feedback/manage` | 사용자 피드백 수집 및 분류 |
| 피드백 통계 | GET | `/api/v1/dashboard/feedback/stats` | 부서별 개선점 통계 및 조치 상태 추적 |

## 📈 분석 및 통계 (Analytics)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 환자 동선 분석 | GET | `/api/v1/analytics/patient-flow` | 환자 이동 패턴 및 체류 시간 분석 |
| 대기시간 통계 | GET | `/api/v1/analytics/waiting-time` | 검사별 평균 대기시간 및 트렌드 |
| 혼잡도 히트맵 | GET | `/api/v1/analytics/congestion-heatmap` | 시간대별 혼잡 구간 히트맵 |
| 챗봇 질문 분석 | GET | `/api/v1/analytics/chatbot-queries` | 챗봇 질문 유형 및 빈도 분석 |
| NFC 태그 사용 통계 | GET | `/api/v1/analytics/nfc-usage` | 태그별 스캔 횟수 및 사용률 |
| 병목 구간 식별 | GET | `/api/v1/analytics/bottlenecks` | 환자 흐름 병목 구간 시각화 |
| 커스텀 보고서 생성 | POST | `/api/v1/analytics/custom-report` | 사용자 정의 보고서 템플릿 |
| 데이터 내보내기 | GET | `/api/v1/analytics/export` | 통계 데이터 Excel/PDF 내보내기 |

## 🔒 보안 및 개인정보 (Security & Privacy)

| 이름 | 타입 | URL | 설명 |
| --- | --- | --- | --- |
| 개인정보 처리방침 | GET | `/api/v1/privacy/policy` | 개인정보 처리방침 조회 |
| 동의 이력 관리 | GET | `/api/v1/privacy/consent-history` | 개인정보 처리 동의 이력 조회 |
| 데이터 삭제 요청 | POST | `/api/v1/privacy/data-deletion` | 개인정보 삭제 요청 (GDPR 준수) |
| 비식별화 처리 | POST | `/api/v1/privacy/anonymize` | 개인정보 비식별화 처리 |
| 암호화 상태 확인 | GET | `/api/v1/security/encryption-status` | AES-256-GCM 암호화 상태 확인 |
| 접근 로그 조회 | GET | `/api/v1/security/access-logs` | 개인정보 접근 기록 조회 |
| 보안 감사 | POST | `/api/v1/security/audit` | 시스템 보안 상태 감사 |

## 🌐 실시간 갱신

WebSocket을 통한 실시간 데이터 업데이트를 지원합니다.

- `ws://api.nfc-hospital.kr/ws/queue/` : 환자 대기 상태 실시간 업데이트
- `ws://api.nfc-hospital.kr/ws/admin/` : 관리자 대시보드 실시간 모니터링

---

# 🚀 API 사용 예시

## 1. 환자 로그인 및 NFC 스캔

### 간편 로그인

```bash
POST /api/v1/auth/simple-login
Content-Type: application/json

{
  "phoneLast4": "1234",
  "birthDate": "900101"
}

```

### NFC 태그 스캔

```bash
POST /api/v1/nfc/scan/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "tagId": "nfc_001",
  "timestamp": "2025-08-09T10:30:00Z"
}

```

## 2. 관리자 대기열 관리

### 실시간 대기열 조회 (SSE)

```bash
GET /api/v1/dashboard/queue/realtime
Authorization: Bearer {jwt_token}
Accept: text/event-stream

```

### 환자 호출

```bash
POST /api/v1/dashboard/queue/call-patient
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "queueId": "queue_001",
  "message": "김환자님 X-ray실로 입장해주세요"
}

```

## 3. AI 챗봇 질의

### 텍스트 질문

```bash
POST /api/chatbot/query
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "question": "CT 검사 전에 물 마셔도 되나요?",
  "context": {
    "currentLocation": "ct_room_entrance",
    "patientExam": "ct_abdomen"
  }
}

```

### 음성 질문

```bash
POST /api/chatbot/voice-query
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "audioData": "base64_encoded_audio",
  "format": "wav"
}

```

---