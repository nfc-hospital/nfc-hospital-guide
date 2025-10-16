# 🔴 Frontend 환자 여정 데이터 흐름 문제점 요약

**작성일**: 2025년 10월 16일
**분석 범위**: 환자 여정 화면 라우팅 및 데이터 연결

---

## 📌 핵심 문제 요약

### 1️⃣ **화면 컴포넌트 중복 구조** (가장 시급)
```
/components/screens/        ← 원래 사용하던 파일들
  ├── UnregisteredScreen.jsx
  ├── ArrivedScreen.jsx
  ├── RegisteredScreen.jsx
  ├── WaitingScreen.jsx
  ├── PaymentScreen.jsx
  └── FinishedScreen.jsx

/components/journey/contents/  ← 리팩토링 중 새로 만든 파일들
  ├── UnregisteredContent.jsx
  ├── ArrivedContent.jsx
  ├── RegisteredContent.jsx
  ├── WaitingContent.jsx
  ├── PaymentContent.jsx
  └── FinishedContent.jsx
```

**현재 상황**:
- `Home.jsx` → `JourneyContainer` → **contents/** 사용 중
- **screens/** 파일들은 사용되지 않음 (orphaned)
- 두 세트의 일치도 및 screen 재사용 가능 여부 확인 필요

---

### 2️⃣ **FinishedScreen의 데이터 패턴 불일치**
**위치**: `frontend-pwa/src/components/screens/FinishedScreen.jsx:34-40`

```jsx
// ❌ 문제: 다른 화면과 다른 패턴
const { user, todaysAppointments, patientState, isLoading } = useJourneyStore();

// ✅ 다른 화면들은 props 사용
export default function ArrivedScreen({ user, todaysAppointments, patientState, ... })
```

**영향**:
- 데이터 계산 로직 중복
- JourneyContainer의 계산 결과와 불일치 가능
- 유지보수성 저하

---

### 3️⃣ **JourneyContainer의 props 전달 누락**
**위치**: `frontend-pwa/src/components/JourneyContainer.jsx:308`

```jsx
// ❌ 문제: Content에 아무 데이터도 전달하지 않음
mainContent={<Content />}

// ✅ 필요한 형태
mainContent={
  <Content
    user={user}
    todaysAppointments={todaysAppointments}
    patientState={currentState}
    completionStats={journeySummary}
    // ... 기타 필요한 props
  />
}
```

**영향**:
- Content 컴포넌트들이 데이터를 받지 못함
- 각 Content가 직접 store 호출할 수밖에 없음 (안티패턴)

---

### 4️⃣ **API 엔드포인트 불일치 가능성**
**위치**: `frontend-pwa/src/store/journeyStore.js:548, 552`

```javascript
// 코드에서 사용
api.get('/appointments/today')
queueAPI.getMyQueue()  // '/queue/my-current/' 호출

// API 명세서(api.md)
GET /api/v1/schedule/today        # 당일 일정 조회
GET /api/v1/queue/my-position     # 내 대기 순서 조회
```

**확인 필요**:
- Backend 라우팅 실제 구조
- `/appointments/today`가 실제로 작동하는지
- API 명세서와 실제 구현 불일치 여부

---

## 🎯 데이터 흐름 아키텍처

### 현재 구조
```
Home.jsx (환자 라우팅)
  ↓
JourneyContainer (상태별 화면 선택)
  ↓
Template (FormatA/FormatB) + Content (상태별 컴포넌트)
  ↓
❌ Content에 props 전달 안 됨
```

### 권장 구조
```
Home.jsx
  ↓
JourneyContainer (데이터 계산 + 통합)
  ├─ journeyStore에서 데이터 가져오기
  ├─ 계산된 값들 생성 (completionStats, journeySummary 등)
  └─ Template + Content에 props 전달
       ↓
Template + Content (props만 사용, store 직접 호출 금지)
```

---

## ✅ 수정 우선순위

### Priority 1 (즉시 수정)
1. **content vs screen 일치도 확인** 및 재사용 가능 여부 판단
2. **JourneyContainer에서 Content로 props 전달** 구현
3. **FinishedScreen/FinishedContent props 기반으로 통일**

### Priority 2 (중기)
1. API 엔드포인트 실제 경로 검증
2. 불필요한 화면 파일 세트 제거 (screens 또는 contents 중 하나)
3. 데이터 흐름 단방향 확립 (Store → Container → Components)

### Priority 3 (장기)
1. TypeScript 타입 정의 추가
2. Props 인터페이스 문서화
3. 컴포넌트별 책임 명확화 (Presentational vs Container)

---

## 📝 다음 작업

1. **content/**와 **screens/** 파일들 코드 비교
   - 일치율 확인
   - 차이점 분석
   - 재사용 가능 여부 판단

2. **screen 재사용 시나리오 분석**
   - 전체 리팩토링 필요한지
   - 단순히 JourneyContainer에서 import 경로만 변경하면 되는지

3. **API 엔드포인트 검증**
   - Backend 라우팅 확인
   - 실제 작동하는 경로 확인

---

## 🔍 참고 파일 경로

### Frontend
- `frontend-pwa/src/pages/Home.jsx`
- `frontend-pwa/src/components/JourneyContainer.jsx`
- `frontend-pwa/src/store/journeyStore.js`
- `frontend-pwa/src/api/apiService.js`
- `frontend-pwa/src/api/patientJourneyService.js`

### 화면 컴포넌트
- `frontend-pwa/src/components/screens/`
- `frontend-pwa/src/components/journey/contents/`

### Template 컴포넌트
- `frontend-pwa/src/components/templates/FormatATemplate.jsx`
- `frontend-pwa/src/components/templates/FormatBTemplate.jsx`

### API 명세
- `docs/api/api.md`

---

## 💡 해결 방향

**추천 접근**:
1. **screens/** 폴더의 파일들을 **contents/**로 통합
2. JourneyContainer에서 모든 데이터 계산 후 props 전달
3. Content 컴포넌트들은 순수하게 props만 사용 (store 직접 호출 금지)
4. 데이터 흐름: Store → Container (계산) → Components (렌더링)

이렇게 하면:
- 데이터 흐름이 명확해짐
- 테스트 용이성 증가
- 유지보수성 향상
- 버그 추적 쉬워짐
