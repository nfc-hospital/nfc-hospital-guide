# 🚀 WebSocket 통합 서버 가이드

## ✅ 현재 구현 상태

이 프로젝트는 **Django Channels + Daphne**를 사용하여 **HTTP + WebSocket 통합 서버**를 실행하고 있습니다.

### 🔧 서버 구성

- **HTTP**: Django REST API
- **WebSocket**: 실시간 업데이트
- **통합 서버**: Daphne ASGI 서버

## 📋 사용법

### 1. 통합 서버 실행

```bash
# 모든 서버 (Django+WebSocket, React, Admin) 동시 실행
npm run dev

# 또는 개별 실행
npm run dev:backend  # Django + WebSocket 서버만
npm run dev:frontend # React 개발 서버만
npm run dev:admin    # Admin 대시보드만
```

### 2. WebSocket 엔드포인트

- **대기열 실시간 업데이트**: `ws://localhost:8000/ws/queue/{queue_id}/`
- **관리자 대시보드**: `ws://localhost:8000/ws/admin/dashboard/`
- **NFC 모니터링**: `ws://localhost:8000/ws/nfc/monitoring/`

### 3. 테스트 방법

```bash
# WebSocket 연결 테스트
npm run dev:ws-test

# 브라우저에서 테스트
# 개발자 도구 → Console
const ws = new WebSocket('ws://localhost:8000/ws/queue/test/');
ws.onopen = () => console.log('연결됨');
ws.onmessage = (e) => console.log('메시지:', JSON.parse(e.data));
```

## 🎯 특징

### ⚡ 실시간 기능

1. **대기열 상태 실시간 업데이트**
2. **관리자 대시보드 실시간 모니터링**
3. **NFC 태그 스캔 즉시 알림**
4. **환자 호출 시스템**

### 🔒 보안

- **인증 기반 WebSocket 연결**
- **권한별 접근 제어**
- **자동 재연결 기능**

### 📊 모니터링

- **연결 상태 실시간 확인**
- **메시지 로깅**
- **에러 핸들링**

## 🔧 개발자 도구

### 스크립트 설명

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | **통합 서버 + 프론트엔드 모두 실행** |
| `npm run dev:backend` | Django + WebSocket 서버 (Daphne) |
| `npm run dev:backend:simple` | Django 개발 서버만 (WebSocket 없음) |
| `npm run dev:frontend` | React 개발 서버 |
| `npm run dev:admin` | Admin 대시보드 |
| `npm run dev:ws-test` | WebSocket 연결 테스트 |

### 크로스 플랫폼 지원

- **Windows**: `npm run dev` (기본)
- **Linux/Mac**: `npm run dev:backend:unix` 사용

## 🐛 트러블슈팅

### WebSocket 연결 실패

1. **방화벽 확인**: Port 8000 열려있는지 확인
2. **Daphne 실행 확인**: `npm run dev:backend` 로그 확인
3. **브라우저 콘솔**: WebSocket 에러 메시지 확인

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /PID [PID번호] /F
```

## 📝 로그 예시

정상적으로 실행되면 다음과 같은 로그가 표시됩니다:

```
✅ Starting Django + WebSocket server...
✅ Channels import 성공
✅ ASGI application 설정 완료
HTTP/2 and HTTP/3 enabled
Listening on TCP address 0.0.0.0:8000
```

## 🔗 관련 파일

- **ASGI 설정**: `backend/nfc_hospital_system/nfc_hospital_system/asgi.py`
- **WebSocket 라우팅**: `backend/nfc_hospital_system/nfc_hospital_system/routing.py`
- **Consumer**: `backend/nfc_hospital_system/p_queue/consumers.py`
- **Frontend Service**: `frontend-pwa/src/services/websocketService.js`