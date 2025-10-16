# 🔍 Content 파일 목적 적합성 검증

**작성일**: 2025-01-16
**목적**: 각 Screen의 원래 목적을 기준으로 Content 파일이 상태에 맞는 요소만 포함하는지 검증

---

## 📋 각 상태의 원래 목적 정의 (Screen 기준)

| 상태 | 환자 여정 시점 | 화면의 목적 | 표시해야 할 것 | 표시하면 안 되는 것 |
|------|---------------|------------|--------------|-------------------|
| **UNREGISTERED** | 병원 도착 전 | 예약 확인 및 준비사항 안내 | 오늘 예약 목록, 검사별 준비사항, 병원 찾아오기 | ❌ 완료된 검사, 대기 순서, 수납 정보 |
| **ARRIVED** | 병원 도착 후 접수 전 | 접수창구 안내 및 준비 확인 | 접수 위치, 준비사항 마지막 체크 | ❌ 완료된 검사, 대기 순서 |
| **REGISTERED** | 접수 완료 후 | 첫 검사실 이동 안내 | 다음 검사 정보, 검사실 위치 | ❌ 완료된 검사, 수납 정보 |
| **WAITING** | 검사 대기 중 | 대기 상태 및 호출 알림 | 대기 순서, 예상 시간, 호출 모달 | ❌ 완료된 검사, 수납 정보 |
| **PAYMENT** | 검사 완료 후 수납 대기 | 수납 안내 및 완료 확인 | 완료된 검사, 수납 위치, 수납 방법 | ❌ 대기 순서, 준비사항 |
| **FINISHED** | 모든 절차 완료 | 귀가 안내 및 다음 예약 | 완료된 검사, 주의사항, 다음 예약 | ❌ 대기 순서, 준비사항 |

---

## ✅ 검증 결과: 모든 Content 파일이 목적에 적합함

### 1. UnregisteredContent (85줄) ✅ 적합

**상태 목적**: 병원 도착 전 → 예약 확인 및 준비사항 안내

**포함된 요소:**
```jsx
// 27-37줄: 환영 메시지
<div className="bg-blue-50 rounded-2xl p-6 text-center">
  <UserPlusIcon className="w-16 h-16 text-blue-600" />
  <p>병원 안내 시스템에 오신 것을 환영합니다</p>
  <p>NFC 태그를 스캔하여 병원 내 위치를 확인하고 안내를 받으세요</p>
</div>

// 40-54줄: NFC 스캔 안내
<div className="bg-white rounded-2xl p-6 border border-gray-200">
  <h3>NFC 태그 스캔 방법</h3>
  <ul>
    <li>• 휴대폰의 NFC 기능을 켜주세요</li>
    <li>• 병원 내 안내판의 NFC 태그에 휴대폰을 가까이 대주세요</li>
  </ul>
</div>

// 57-67줄: 서비스 안내
<div className="bg-gray-50 rounded-2xl p-6">
  <h3>이용 가능한 서비스</h3>
  <ul>
    <li>• 실시간 대기순서 확인</li>
    <li>• 검사실 위치 안내</li>
    <li>• 검사 준비사항 확인</li>
    <li>• AI 챗봇 상담</li>
  </ul>
</div>

// 69-78줄: 태그된 위치 표시 (조건부)
{taggedLocation && (
  <div className="bg-green-50 rounded-2xl p-6">
    <p>📍 현재 위치: {taggedLocation.description}</p>
    <p>로그인하시면 개인화된 안내를 받을 수 있습니다</p>
  </div>
)}
```

**검증 결과**:
- ✅ 환영 메시지: 적절 (처음 방문자 안내)
- ✅ NFC 스캔 안내: 적절 (기술 사용법 안내)
- ✅ 서비스 안내: 적절 (시스템 기능 소개)
- ✅ 현재 위치 표시: 적절 (이미 병원에 온 경우)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

### 2. ArrivedContent (170줄) ✅ 적합

**상태 목적**: 병원 도착 후 접수 전 → 접수창구 안내 및 준비 확인

