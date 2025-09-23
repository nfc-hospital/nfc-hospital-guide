# 🏥 NFC + AI 기반 병원 검사·진료 안내 시스템

> 처음 방문하는 병원에서 길을 잃지 않도록, NFC 태그 터치 한 번으로 안내합니다.

<div align="center">

[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[문제 인식](#-문제-인식) • [해결 방법](#-해결-방법) • [주요 기능](#-주요-기능) • [기술 스택](#-기술-스택) • [시작하기](#-시작하기)

</div>

---

## 📋 프로젝트 소개

처음 방문하는 병원에서 "어디로 가야 하지?", "지금 얼마나 기다려야 하지?"라는 막연한 불안감을 느껴보신 적 있으신가요?

저희는 NFC 태그와 AI 기술을 활용해 이런 불편함을 개선하고자 합니다. 앱 설치 없이 스마트폰으로 벽면의 태그를 터치하면, 현재 위치와 다음 할 일을 바로 확인할 수 있습니다.

---

## 💡 문제 인식

### 환자가 겪는 어려움

#### 1. 병원 절차를 모름
- 처음 가는 병원에서 접수를 어떻게 해야 할지 몰라 헤맴
- 안내데스크를 찾아다니며 시간 낭비

#### 2. 길찾기 어려움
- "B동 2층 201호" 같은 안내를 받아도 찾기 어려움
- 복잡한 건물 구조, 여러 층과 복도
- 표지판이 있어도 현재 위치를 몰라서 소용없음

#### 3. 전체 일정 파악 안 됨
- 여러 검사를 받으며 "이제 뭘 해야 하지?" 반복
- 대기 시간을 몰라 불안함
- 전체 여정 중 어디쯤인지 감이 안 옴

### 의료진이 겪는 어려움

- 같은 질문에 하루 수십 번 반복 답변 ("○○과 어디예요?")
- 환자 호출했는데 위치 파악 안 됨
- 수동으로 대기열 관리하며 업무 과중

---

## 🎯 해결 방법

### 핵심 아이디어: NFC 태그 스캔 → 즉시 안내

```
벽면의 NFC 태그 터치
        ↓
2초 만에 웹앱 실행
        ↓
현재 위치 기반 맞춤 안내
```

### 환자에게 제공하는 것

**1. 진행률 시각화**
```
━━━━━━◉━━━━━━━━  50%
접수 대기 혈액 X-ray 진료 수납
          (현재)

"5단계 중 3단계 완료"
"다음: X-ray (B동 2층)"
```

**2. 실시간 길안내**
- 현재 위치에서 다음 장소까지 경로 표시
- 실내 지도 + 화살표
- 음성 안내 옵션

**3. 대기 정보**
- 현재 대기 인원
- 예상 대기 시간 (AI 예측)
- 5분 전 자동 알림

**4. 검사 준비사항**
- 금식 여부
- 탈의 필요
- 주의사항

**5. AI 챗봇**
- 24시간 질문 가능
- 위치 기반 맞춤 답변

### 간호사에게 제공하는 것

**통합 관리 대시보드**
- 실시간 대기열 현황
- 환자 위치 추적
- AI 병목 구간 분석
- 원클릭 환자 호출

---

## ✨ 주요 기능

### 📱 환자용 PWA

#### 전체 여정 관리
- 오늘 할 일 목록 자동 생성
- 진행률 실시간 업데이트
- 다음 단계 자동 안내

#### 위치 기반 안내
- NFC 태그로 현재 위치 파악
- 목적지까지 실내 경로 안내
- 엘리베이터/계단 옵션 선택

#### 스마트 대기 관리
- LSTM 기반 개인별 대기시간 예측
- WebSocket 실시간 순번 업데이트
- 호출 5분 전 자동 알림

#### AI 의료 챗봇
- 검사 관련 질문 자동 응답
- 위치·상태 고려한 맞춤 답변
- 다국어 지원 (한/영/중/일)

### 👨‍⚕️ 관리자 대시보드

#### 실시간 모니터링
```
부서별 현황
- 외래 1번: 12명 대기 (평균 15분)
- X-ray: 8명 대기 (평균 20분)
- 채혈실: 5명 대기 (평균 8분)
```

#### AI 분석 (참고용)
- 병목 구간 예측
- 환자 분산 제안
- 최적화 추천

---

## 🛠 기술 스택

### Frontend
```yaml
Framework: React 18
Build Tool: Vite
State: Zustand
Styling: Tailwind CSS
PWA: Service Worker, Web Manifest
NFC: Web NFC API (NDEF)
```

### Backend
```yaml
Framework: Django 4.2, Django REST Framework
Real-time: Django Channels, WebSocket
Server: Gunicorn (WSGI), Daphne (ASGI)
Proxy: Nginx
Process Manager: PM2
```

### Database
```yaml
Main DB: MySQL 8.0 (AWS RDS)
ORM: Django ORM
Cache: Redis (선택사항)
```

### AI & ML
```yaml
Chatbot: OpenAI GPT-4o API
Prediction: LSTM (TensorFlow/Keras)
AI Server: Flask
```

### Infrastructure
```yaml
Cloud: AWS
- EC2 (t3.small)
- RDS (db.t3.micro)
- S3 (정적 파일)
- CloudFront (CDN)

CI/CD: GitHub Actions
```

### Security
```yaml
Auth: JWT (1시간 만료)
Encryption: AES-256-GCM
Protocol: HTTPS/TLS 1.3
Protection: Django CSRF, CORS
```

---

## 🚀 시작하기

### 사전 요구사항

```bash
Node.js 18+
Python 3.12+
MySQL 8.0+
```

### 설치 및 실행

#### 1. 저장소 클론
```bash
git clone https://github.com/your-team/nfc-hospital-system.git
cd nfc-hospital-system
```

#### 2. Backend 설정
```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일 편집 (DB, AWS, OpenAI API 키 등)

# 데이터베이스 마이그레이션
python manage.py migrate

# 관리자 계정 생성
python manage.py createsuperuser

# 서버 실행
python manage.py runserver
```

#### 3. Frontend 설정
```bash
cd ../frontend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# API URL 등 설정

# 개발 서버 실행
npm run dev
```

#### 4. AI 챗봇 서버 (선택)
```bash
cd ../ai-server

pip install -r requirements.txt
python app.py
```

### 접속 주소

- **환자용 PWA**: http://localhost:5173
- **관리자 대시보드**: http://localhost:8000/admin

---

## 📊 시스템 구조

### 전체 아키텍처

```
환자 (스마트폰)
    ↓ NFC 태그 스캔
병원 내 NFC 태그
    ↓ HTTPS/REST API
AWS 클라우드
    ↓ READ-ONLY
EMR/HIS (기존 시스템)
```

### 보안 설계

**핵심 원칙: 기존 시스템 절대 보호**

```
❌ 금지
- EMR/HIS 수정
- NFC로 환자 상태 변경
- 기존 업무 프로세스 영향

✅ 허용
- EMR READ-ONLY 조회 (가상 DB 경유)
- 분석 및 추천만 제공
```

### 환자 상태 관리

```
미등록 → 도착 → 등록 → 대기 → 호출 → 진행중 → 완료 → 수납 → 종료

* 모든 상태 변경은 EMR에서만 발생
* NFC는 현재 상태 조회 + 안내만
```

---

## 📱 사용 예시

### 환자 시나리오

**STEP 1: 병원 도착**
```
입구 NFC 태그 스캔
    ↓
"1층 접수창구로 가세요"
[실내 지도 + 화살표]
```

**STEP 2: 접수 후**
```
로그인 (카카오톡)
    ↓
오늘 일정 확인
━━◉━━━━━━━━
접수 혈액 X-ray 진료
```

**STEP 3: 길찾기**
```
복도 NFC 태그 스캔
    ↓
"채혈실까지 80m, 2분"
[경로 표시]
```

**STEP 4: 대기**
```
"현재 12명 대기"
"예상 18분"
```

**STEP 5: 다음 검사**
```
자동 전환
"✓ 채혈 완료"
"다음: X-ray"
```

---

## 🎯 기대 효과

### 비용 효율성

| 항목 | 기존 시스템 | 본 시스템 |
|------|------|------------|
| 초기 구축 | 키오스크 500만원 | NFC 태그 500원 |
| 유지보수 | 연 수백만원 | 거의 없음 |
| 전력 | 필요 | 불필요 |

### 사용자 경험

| 항목 | 개선 |
|------|------|
| 접근성 | 앱 설치 불필요 (2초 실행) |
| 편의성 | 위치 기반 자동 안내 |
| 불안감 | 진행률·대기시간 투명화 |

### 운영 효율

- 반복 질문 일부 자동화
- 환자 위치 실시간 파악
- 데이터 기반 병목 예측

*실제 효과는 병원 환경에 따라 다를 수 있습니다.

---

## 📚 API 문서

### 주요 엔드포인트

**인증**
- `POST /auth/login` - 간편 로그인
- `POST /auth/logout` - 로그아웃

**NFC**
- `GET /tags` - 태그 목록
- `POST /tags/scan` - 태그 스캔 처리

**대기열**
- `GET /queues` - 대기열 조회
- `GET /queues/my-status` - 내 순번

**AI**
- `POST /chatbot` - 챗봇 질문

---

## 📝 개발 과정

### 주요 일정

- **3-4월**: 기획 및 분석
- **5-6월**: 설계 및 프로토타입
- **7-8월**: 핵심 기능 개발
- **9월**: 테스트 및 피드백
- **10월**: 최종 완성

### 배운 점

- 사용자 중심 설계의 중요성
- 기존 시스템과의 안전한 통합
- 실무자 피드백의 가치

---

## 📜 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

## 🙏 감사의 말

- **한이음 ICT 멘토링** - 프로젝트 멘토링 및 지원
- **병원 관계자분들** - 실무 인터뷰 및 피드백
- **오픈소스 커뮤니티** - Django, React 등

---

<div align="center">

**2025년 한이음 프로젝트**

Made with ❤️ by 정지현 · 홍서윤 · 홍윤기

</div>
