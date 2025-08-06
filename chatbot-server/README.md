# 챗봇 서버 (Flask + OpenAI)

NFC 병원 검사·진료 안내 시스템의 AI 챗봇 서버입니다.

## 🚀 시작하기

### 1. Python 가상환경 설정

```bash
# 가상환경 생성 (프로젝트 최초 설정 시)
python3 -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. 의존성 설치

```bash
# 가상환경 활성화된 상태에서 실행
pip install -r requirements.txt
```

### 3. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일을 열어 다음 값들을 설정하세요:

```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=your_openai_api_key_here

# 서버 포트 (기본값: 5000)
PORT=5000

# 개발/운영 환경 설정
FLASK_ENV=development
```

### 4. 서버 실행

```bash
# 개발 모드로 실행
python app.py

# 또는 운영 모드로 실행 (gunicorn 사용)
gunicorn -b 0.0.0.0:5000 app:app
```

## 📡 API 엔드포인트

### 헬스 체크
```
GET /health
```

### 챗봇 질의
```
POST /api/chatbot/query
Content-Type: application/json

{
  "question": "X-ray 검사는 얼마나 걸리나요?",
  "context": {
    "currentLocation": "x_ray_room",
    "patientExam": "chest_xray"
  }
}
```

### FAQ 목록
```
GET /api/chatbot/faq
```

### 추천 질문
```
GET /api/chatbot/suggestions
```

## 🧪 테스트

```bash
# 서버가 실행중인 상태에서 다른 터미널에서 실행
python test_server.py
```

## 📦 주요 의존성

- **Flask**: 웹 프레임워크
- **OpenAI**: GPT API 연동
- **Flask-CORS**: CORS 처리
- **python-dotenv**: 환경변수 관리
- **gunicorn**: 운영 서버

## 🔧 문제 해결

### 가상환경 활성화 확인
```bash
# 활성화 여부 확인 (프롬프트에 (venv) 표시)
which python
# 출력: .../chatbot-server/venv/bin/python
```

### OpenAI API 키 오류
- `.env` 파일에 올바른 API 키가 설정되어 있는지 확인
- OpenAI 계정의 API 사용량 한도 확인

### 포트 충돌
- 5000번 포트가 이미 사용중인 경우 `.env`의 PORT 값 변경

## 📝 개발 노트

- 모든 응답은 `/docs/api/api.md`의 API 명세를 따릅니다
- 의료 정보는 정확하게 전달하되, 진단이나 치료 조언은 하지 않습니다
- 환자 개인정보는 로그에 남기지 않습니다