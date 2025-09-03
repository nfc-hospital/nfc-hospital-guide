# 챗봇 시스템 개선 사항

## 📋 개선 내역 (v2.0.0)

### 1. 🧠 컨텍스트 관리 시스템
- **ContextManager**: Django API와 연동하여 실시간 환자 정보 조회
  - 환자 상태 9단계 인식
  - 대기열 정보 실시간 반영
  - 예약 정보 연동
  - 병원 정보 통합 제공

### 2. 🎯 의도 분류 시스템
- **IntentClassifier**: 질문 의도 자동 분류
  - 12개 카테고리 분류 (응급, 대기, 위치, 준비사항 등)
  - 신뢰도 및 긴급도 계산
  - 엔티티 추출 (층수, 건물, 시간 등)
  - GPT 사용 여부 자동 결정

### 3. 🏥 의료 안전 필터
- 의료법 준수를 위한 안전장치
  - 금지 주제 자동 차단
  - 면책조항 자동 추가
  - 응급 상황 우선 처리
  - 의료 조언 제한

### 4. 💾 캐싱 시스템
- Flask-Caching 도입
  - FAQ 응답 캐싱 (10분)
  - 병원 정보 캐싱
  - 실시간 데이터는 캐싱 제외
  - Redis 지원 준비

### 5. 📊 구조화된 응답
- 타입별 전용 응답 생성
  - 대기열 카드
  - 위치 안내 (지도 링크 포함)
  - 편의시설 그리드
  - 수납 정보
  - 응급 알림

### 6. 🔗 Django 통합
- JWT 인증 연동
- 실시간 API 호출
  - `/api/v1/auth/profile/` - 프로필 조회
  - `/api/v1/queue/my-position` - 대기열 조회
  - `/api/v1/appointments/today` - 당일 예약 조회

## 🚀 사용 방법

### 설치
```bash
cd chatbot-server
pip install -r requirements.txt
```

### 환경 변수 설정
```env
# .env 파일
OPENAI_API_KEY=your_api_key_here
DJANGO_API_URL=http://localhost:8000
FLASK_ENV=development
PORT=5000
```

### 실행
```bash
# 기본 실행
npm run dev:chatbot

# 향상된 버전 실행
npm run dev:chatbot:enhanced

# 개발 모드 (모든 서비스)
npm run dev
```

## 📡 API 엔드포인트

### 주요 엔드포인트
- `POST /api/chatbot/query` - 챗봇 질문 처리
- `GET /api/chatbot/suggestions` - 상황별 추천 질문
- `GET /api/chatbot/faq` - FAQ 목록
- `GET /health` - 헬스체크

### 요청 예시
```javascript
// 챗봇 질문
POST /api/chatbot/query
{
  "question": "대기 시간이 얼마나 되나요?",
  "context": {
    "userId": "user123",
    "patientState": "WAITING",
    "currentLocation": "본관 2층"
  }
}

// 응답
{
  "success": true,
  "data": {
    "messageId": "msg-1234567890",
    "type": "queue_status",
    "urgency": "high",
    "content": "현재 대기 상태: ...",
    "disclaimer": "※ 예상 시간은 변동될 수 있습니다",
    "confidence": 0.95,
    "actions": [...],
    "suggestions": [...]
  }
}
```

## 🎨 프론트엔드 통합

### 향상된 API 클라이언트
```javascript
import { enhancedChatbotAPI } from './utils/enhancedChatbotAPI';

// 질문 전송
const response = await enhancedChatbotAPI.sendQuery(
  "검사실 위치가 어디인가요?",
  {
    userId: user.id,
    patientState: patientState,
    currentQueues: queues,
    appointments: appointments
  }
);

// 구조화된 메시지로 변환
const message = formatMessageForDisplay(response);
```

## 📈 성능 개선

### Before (v1.0)
- 응답 시간: 2-3초
- Fallback 의존도: 80%
- 컨텍스트 인식: 없음
- 캐싱: 없음

### After (v2.0)
- 응답 시간: 0.5-1초 (캐싱 적중 시)
- Fallback 의존도: 20%
- 컨텍스트 인식: 환자 상태 기반
- 캐싱: FAQ 및 정적 정보

## 🔍 디버깅

### 로그 확인
```bash
# Flask 로그
tail -f chatbot-server/app.log

# 의도 분류 확인
curl -X POST http://localhost:5000/api/chatbot/query \
  -H "Content-Type: application/json" \
  -d '{"question": "응급실 어디야?"}'
```

### 캐시 상태 확인
- SimpleCache: 메모리 기반 (개발)
- Redis: `redis-cli monitor` (운영)

## 📝 추가 개선 계획

### Phase 3 (예정)
- [ ] WebSocket 실시간 알림
- [ ] 음성 입출력 (TTS/STT)
- [ ] 다국어 지원
- [ ] 대화 기록 저장
- [ ] 피드백 수집
- [ ] A/B 테스트

## 🚨 주의사항

1. **API 키 보안**: 절대 Git에 커밋하지 마세요
2. **의료법 준수**: 진단/처방 관련 응답 금지
3. **개인정보**: 로그에 개인정보 기록 금지
4. **부하 테스트**: 운영 전 필수

## 📞 문의

문제 발생 시:
- GitHub Issues 생성
- 관리자 문의