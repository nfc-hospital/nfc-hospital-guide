# 📊 Content vs Screen 파일 비교 분석

**분석일**: 2025년 10월 16일
**목적**: screen 폴더 재사용 가능 여부 및 수정 범위 결정

---

## 🔍 파일 구조 비교

### Content 파일 (현재 사용 중)
```
/components/journey/contents/
  ├── UnregisteredContent.jsx  (85줄)
  ├── ArrivedContent.jsx
  ├── RegisteredContent.jsx
  ├── WaitingContent.jsx       (106줄)
  ├── PaymentContent.jsx
  └── FinishedContent.jsx      (238줄)
```

### Screen 파일 (사용되지 않음)
```
/components/screens/
  ├── UnregisteredScreen.jsx   (168줄)
  ├── ArrivedScreen.jsx        (192줄)
  ├── RegisteredScreen.jsx     (37줄)
  ├── WaitingScreen.jsx        (84줄)
  ├── PaymentScreen.jsx        (85줄)
  ├── FinishedScreen.jsx       (717줄)
  └── AdminHomeScreen.jsx      (추가 파일)
```

---

## 🎯 핵심 차이점

### 1. **데이터 소스 패턴**

#### Content 파일들: **Store 직접 구독**
```jsx
// UnregisteredContent.jsx (라인 10-14)
const UnregisteredContent = () => {
  // 🎯 Store에서 필요한 데이터 직접 구독
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const taggedLocation = useLocationStore(state => state.getCurrentLocation());
  // ...
}

// WaitingContent.jsx (라인 11-18)
const WaitingContent = () => {
  // 🎯 Store에서 직접 구독
  const waitingScreenData = useJourneyStore(state => state.getWaitingScreenData());
  const { user, currentState } = useJourneyStore(state => ({
    user: state.user,
    currentState: state.patientState
  }));
  // ...
}

// FinishedContent.jsx (라인 11-17)
const FinishedContent = ({
  user,
  todaysAppointments = [],
  // ... props도 받지만
}) => {
  // fallback 데이터 사용 (라인 57-66)
  const fallbackUser = { name: '김환자' };
  const actualUser = user || fallbackUser;
  // ...
}
```

#### Screen 파일들: **Props 기반**
```jsx
// UnregisteredScreen.jsx (라인 7-15)
export default function UnregisteredScreen({
  taggedLocation,
  user,
  todaysAppointments = [],
  fetchJourneyData,
  nextSchedule,
  summaryCards
}) {
  // ✅ 모든 데이터를 props로 받음
}

// ArrivedScreen.jsx (라인 7-23)
export default function ArrivedScreen({
  taggedLocation,
  user,
  todaysAppointments = [],
  patientState,
  nextSchedule,
  summaryCards,
  completionStats,
  // ...
}) {
  // ✅ 모든 데이터를 props로 받음
}

// FinishedScreen.jsx (라인 34-40) ❌ 예외!
const {
  user,
  todaysAppointments = [],
  patientState,
  isLoading
} = useJourneyStore();  // Store 직접 호출
```

---

### 2. **코드 복잡도**

| 파일 | Screen (줄 수) | Content (줄 수) | 차이 | 비고 |
|------|---------------|----------------|------|------|
| Unregistered | 168 | 85 | **-83** | Screen이 훨씬 복잡 (ExamPreparationChecklist 포함) |
| Arrived | 192 | ? | ? | Content 파일 읽기 필요 |
| Registered | 37 | ? | ? | Screen이 매우 단순 |
| Waiting | 84 | 106 | **+22** | Content가 약간 복잡 |
| Payment | 85 | ? | ? | Content 파일 읽기 필요 |
| Finished | 717 | 238 | **-479** | Screen이 압도적으로 복잡 |

**결론**: Screen 파일들이 **훨씬 더 많은 기능**을 포함하고 있음

---

### 3. **Template 사용**

#### Screen 파일들
```jsx
// UnregisteredScreen.jsx (라인 139-164)
return (
  <>
    <FormatBTemplate
      screenType="unregistered"
      status="접수 전"
      nextSchedule={nextSchedule}
      summaryCards={summaryCards}
      todaySchedule={todaySchedule}
      actionButtons={[...]}
      taggedLocation={taggedLocation}
      preparationItems={preparationItems}
      customPreparationContent={customPreparationContent}
    />
    <RescheduleModal />
  </>
);
```

#### Content 파일들
```jsx
// UnregisteredContent.jsx (라인 24-81)
return (
  <div className="space-y-6">
    {/* 직접 JSX로 UI 렌더링 */}
    <div className="bg-blue-50 rounded-2xl p-6 text-center">
      {/* ... */}
    </div>
  </div>
);
```

**차이점**:
- **Screen**: Template 컴포넌트 사용 (FormatA/FormatB)
- **Content**: 순수 JSX 렌더링 (Template 없음)

---

## 🔧 수정 범위 분석

### ❌ **Screen 재사용 시 필요한 수정 (복잡)**

#### 수정 1: JourneyContainer에서 Screen import 변경
```jsx
// Before (현재)
import UnregisteredContent from './journey/contents/UnregisteredContent';

// After (screen 사용 시)
import UnregisteredScreen from './screens/UnregisteredScreen';
```

