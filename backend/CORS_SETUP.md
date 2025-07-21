# Django CORS 및 React 연동 설정 가이드

## 🎯 개요

Django 백엔드와 React PWA 프론트엔드를 연결하여, Django 서버만 실행하면 React 앱에 접근할 수 있도록 설정했습니다.

## 🚀 빠른 시작

### 1. 필요한 디렉토리 생성
```bash
cd backend/nfc_hospital_system
python create_dirs.py
```

### 2. 환경 변수 설정
```bash
cd backend
cp .env.example .env
# .env 파일을 열어 필요한 값 설정
```

### 3. Django 서버 실행
```bash
cd backend/nfc_hospital_system
python manage.py runserver
```

### 4. 접속 방법

#### 개발 환경 (Development)
- **Django API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/
- **React App**: 
  - 빌드된 경우: http://localhost:8000/
  - 개발 서버 실행 중: http://localhost:5173/

#### 프로덕션 환경 (Production)
- React 앱을 먼저 빌드해야 합니다:
  ```bash
  cd frontend-pwa
  npm run build
  ```

## 📋 CORS 설정 상세

### 환경별 설정

#### 1. 개발 환경 (`settings/development.py`)
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",      # React Admin Dashboard
    "http://localhost:5173",      # React PWA (Vite)
    "http://localhost:5000",      # Flask Chatbot Server
]
```

**특징:**
- 로컬 개발 서버들 간의 통신 허용
- 상세한 CORS 에러 로깅
- 프리플라이트 요청 최적화

#### 2. 운영 환경 (`settings/production.py`)
```python
CORS_ALLOWED_ORIGINS = [
    "https://hospital.example.com",
    "https://admin.hospital.example.com",
    "https://api.hospital.example.com",
]
```

**특징:**
- HTTPS 강제
- 승인된 도메인만 허용
- 보안 헤더 추가
- 프리플라이트 캐시 7일

### 주요 CORS 헤더

1. **Access-Control-Allow-Origin**: 허용된 출처
2. **Access-Control-Allow-Credentials**: 쿠키/인증 정보 포함 허용
3. **Access-Control-Allow-Methods**: 허용된 HTTP 메서드
4. **Access-Control-Allow-Headers**: 허용된 요청 헤더
5. **Access-Control-Max-Age**: 프리플라이트 캐시 시간

## 🔧 커스터마이징

### 1. 새로운 도메인 추가

#### 개발 환경
```python
# settings/development.py
CORS_ALLOWED_ORIGINS.append("http://localhost:4000")
```

#### 운영 환경
`.env` 파일에 추가:
```
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

### 2. API별 CORS 정책 설정

`middleware/cors.py`에서 공개 API 엔드포인트 추가:
```python
public_endpoints = [
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/health/',
    '/api/your-new-endpoint/',  # 새 엔드포인트 추가
]
```

### 3. CORS 디버깅

#### 로그 확인
```bash
tail -f backend/nfc_hospital_system/logs/django.log
```

#### 브라우저 개발자 도구
1. Network 탭 열기
2. 요청 선택
3. Response Headers에서 CORS 헤더 확인

## 🛡️ 보안 고려사항

### 1. 프로덕션 체크리스트
- [ ] `CORS_ALLOW_ALL_ORIGINS = False` 확인
- [ ] HTTPS 사용 확인
- [ ] 필요한 도메인만 허용
- [ ] JWT 시크릿 키 변경
- [ ] CSRF 보호 활성화

### 2. 일반적인 문제 해결

#### CORS 에러 발생 시
1. 브라우저 콘솔에서 정확한 에러 메시지 확인
2. Django 로그 확인
3. 요청 Origin이 허용 목록에 있는지 확인
4. 프리플라이트 요청이 제대로 처리되는지 확인

#### JWT 인증과 CORS
```javascript
// React에서 API 호출 시
const response = await fetch('http://localhost:8000/api/endpoint/', {
    method: 'GET',
    credentials: 'include',  // 쿠키 포함
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
});
```

## 📊 성능 최적화

### 1. 프리플라이트 캐싱
- 개발: 24시간
- 운영: 7일

### 2. 정적 파일 서빙
- 개발: Django가 직접 서빙
- 운영: Nginx 또는 CDN 사용 권장

## 🚨 주의사항

1. **개발 환경에서만** `CORS_ALLOW_ALL_ORIGINS = True` 사용
2. **운영 환경**에서는 반드시 특정 도메인만 허용
3. **민감한 정보**가 CORS 헤더에 노출되지 않도록 주의
4. **정기적으로** 허용된 도메인 목록 검토

## 📚 참고 자료

- [Django CORS Headers 공식 문서](https://github.com/adamchainz/django-cors-headers)
- [MDN CORS 가이드](https://developer.mozilla.org/ko/docs/Web/HTTP/CORS)
- [Django REST Framework 인증](https://www.django-rest-framework.org/api-guide/authentication/)

## 💡 추가 기능

### CORS 유틸리티 함수
```python
from nfc_hospital_system.utils.cors_utils import (
    is_cors_enabled_for_url,
    get_cors_headers,
    validate_cors_settings,
    get_allowed_origins_for_display,
)
```

### 커스텀 미들웨어
- `CustomCorsMiddleware`: 상세한 CORS 로깅 및 디버깅
- `APIThrottleCorsMiddleware`: API 요청 제한 (구현 필요)