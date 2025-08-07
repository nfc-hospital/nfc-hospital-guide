# OpenAI API 설정 가이드

## 중요: 즉시 테스트 가능

OpenAI API 키 없이도 챗봇을 테스트할 수 있습니다!
- `npm run dev`로 실행하면 자동으로 **폴백 모드**로 동작
- 미리 정의된 병원 안내 응답 제공
- OpenAI 설정 후 `npm run dev:chatbot:openai`로 고급 기능 사용

---

챗봇 서버에서 OpenAI API를 사용하려면 API 키가 필요합니다.

## 1. OpenAI API 키 발급

1. [OpenAI 플랫폼](https://platform.openai.com)에 접속
2. 계정 생성 또는 로그인
3. API Keys 메뉴 접속: https://platform.openai.com/api-keys
4. "Create new secret key" 클릭
5. 키 이름 입력 (예: "NFC Hospital Chatbot")
6. 생성된 API 키 복사 (한 번만 표시되므로 반드시 저장)

## 2. 환경변수 설정

### 챗봇 서버 설정

1. `chatbot-server` 디렉토리로 이동
```bash
cd chatbot-server
```

2. `.env` 파일 생성
```bash
cp .env.example .env
```

3. `.env` 파일 편집
```env
# OpenAI API 키 입력
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 서버 포트 (기본값: 5000)
PORT=5000

# 개발/운영 환경
FLASK_ENV=development
```

## 3. API 사용량 관리

### 요금 확인
- OpenAI 대시보드: https://platform.openai.com/usage
- GPT-3.5-turbo 모델 사용 (가장 경제적)
- 1,000 토큰당 약 $0.0015

### 사용량 제한 설정
1. OpenAI 대시보드에서 "Billing" 메뉴 접속
2. "Usage limits" 설정
3. Monthly budget 설정 (예: $10)

### 프로젝트에서 사용량 최적화
- 짧고 명확한 프롬프트 사용
- 응답 길이 제한 (max_tokens: 500)
- 캐싱 구현 고려

## 4. 보안 주의사항

### 절대 하지 말아야 할 것
- API 키를 GitHub에 커밋하지 마세요
- 프론트엔드 코드에 API 키를 넣지 마세요
- API 키를 다른 사람과 공유하지 마세요

### 권장사항
- `.env` 파일은 반드시 `.gitignore`에 포함
- 프로덕션 환경에서는 환경변수로 관리
- 정기적으로 API 키 교체

## 5. 테스트

1. 챗봇 서버 실행
```bash
cd chatbot-server
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py
```

2. 테스트 스크립트 실행
```bash
python test_server.py
```

## 6. 문제 해결

### "Invalid API Key" 오류
- API 키가 올바른지 확인
- 키 앞뒤 공백 제거
- 새 키 생성 시도

### "Rate limit exceeded" 오류
- 무료 계정: 분당 3개 요청 제한
- 유료 계정 업그레이드 고려
- 요청 간격 조정

### "Insufficient quota" 오류
- 크레딧 잔액 확인
- 결제 정보 등록 필요

## 7. 추가 리소스

- [OpenAI API 문서](https://platform.openai.com/docs)
- [요금 정책](https://openai.com/pricing)
- [Best Practices](https://platform.openai.com/docs/guides/best-practices)