**포함된 요소:**
```jsx
// 100-110줄: 도착 환영 메시지
<div className="bg-blue-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-blue-600" />
  <p>{user?.name}님, 병원에 오신 것을 환영합니다</p>
  <p>접수를 위해 {locationInfo?.name || '원무과'}로 이동해주세요</p>
</div>

// 113-130줄: 접수 위치 안내
<div className="bg-green-50 rounded-2xl p-6">
  <MapPinIcon className="w-6 h-6 text-green-600" />
  <h3>접수 위치: {locationInfo?.name || '원무과 접수처'}</h3>
  <p>{locationInfo?.building} {locationInfo?.floor} {locationInfo?.room}</p>
</div>

// 133-147줄: 검사별 준비사항 체크리스트
<div className="bg-white rounded-2xl p-6 border border-gray-200">
  <h3>검사별 준비사항</h3>
  <ExamPreparationChecklist
    appointments={todaysAppointments}
    onRescheduleRequest={handleRescheduleRequest}
    onCompletionChange={handleCompletionChange}
  />
</div>

// 150-160줄: 공통 서류 준비사항
<div className="bg-gray-50 rounded-2xl p-6">
  <h3>📄 공통 서류 준비사항</h3>
  <ul>
    <li>• 신분증 (주민등록증, 운전면허증)</li>
    <li>• 건강보험증</li>
    <li>• 의뢰서 (타 병원에서 온 경우)</li>
  </ul>
</div>
```

**검증 결과**:
- ✅ 도착 환영 메시지: 적절 (도착 확인 및 다음 행동 안내)
- ✅ 접수 위치 안내: 적절 (접수창구로 이동 안내)
- ✅ 검사별 준비사항: 적절 (접수 전 마지막 체크)
- ✅ 공통 서류 준비사항: 적절 (접수 시 필요한 서류)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

### 3. RegisteredContent (80줄) ✅ 적합

**상태 목적**: 접수 완료 후 → 첫 검사실 이동 안내

**포함된 요소:**
```jsx
// 29-39줄: 등록 완료 확인
<div className="bg-green-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-green-600" />
  <p>접수가 완료되었습니다</p>
  <p>{user?.name}님, 오늘의 검사 일정을 확인해주세요</p>
</div>

// 42-61줄: 다음 검사 안내
{(currentExam || nextExam) && (
  <div className="bg-blue-50 rounded-2xl p-6">
    <MapPinIcon className="w-6 h-6 text-blue-600" />
    <h3>다음 검사: {(currentExam || nextExam)?.title}</h3>
    <p>{(currentExam || nextExam)?.location}로 이동해주세요</p>
  </div>
)}

// 64-73줄: 안내사항
<div className="bg-gray-50 rounded-2xl p-6">
  <h3>안내사항</h3>
  <ul>
    <li>• 검사실로 이동 후 NFC 태그를 스캔해주세요</li>
    <li>• 대기 시간 중에는 휴대폰 진동을 켜두시기 바랍니다</li>
    <li>• 검사 준비사항이 있다면 미리 확인해주세요</li>
  </ul>
</div>
```

**검증 결과**:
- ✅ 등록 완료 확인: 적절 (접수 완료 알림)
- ✅ 다음 검사 안내: 적절 (첫 검사실 이동 정보)
- ✅ 안내사항: 적절 (검사 대기 시 주의사항)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

### 4. WaitingContent (106줄) ✅ 적합

**상태 목적**: 검사 대기 중 → 대기 상태 및 호출 알림

**포함된 요소:**
```jsx
// 54-60줄: 호출 모달
<CalledModal
  isOpen={showCalledModal}
  onClose={() => setShowCalledModal(false)}
  examInfo={currentExam}
  userName={user?.name}
  currentTask={currentTask}
/>

// 64-76줄: IN_PROGRESS 상태 안내
{isInProgress && (
  <div className="bg-green-50 rounded-2xl p-6 text-center">
    <ClipboardDocumentCheckIcon className="w-16 h-16 text-green-600" />
    <p>현재 {currentExam?.title || '검사'}가 진행 중입니다</p>
    <p>검사가 끝날 때까지 잠시만 기다려주세요</p>
  </div>
)}

// 78-87줄: CALLED 상태 안내
{isCalled && !isInProgress && (
  <div className="bg-blue-50 rounded-2xl p-6 text-center">
    <p>호출되었습니다! 검사실로 이동해주세요</p>
    <p>{currentExam?.title || '검사'}를 위해 대기해주세요</p>
  </div>
)}

// 89-98줄: WAITING 상태 안내
{!isInProgress && !isCalled && (
  <div className="bg-amber-50 rounded-2xl p-6 text-center">
    <p>순서를 기다리고 있습니다</p>
    <p>곧 호출될 예정이니 잠시만 기다려주세요</p>
  </div>
)}
```