#### 수정 2: JourneyContainer에서 모든 props 전달
```jsx
// Before (현재)
mainContent={<Content />}  // ❌ props 없음

// After (screen 사용 시)
mainContent={
  <UnregisteredScreen
    taggedLocation={taggedLocation}
    user={user}
    todaysAppointments={todaysAppointments}
    fetchJourneyData={fetchJourneyData}
    nextSchedule={getNextScheduleText(...)}
    summaryCards={getSummaryCards(...)}
    // ... 각 Screen마다 필요한 모든 props
  />
}
```

#### 수정 3: Template과의 충돌 해결
**문제**: Screen 파일들은 이미 Template을 사용하고 있음
```jsx
// JourneyContainer 현재 구조
<Template
  ...
  mainContent={<Screen ... />}  // ❌ Screen 내부에도 Template이 있음!
/>
```

**해결 방법**:
1. **Option A**: Screen에서 Template 제거, 순수 JSX만 반환
2. **Option B**: JourneyContainer의 Template 제거, Screen의 Template만 사용

---

### ✅ **Content 계속 사용 시 필요한 수정 (간단)**

#### 수정 1: JourneyContainer에서 props 전달만 추가
```jsx
// 현재
mainContent={<Content />}

// 수정 후
mainContent={
  <Content
    user={user}
    todaysAppointments={todaysAppointments}
    patientState={currentState}
    completionStats={journeySummary}
    // ... 필요한 props만
  />
}
```

#### 수정 2: Content 파일들 수정
```jsx
// Before
const UnregisteredContent = () => {
  const user = useJourneyStore(state => state.user);  // ❌ 직접 구독
  // ...
}

// After
const UnregisteredContent = ({ user, todaysAppointments, ... }) => {
  // ✅ props 사용
  // ...
}
```

**수정 범위**: Content 파일 6개만 수정

---

## 📊 비교 결론

### Screen 재사용
- **장점**:
  - ✅ 더 많은 기능 포함 (ExamPreparationChecklist, 모달 등)
  - ✅ 검증된 코드 (이미 사용했던 파일들)

- **단점**:
  - ❌ Template 충돌 문제 해결 필요
  - ❌ JourneyContainer 대폭 수정 필요 (모든 props 전달 로직)
  - ❌ 각 Screen마다 다른 props 구조 (일관성 부족)
  - ❌ FinishedScreen은 패턴이 다름 (Store 직접 호출)

### Content 계속 사용
- **장점**:
  - ✅ 수정 범위 최소 (파일 6개만)
  - ✅ 일관된 패턴 정립 가능
  - ✅ Template 충돌 없음

- **단점**:
  - ❌ 기능이 부족함 (ExamPreparationChecklist 등 재구현 필요)
  - ❌ 검증되지 않은 신규 코드

---

## 🎯 최종 권장 사항

### ✨ **추천: Content 계속 사용 + 점진적 기능 이식**

**이유**:
1. **수정 범위 최소화**: 6개 Content 파일만 수정
2. **일관성 확립**: 모든 Content가 같은 props 패턴 사용
3. **Template 충돌 없음**: 현재 구조 유지

**작업 계획**:
```
Phase 1: Content 파일들 props 기반으로 전환 (1-2시간)
  └─ Store 직접 구독 → props 사용으로 변경

Phase 2: Screen의 부족한 기능 Content로 이식 (2-3시간)
  └─ ExamPreparationChecklist, 모달 등 필요한 기능만 복사

Phase 3: Screen 폴더 삭제 (1분)
  └─ /components/screens/ 제거 (AdminHomeScreen 제외)
```

**총 예상 시간**: 3-5시간

---

## 🚨 Screen 재사용 시 작업량

만약 Screen을 재사용한다면:

```
Phase 1: JourneyContainer 대폭 수정 (2-3시간)
  ├─ 상태별 Screen import 추가
  ├─ 각 Screen마다 다른 props 구조 파악
  └─ 모든 props 전달 로직 구현

Phase 2: Template 충돌 해결 (1-2시간)
  ├─ Option A: Screen에서 Template 제거
  └─ Option B: JourneyContainer Template 제거

Phase 3: FinishedScreen 패턴 통일 (1시간)
  └─ Store 직접 호출 → props 기반으로 변경

Phase 4: Content 폴더 삭제 (1분)
  └─ /components/journey/contents/ 제거
```

**총 예상 시간**: 4-6시간

---

## 💡 즉시 조치 사항

1. **FinishedContent의 fallback 데이터 제거**
   - 현재 API 데이터가 없어도 표시되도록 설계됨
   - props를 신뢰하도록 변경 필요

2. **WaitingContent의 patientState 참조 오류 수정**
   - 라인 40에서 정의되지 않은 `patientState` 변수 사용
   - `currentState`로 변경 필요

3. **모든 Content에 displayName 추가 확인**
   - React DevTools에서 디버깅 용이성 확보

---

**다음 대화에서 결정 필요**:
- Content 계속 사용할지, Screen 재사용할지 최종 결정
- 결정 후 즉시 수정 작업 시작