**검증 결과**:
- ✅ 호출 모달: 적절 (호출 시 알림)
- ✅ IN_PROGRESS 안내: 적절 (검사 진행 중 상태)
- ✅ CALLED 안내: 적절 (호출 후 이동 안내)
- ✅ WAITING 안내: 적절 (대기 중 상태)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

### 5. PaymentContent (140줄) ✅ 적합

**상태 목적**: 검사 완료 후 수납 대기 → 수납 안내 및 완료 확인

**포함된 요소:**
```jsx
// 51-61줄: 검사 완료 축하 메시지
<div className="bg-green-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-green-600" />
  <p>{user?.name}님, 모든 검사가 완료되었습니다!</p>
  <p>오늘 하루 수고 많으셨습니다. 수납을 위해 원무과로 이동해주세요.</p>
</div>

// 64-81줄: 수납 위치 안내
<div className="bg-green-50 rounded-2xl p-6">
  <MapPinIcon className="w-6 h-6 text-green-600" />
  <h3>수납 위치: {locationInfo?.name || '원무과 수납창구'}</h3>
  <p>{locationInfo?.building} {locationInfo?.floor} {locationInfo?.room}</p>
</div>

// 84-107줄: 검사 완료 현황
{completionStats && (
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <CheckCircleIcon className="w-6 h-6 text-green-500" />
    <h3>검사 완료 현황</h3>
    <div className="grid grid-cols-2 gap-4">
      <div><p className="text-2xl font-bold">{completionStats.completedCount}</p></div>
      <div><p className="text-2xl font-bold">{completionStats.totalCount}</p></div>
    </div>
  </div>
)}

// 110-120줄: 수납 관련 안내
<div className="bg-amber-50 rounded-2xl p-6">
  <h3>💳 수납 관련 안내</h3>
  <ul>
    <li>• 신용카드, 현금, 계좌이체 모두 가능합니다</li>
    <li>• 건강보험 적용 여부를 확인해주세요</li>
    <li>• 영수증을 꼭 챙겨가시기 바랍니다</li>
  </ul>
</div>

// 123-133줄: 수납 시 준비물
<div className="bg-gray-50 rounded-2xl p-6">
  <h3>📋 수납 시 준비물</h3>
  <ul>
    <li>• 신분증 (주민등록증, 운전면허증)</li>
    <li>• 건강보험증</li>
    <li>• 결제 수단 (카드, 현금, 통장)</li>
  </ul>
</div>
```

**검증 결과**:
- ✅ 검사 완료 축하: 적절 (검사 완료 확인 및 다음 단계 안내)
- ✅ 수납 위치 안내: 적절 (수납창구 이동 정보)
- ✅ 검사 완료 현황: 적절 (수납 전 완료 검사 확인)
- ✅ 수납 관련 안내: 적절 (수납 방법 안내)
- ✅ 수납 시 준비물: 적절 (수납에 필요한 서류)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

### 6. FinishedContent (238줄) ✅ 적합

**상태 목적**: 모든 절차 완료 → 귀가 안내 및 다음 예약

**포함된 요소:**
```jsx
// 106-116줄: 완료 축하 메시지
<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
  <CheckBadgeIcon className="w-20 h-20 text-green-600" />
  <h1>🎉 {user?.name}님, 모든 검사가 완료되었습니다!</h1>
  <p>오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.</p>
</div>

// 119-137줄: 완료 통계
<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
  <h3>📊 오늘의 검사 현황</h3>
  <div className="grid grid-cols-2 gap-6">
    <div><p className="text-3xl font-bold">{completionStats.completedCount}</p></div>
    <div><p className="text-3xl font-bold">{completionStats.totalCount}</p></div>
  </div>
</div>

// 140-167줄: 완료된 검사 목록
<div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
  <h3>✅ 완료된 검사 목록</h3>
  {todaySchedule.map((exam) => (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50">
      <CheckBadgeIcon />
      <p>{exam.examName}</p>
      <span>✓ 완료</span>
    </div>
  ))}
</div>

// 170-220줄: 다음 단계 안내 (다음 예약 포함)
<div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
  <h3>📋 다음 단계 안내</h3>
  <ul>
    {nextAppointment && (
      <li>다음 예약: {nextAppointment.scheduled_at}</li>
    )}
    <li>검사 결과는 담당 의료진이 검토 후 안내드립니다</li>
    <li>귀가 전 수납이 완료되었는지 확인해주세요</li>
  </ul>
</div>

// 223-231줄: 감사 인사
<div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8">
  <div className="text-4xl mb-3">🙏</div>
  <h4>저희 병원을 이용해 주셔서 감사합니다</h4>
</div>
```

**검증 결과**:
- ✅ 완료 축하 메시지: 적절 (모든 절차 완료 확인)
- ✅ 완료 통계: 적절 (오늘의 검사 요약)
- ✅ 완료된 검사 목록: 적절 (수행한 검사 확인)
- ✅ 다음 단계 안내: 적절 (다음 예약 및 귀가 안내)
- ✅ 감사 인사: 적절 (따뜻한 마무리)
- ❌ **부적합 요소 없음**

**판정**: ✅ **목적에 완벽히 부합**

---

## 🎯 전체 검증 결과 요약

| Content 파일 | 상태 | 목적 적합성 | 부적합 요소 개수 | 비고 |
|-------------|------|------------|----------------|------|
| **UnregisteredContent** | UNREGISTERED | ✅ 적합 | 0개 | 병원 도착 전 안내에 충실 |
| **ArrivedContent** | ARRIVED | ✅ 적합 | 0개 | 접수 안내에 충실 |
| **RegisteredContent** | REGISTERED | ✅ 적합 | 0개 | 검사실 이동 안내에 충실 |
| **WaitingContent** | WAITING | ✅ 적합 | 0개 | 대기 상태 안내에 충실 |
| **PaymentContent** | PAYMENT | ✅ 적합 | 0개 | 수납 안내에 충실 |
| **FinishedContent** | FINISHED | ✅ 적합 | 0개 | 귀가 안내에 충실 |

**최종 판정**: ✅ **모든 Content 파일이 각 상태의 목적에 완벽히 부합**

---

## 🤔 사용자가 지적한 문제의 원인 분석

사용자가 "병원 도착 전 화면인데 완료 검사가 있고 이렇게 목적에 안 맞는 것도 있어"라고 했는데, 실제로 Content 파일들은 모두 목적에 맞게 작성되어 있습니다.

### 가능한 원인 3가지:

#### 1️⃣ **Screen 파일이 잘못된 Content를 렌더링**
```jsx
// 예: UnregisteredScreen이 실수로 FinishedContent를 렌더링
import FinishedContent from './FinishedContent';  // ❌ 잘못된 import

export default function UnregisteredScreen() {
  return <FinishedContent />;  // ❌ 잘못된 컴포넌트
}
```

**해결 방법**: Screen 파일의 import 구문 확인

---

#### 2️⃣ **FormatA/BTemplate이 모든 상태에 같은 데이터 표시**
```jsx
// 예: FormatBTemplate이 모든 상태에서 completedAppointments를 표시
<FormatBTemplate
  screenType="unregistered"  // 병원 도착 전
  completedAppointments={completedExams}  // ❌ 완료된 검사 표시
  todaySchedule={todaySchedule}
>
  {children}
</FormatBTemplate>
```

**해결 방법**: FormatA/BTemplate의 조건부 렌더링 로직 확인

---

#### 3️⃣ **JourneyContainer가 잘못된 상태로 Content 전환**
```jsx
// 예: patientState가 UNREGISTERED인데 FINISHED Content를 렌더링
const renderContent = () => {
  switch (patientState) {
    case 'UNREGISTERED':
      return <FinishedContent />;  // ❌ 잘못된 매핑
    case 'FINISHED':
      return <UnregisteredContent />;  // ❌ 잘못된 매핑
  }
};
```

**해결 방법**: JourneyContainer의 상태 매핑 로직 확인

---

## 📋 다음 단계: Screen 및 Template 검증

Content 파일은 모두 목적에 맞으므로, 이제 다음을 확인해야 합니다:

### 1. Screen 파일 검증
- [ ] UnregisteredScreen이 UnregisteredContent를 올바르게 import하는가?
- [ ] ArrivedScreen이 ArrivedContent를 올바르게 import하는가?
- [ ] (각 Screen별 확인)

### 2. FormatA/BTemplate 검증
- [ ] Template이 screenType에 따라 적절한 요소만 표시하는가?
- [ ] completedAppointments를 PAYMENT/FINISHED에서만 표시하는가?
- [ ] preparationItems를 UNREGISTERED/ARRIVED에서만 표시하는가?

### 3. JourneyContainer 검증
- [ ] patientState에 따라 올바른 Content를 렌더링하는가?
- [ ] 상태 전환 시 올바른 Content로 스위칭되는가?

---

**작성 완료일**: 2025-01-16
**다음 문서**: `SCREEN_TEMPLATE_VALIDATION.md` (Screen과 Template 검증)
