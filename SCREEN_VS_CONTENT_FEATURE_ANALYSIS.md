# 📊 Screen vs Content 기능 차이 상세 분석

**작성일**: 2025-01-16
**목적**: Screen 파일들의 화면 요소 중 Content 파일에 누락된 기능을 상세히 파악하여 이식 계획 수립

---

## 📋 전체 요약표

| 상태 | Screen 라인 수 | Content 라인 수 | 주요 누락 기능 개수 | 우선순위 |
|------|----------------|-----------------|---------------------|---------|
| **Unregistered** | 168줄 | 85줄 | 3개 | 🟡 Medium |
| **Arrived** | 192줄 | 170줄 | 1개 (Template 통합) | 🟢 Low |
| **Registered** | 37줄 | 80줄 | 0개 (Content가 더 풍부) | ✅ 완료 |
| **Waiting** | 84줄 | 106줄 | 0개 (기능 동일) | ✅ 완료 |
| **Payment** | 85줄 | 140줄 | 0개 (Content가 더 풍부) | ✅ 완료 |
| **Finished** | 717줄 | 238줄 | **7개** | 🔴 **High** |

### 핵심 발견

- ✅ **Registered, Waiting, Payment**: Content가 이미 충분하거나 더 풍부함
- 🟡 **Unregistered, Arrived**: 일부 기능 누락 (3-4시간 작업)
- 🔴 **Finished**: 대규모 기능 누락 (6-8시간 작업)

---

## 1️⃣ UnregisteredScreen vs UnregisteredContent

### Screen에 있는 기능 (168줄)

```jsx
// 1. ExamPreparationChecklist 컴포넌트
<ExamPreparationChecklist
  appointments={todaysAppointments}
  onRescheduleRequest={handleRescheduleRequest}
  onCompletionChange={handleCompletionChange}
/>

// 2. RescheduleModal (예약 변경 모달)
const RescheduleModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
    <button onClick={() => window.location.href = 'tel:02-1234-5678'}>
      병원에 전화하기
    </button>
    <button onClick={() => navigate('/public', { state: { showReception: true }})}>
      접수창구 위치 보기
    </button>
  </div>
);

// 3. 동적 actionButtons (FormatBTemplate 전달)
actionButtons={[
  {
    text: '병원 찾아오기',
    icon: '🗺️',
    variant: 'primary',
    onClick: () => navigate('/public', { state: { showMap: true } })
  },
  {
    text: '전화 문의',
    icon: '📞',
    variant: 'secondary',
    onClick: () => window.location.href = 'tel:02-1234-5678'
  }
]}

// 4. preparationItems (공통 준비사항 구조화)
const preparationItems = [
  {
    icon: '📄',
    title: '공통 서류 준비사항',
    description: '모든 검사에 필요한 서류입니다',
    items: [
      { text: '신분증 (주민등록증, 운전면허증)' },
      { text: '건강보험증' },
      { text: '의뢰서 (타 병원에서 온 경우)' },
      { text: '이전 검사 결과지 (있는 경우)' }
    ]
  }
];

// 5. 검사별 준비사항 탭 (customPreparationContent)
const customPreparationContent = (
  <div className="mt-6">
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-xl font-bold text-gray-900">
        검사별 준비사항
      </h3>
      {allRequiredCompleted && (
        <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-bold">
          준비 완료!
        </span>
      )}
    </div>
    <ExamPreparationChecklist
      appointments={todaysAppointments}
      onRescheduleRequest={handleRescheduleRequest}
      onCompletionChange={handleCompletionChange}
    />
  </div>
);
```

### Content에 있는 기능 (85줄)

```jsx
// 1. 환영 메시지
<div className="bg-blue-50 rounded-2xl p-6 text-center">
  <UserPlusIcon className="w-16 h-16 text-blue-600" />
  <p className="text-lg text-blue-800 font-medium">
    병원 안내 시스템에 오신 것을 환영합니다
  </p>
</div>

// 2. NFC 스캔 안내
<div className="bg-white rounded-2xl p-6 border border-gray-200">
  <h3 className="text-lg font-medium text-gray-800">
    NFC 태그 스캔 방법
  </h3>
  <ul className="mt-3 space-y-2 text-sm text-gray-600">
    <li>• 휴대폰의 NFC 기능을 켜주세요</li>
    <li>• 병원 내 안내판의 NFC 태그에 휴대폰을 가까이 대주세요</li>
  </ul>
</div>

// 3. 서비스 안내
<div className="bg-gray-50 rounded-2xl p-6">
  <h3 className="text-lg font-medium text-gray-800 mb-3">
    이용 가능한 서비스
  </h3>
  <ul className="space-y-2 text-sm text-gray-600">
    <li>• 실시간 대기순서 확인</li>
    <li>• 검사실 위치 안내</li>
  </ul>
</div>
```

### ❌ Content에 누락된 기능

1. **ExamPreparationChecklist 컴포넌트**: 검사별 준비사항 체크리스트 (상호작용 가능)
2. **RescheduleModal**: 예약 변경이 필요한 경우 병원 연락/접수창구 안내
3. **actionButtons**: 병원 찾아오기, 전화 문의 등 동적 액션 버튼

### 📌 평가

- **Content 장점**: 깔끔하고 직관적인 안내
- **Screen 장점**: 실용적인 상호작용 기능 (준비사항 체크, 예약 변경)
- **결론**: Screen의 ExamPreparationChecklist와 RescheduleModal을 Content에 이식 필요

---

## 2️⃣ ArrivedScreen vs ArrivedContent

### Screen에 있는 기능 (192줄)

```jsx
// 1. FormatATemplate 사용
<FormatATemplate
  screenType="arrived"
  currentStep={actualCurrentStep}
  totalSteps={totalCount}
  nextAction={null}
  waitingInfo={waitingInfo || null}
  locationInfo={locationInfo}
  todaySchedule={todaySchedule}
  preparationItems={customPreparationContent}
  completionStats={{
    completedCount: completedCount,
    totalCount: totalCount,
  }}
/>

// 2. completionStats 계산 로직
const completedCount = completionStats?.completedCount ||
  todaySchedule.filter((s) => s.status === "completed" || s.status === "done").length || 0;

const totalCount = completionStats?.totalCount || todaySchedule.length || totalSteps || 7;

// 3. ExamPreparationChecklist + RescheduleModal (Unregistered와 동일)
```

### Content에 있는 기능 (170줄)

```jsx
// 1. 도착 환영 메시지
<div className="bg-blue-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-blue-600" />
  <p className="text-lg text-blue-800 font-medium">
    {user?.name}님, 병원에 오신 것을 환영합니다
  </p>
  <p className="text-sm text-blue-600 mt-2">
    접수를 위해 {locationInfo?.name || '원무과'}로 이동해주세요
  </p>
</div>

// 2. 접수 위치 안내
<div className="bg-green-50 rounded-2xl p-6">
  <MapPinIcon className="w-6 h-6 text-green-600" />
  <h3 className="text-lg font-medium text-green-800">
    접수 위치: {locationInfo?.name || '원무과 접수처'}
  </h3>
  <p className="text-green-600 mt-1">
    {locationInfo?.building || '본관'} {locationInfo?.floor || '1층'}
  </p>
</div>

// 3. 검사별 준비사항 (ExamPreparationChecklist 포함)
<div className="bg-white rounded-2xl p-6 border border-gray-200">
  <h3 className="text-xl font-bold text-gray-900">검사별 준비사항</h3>
  <ExamPreparationChecklist
    appointments={todaysAppointments}
    onRescheduleRequest={handleRescheduleRequest}
    onCompletionChange={handleCompletionChange}
  />
</div>

// 4. 공통 서류 준비사항
<div className="bg-gray-50 rounded-2xl p-6">
  <h3 className="text-lg font-medium text-gray-800 mb-3">
    📄 공통 서류 준비사항
  </h3>
  <ul className="space-y-2 text-sm text-gray-600">
    <li>• 신분증 (주민등록증, 운전면허증)</li>
    <li>• 건강보험증</li>
  </ul>
</div>

// 5. RescheduleModal (동일)
```

### ✅ Content에 이미 있는 기능

- ArrivedContent가 이미 **대부분의 기능을 포함**하고 있음
- ExamPreparationChecklist, RescheduleModal 모두 구현됨
- 오히려 Screen보다 Content가 더 구조화되고 완성도가 높음

### 📌 평가

- **Content 장점**: 더 풍부하고 상세한 안내 (4개 섹션 vs Screen의 Template 의존)
- **Screen 장점**: FormatATemplate으로 통합 구조
- **결론**: ArrivedContent는 이미 완성도가 높으므로 추가 작업 불필요

---

## 3️⃣ RegisteredScreen vs RegisteredContent

### Screen에 있는 기능 (37줄)

```jsx
// FormatATemplate만 사용, 모든 데이터는 props로 전달
<FormatATemplate
  screenType="registered"
  currentStep={actualCurrentStep}
  totalSteps={totalSteps}
  nextAction={null}
  waitingInfo={waitingInfo}
  locationInfo={locationInfo}
  todaySchedule={todaySchedule}
  patientState={user?.state || patientState || 'REGISTERED'}
  currentExam={currentExam}
/>
```

### Content에 있는 기능 (80줄)

```jsx
// 1. 등록 완료 확인 메시지
<div className="bg-green-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-green-600" />
  <p className="text-lg text-green-800 font-medium">
    접수가 완료되었습니다
  </p>
  <p className="text-sm text-green-600 mt-2">
    {user?.name}님, 오늘의 검사 일정을 확인해주세요
  </p>
</div>

// 2. 다음 검사 안내
{(currentExam || nextExam) && (
  <div className="bg-blue-50 rounded-2xl p-6">
    <MapPinIcon className="w-6 h-6 text-blue-600" />
    <h3 className="text-lg font-medium text-blue-800">
      다음 검사: {(currentExam || nextExam)?.title}
    </h3>
    <p className="text-blue-600 mt-1">
      {(currentExam || nextExam)?.location}로 이동해주세요
    </p>
  </div>
)}

// 3. 안내사항
<div className="bg-gray-50 rounded-2xl p-6">
  <h3 className="text-lg font-medium text-gray-800 mb-3">
    안내사항
  </h3>
  <ul className="space-y-2 text-sm text-gray-600">
    <li>• 검사실로 이동 후 NFC 태그를 스캔해주세요</li>
    <li>• 대기 시간 중에는 휴대폰 진동을 켜두시기 바랍니다</li>
    <li>• 검사 준비사항이 있다면 미리 확인해주세요</li>
  </ul>
</div>
```

### ✅ Content가 더 풍부함

### 📌 평가

- **Content 장점**: 직관적인 메시지, 다음 검사 안내, 실용적인 안내사항
- **Screen 장점**: 없음 (Template만 래핑)
- **결론**: RegisteredContent가 이미 완벽하므로 추가 작업 불필요

---

## 4️⃣ WaitingScreen vs WaitingContent

### Screen에 있는 기능 (84줄)

```jsx
// 1. CalledModal (호출 모달)
<CalledModal
  isOpen={showCalledModal}
  onClose={() => setShowCalledModal(false)}
  examInfo={currentExam}
  userName={user?.name}
  currentTask={currentTask}
/>

// 2. FormatATemplate
<FormatATemplate
  screenType="waiting"
  currentStep={actualCurrentStep || currentStep}
  totalSteps={totalSteps || todaySchedule?.length || 7}
  waitingInfo={waitingInfo}
  locationInfo={locationInfo}
  queueData={currentTask}
  patientState={isInProgress ? 'IN_PROGRESS' : isCalled ? 'CALLED' : 'WAITING'}
>
  {/* 3. IN_PROGRESS 상태 추가 콘텐츠 */}
  {isInProgress && (
    <div className="bg-green-50 rounded-2xl p-6 text-center">
      <ClipboardDocumentCheckIcon className="w-16 h-16 text-green-600" />
      <p className="text-lg text-green-800 font-medium">
        현재 {currentExam?.title || '검사'}가 진행 중입니다
      </p>
    </div>
  )}
</FormatATemplate>
```

### Content에 있는 기능 (106줄)

```jsx
// 1. CalledModal (동일)
<CalledModal
  isOpen={showCalledModal}
  onClose={() => setShowCalledModal(false)}
  examInfo={currentExam}
  userName={user?.name}
  currentTask={currentTask}
/>

// 2. 상태별 안내 콘텐츠
{isInProgress && (
  <div className="bg-green-50 rounded-2xl p-6 text-center">
    <ClipboardDocumentCheckIcon className="w-16 h-16 text-green-600" />
    <p className="text-lg text-green-800 font-medium">
      현재 {currentExam?.title || '검사'}가 진행 중입니다
    </p>
  </div>
)}

{isCalled && !isInProgress && (
  <div className="bg-blue-50 rounded-2xl p-6 text-center">
    <p className="text-lg text-blue-800 font-medium">
      호출되었습니다! 검사실로 이동해주세요
    </p>
  </div>
)}

{!isInProgress && !isCalled && (
  <div className="bg-amber-50 rounded-2xl p-6 text-center">
    <p className="text-lg text-amber-800 font-medium">
      순서를 기다리고 있습니다
    </p>
  </div>
)}
```

### ✅ 기능 거의 동일

### 📌 평가

- **Content 장점**: 3가지 상태별 안내가 더 상세함
- **Screen 장점**: FormatATemplate 통합 구조
- **결론**: WaitingContent가 이미 충분하므로 추가 작업 불필요

---

## 5️⃣ PaymentScreen vs PaymentContent

### Screen에 있는 기능 (85줄)

```jsx
// 1. FormatATemplate
<FormatATemplate
  screenType="payment"
  currentStep={currentStep}
  totalSteps={totalSteps}
  waitingInfo={paymentInfo}
  locationInfo={paymentLocationInfo}
  todaySchedule={todaySchedule}
  patientState={user?.state || patientState || 'PAYMENT'}
>
  {/* 2. 수납 절차 안내 (3단계) */}
  <div className="bg-gray-50 rounded-2xl p-6">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">
      수납 절차 안내
    </h3>
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-700 text-white rounded-full">1</div>
        <div>
          <p className="text-lg text-gray-700 font-medium">대기번호표를 받아주세요</p>
          <p className="text-sm text-gray-600 mt-1">원무과 입구에서 번호표를 뽑아주시기 바랍니다</p>
        </div>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-700 text-white rounded-full">2</div>
        <div>
          <p className="text-lg text-gray-700 font-medium">호출 시 창구로 이동해주세요</p>
        </div>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-700 text-white rounded-full">3</div>
        <div>
          <p className="text-lg text-gray-700 font-medium">수납 후 영수증을 받아주세요</p>
        </div>
      </div>
    </div>
  </div>

  {/* 3. 문의 정보 */}
  <div className="bg-white rounded-2xl p-5 border-2 border-gray-300">
    <p className="text-base text-gray-700 mb-2">도움이 필요하시면 언제든지 문의해주세요</p>
    <div className="flex items-center justify-center gap-3">
      <span className="text-2xl">📞</span>
      <p className="text-xl font-bold text-gray-900">02-1234-5678</p>
    </div>
    <p className="text-sm text-gray-600 mt-2 text-center">원무과 직통전화</p>
  </div>
</FormatATemplate>
```

### Content에 있는 기능 (140줄)

```jsx
// 1. 검사 완료 축하 메시지
<div className="bg-green-50 rounded-2xl p-6 text-center">
  <CheckCircleIcon className="w-16 h-16 text-green-600" />
  <p className="text-lg text-green-800 font-medium">
    {user?.name || '환자'}님, 모든 검사가 완료되었습니다!
  </p>
  <p className="text-sm text-green-600 mt-2">
    오늘 하루 수고 많으셨습니다. 수납을 위해 원무과로 이동해주세요.
  </p>
</div>

// 2. 수납 위치 안내
<div className="bg-green-50 rounded-2xl p-6">
  <MapPinIcon className="w-6 h-6 text-green-600" />
  <h3 className="text-lg font-medium text-green-800">
    수납 위치: {locationInfo?.name || '원무과 수납창구'}
  </h3>
  <p className="text-green-600 mt-1">
    {locationInfo?.building || '본관'} {locationInfo?.floor || '1층'}
  </p>
</div>

// 3. 검사 완료 현황
{completionStats && (
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <div className="flex items-center space-x-3 mb-4">
      <CheckCircleIcon className="w-6 h-6 text-green-500" />
      <h3 className="text-lg font-medium text-gray-800">
        검사 완료 현황
      </h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-3 bg-green-50 rounded-xl">
        <p className="text-2xl font-bold text-green-600">
          {completionStats.completedCount || 0}
        </p>
        <p className="text-sm text-green-500">완료된 검사</p>
      </div>
      <div className="text-center p-3 bg-blue-50 rounded-xl">
        <p className="text-2xl font-bold text-blue-600">
          {completionStats.totalCount || 0}
        </p>
        <p className="text-sm text-blue-500">총 검사</p>
      </div>
    </div>
  </div>
)}

// 4. 수납 관련 안내
<div className="bg-amber-50 rounded-2xl p-6">
  <h3 className="text-lg font-medium text-amber-800 mb-3">
    💳 수납 관련 안내
  </h3>
  <ul className="space-y-2 text-sm text-amber-700">
    <li>• 신용카드, 현금, 계좌이체 모두 가능합니다</li>
    <li>• 건강보험 적용 여부를 확인해주세요</li>
    <li>• 영수증을 꼭 챙겨가시기 바랍니다</li>
    <li>• 추가 진료비가 발생할 수 있습니다</li>
  </ul>
</div>

// 5. 준비물 체크리스트
<div className="bg-gray-50 rounded-2xl p-6">
  <h3 className="text-lg font-medium text-gray-800 mb-3">
    📋 수납 시 준비물
  </h3>
  <ul className="space-y-2 text-sm text-gray-600">
    <li>• 신분증 (주민등록증, 운전면허증)</li>
    <li>• 건강보험증</li>
    <li>• 결제 수단 (카드, 현금, 통장)</li>
    <li>• 진료비 계산서 (접수 시 받은 서류)</li>
  </ul>
</div>
```

### ✅ Content가 더 풍부하고 상세함

### 📌 평가

- **Content 장점**: 검사 완료 축하, 완료 현황 통계, 상세한 안내사항 (5개 섹션)
- **Screen 장점**: 3단계 절차 안내가 더 구조화됨
- **결론**: PaymentContent가 이미 더 완성도가 높으므로 추가 작업 불필요

---

## 6️⃣ FinishedScreen vs FinishedContent ⚠️ 가장 큰 차이

### Screen에 있는 기능 (717줄) - 대규모 구현

#### A. Mock 데이터 Fallback 시스템

```jsx
// 1. Mock 환자 데이터
const mockPatientData = {
  name: '김미경',
  age: 50,
  visitPurpose: '내과 정기 검진',
  appointmentTime: '14:00',
  condition: '고혈압'
};

// 2. Mock 검사 후 주의사항 (8개 항목)
const mockPostCareInstructions = [
  {
    type: 'blood_test',
    title: '채혈 후 주의사항',
    priority: 'high',
    icon: '💉',
    description: '채혈 부위를 5분 이상 꾹 눌러주세요'
  },
  {
    type: 'medication',
    title: '고혈압 약물 복용 안내',
    priority: 'high',
    icon: '💊',
    description: '처방받은 약은 매일 같은 시간에 복용하세요'
  },
  // ... 6개 더
];

// 3. Mock 완료된 검사 데이터 (4개 검사)
const mockCompletedExams = [
  {
    appointment_id: 'apt_001',
    exam: {
      exam_id: 'blood_test_001',
      title: '채혈 검사',
      description: '혈당, 콜레스테롤, 간 기능 검사',
      department: '진단검사의학과',
      cost: '35,000',
    },
    status: 'completed',
    completedAt: '13:15 완료'
  },
  // ... 3개 더 (소변, X-ray, 내과진료)
];
```

#### B. 검사 후 주의사항 API 통합

```jsx
// 1. API 조회 로직
useEffect(() => {
  const fetchPostCareInstructions = async () => {
    const completedAppointments = todaysAppointments.filter(apt =>
      ['completed', 'done'].includes(apt.status)
    );

    try {
      const instructions = [];

      // 각 완료된 검사의 후 주의사항을 병렬로 가져오기
      const promises = completedAppointments.map(async (apt) => {
        const response = await apiService.getExamPostCareInstructions(apt.exam?.exam_id);
        return response.data || response;
      });

      const results = await Promise.all(promises);

      // 우선순위별로 정렬하여 합치기
      results.forEach(instructionList => {
        if (instructionList && Array.isArray(instructionList)) {
          instructions.push(...instructionList);
        }
      });

      const sortedInstructions = instructions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      setPostCareInstructions(sortedInstructions.length > 0
        ? sortedInstructions
        : mockPostCareInstructions
      );
    } catch (error) {
      console.error('검사 후 주의사항 조회 중 오류:', error);
      setPostCareInstructions(mockPostCareInstructions);
    }
  };

  if (!todaysAppointments || todaysAppointments.length === 0) {
    setPostCareInstructions(mockPostCareInstructions);
  } else {
    fetchPostCareInstructions();
  }
}, [todaysAppointments]);

// 2. 주의사항 그룹화 및 렌더링
const generatePrecautions = () => {
  const instructionsToUse = postCareInstructions.length > 0
    ? postCareInstructions
    : mockPostCareInstructions;

  // API 데이터를 기반으로 주의사항 그룹화
  const groupedInstructions = {};

  instructionsToUse.forEach(instruction => {
    const key = `${instruction.type}_${instruction.priority}`;
    if (!groupedInstructions[key]) {
      groupedInstructions[key] = {
        icon: instruction.icon || '📋',
        title: instruction.title,
        priority: instruction.priority,
        bgColor: instruction.priority === 'high'
          ? 'bg-red-50 text-red-800'
          : instruction.priority === 'medium'
          ? 'bg-orange-50 text-orange-800'
          : 'bg-blue-50 text-blue-800',
        items: []
      };
    }
    groupedInstructions[key].items.push(instruction.description);
  });

  return Object.values(groupedInstructions).sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

const precautions = generatePrecautions();
```

#### C. 처방전 안내 섹션

```jsx
{/* 처방전 안내 */}
{hasPrescription && (
  <section className="mb-8" style={{ animation: 'fadeUp 0.8s ease-out' }}>
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg border border-blue-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        처방전 안내
      </h3>
      <div className="bg-white rounded-xl p-4">
        <p className="text-lg text-gray-700 mb-3">
          조제약국에서 처방전을 제출하여 약을 받으세요.
        </p>
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>처방전은 발행일로부터 3일 이내에 사용하세요</span>
        </div>
      </div>
    </div>
  </section>
)}

// 처방 여부 확인 로직
const hasPrescription = completedAppointments.some(apt =>
  apt.exam?.department === '내과' ||
  apt.exam?.department === '정형외과' ||
  apt.exam?.has_prescription
);
```

#### D. 카카오톡 메모 기능

```jsx
<button
  onClick={() => {
    // 카카오톡 공유 API 호출
    if (window.Kakao) {
      window.Kakao.Link.sendDefault({
        objectType: 'text',
        text: `[병원 예약 알림]\n다음 예약: ${nextSchedule}\n\n이 메시지는 나에게 보내는 메모입니다.`,
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href
        }
      });
    }
  }}
  className="group bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 rounded-2xl p-4
           font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300
           shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3C6.48 3 2 6.12 2 10c0 2.23 1.5 4.22 3.84 5.5-.15.5-.37 1.22-.57 1.84-.24.74.43 1.35 1.1.94.56-.34 1.41-.87 2.13-1.34C9.56 17.28 10.75 17.5 12 17.5c5.52 0 10-3.12 10-7.5S17.52 3 12 3z"/>
    </svg>
  </div>
  <div className="text-left">
    <h4 className="text-lg font-bold">카카오톡 메모</h4>
    <p className="text-sm opacity-80">나에게 예약 알림 보내기</p>
  </div>
</button>
```

#### E. 알림 설정 모달 (복잡한 UI)

```jsx
{/* 알림 설정 모달 - 더 세련되게 */}
{showModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       style={{ animation: 'fadeUp 0.3s ease-out' }}>
    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
         style={{ animation: 'fadeUp 0.4s ease-out' }}>
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white text-center">
        <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
          🔔
        </div>
        <h3 className="text-2xl font-bold">다음 예약 알림</h3>
        <p className="text-blue-100 mt-1">편리한 병원 이용을 위한 스마트 알림</p>
      </div>

      {/* 내용 */}
      <div className="p-6 space-y-5">
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            알림 혜택
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <span className="text-gray-700">검사 전날 준비사항 알림</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <span className="text-gray-700">당일 아침 일정 알림</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <span className="text-gray-700">다음 방문까지 자동 로그인</span>
            </div>
          </div>
        </div>

        {/* 보안 안내 */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-1">보안 안내</h5>
              <p className="text-sm text-gray-700">
                로그인 정보는 다음 예약일까지만<br />
                휴대폰에 안전하게 저장됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 p-6 pt-0">
        <button
          onClick={() => setShowModal(false)}
          className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 px-4 font-bold
                   hover:bg-gray-200 transition-all duration-300">
          취소
        </button>
        <button
          onClick={() => {
            setShowModal(false);
            alert('알림이 설정되었습니다');
          }}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 px-4 font-bold
                   hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg">
          동의하고 설정
        </button>
      </div>
    </div>
  </div>
)}
```

#### F. 총 소요 시간 계산 로직

```jsx
// 소요 시간 계산을 위한 시작/종료 시간 찾기
const calculateTotalDuration = () => {
  // Mock 데이터 사용 시 고정값 반환
  if (!todaysAppointments || todaysAppointments.length === 0) {
    return 80; // 13:00 ~ 14:20 = 80분
  }

  const completedAppts = todaysAppointments.filter(apt =>
    ['completed', 'done'].includes(apt.status)
  );

  if (completedAppts.length === 0) return 80;

  // 가장 이른 시작 시간 찾기
  const startTimes = completedAppts.map(apt => {
    if (apt.created_at) return new Date(apt.created_at);
    return new Date(apt.scheduled_at);
  }).filter(date => !isNaN(date));

  if (startTimes.length === 0) return 80;

  const firstTime = new Date(Math.min(...startTimes));

  // 가장 늦은 완료 시간 찾기
  const endTimes = completedAppts.map(apt => {
    if (apt.completed_at) return new Date(apt.completed_at);
    if (apt.updated_at) return new Date(apt.updated_at);
    // 완료 시간이 없으면 예상 시간을 더해서 추정
    const scheduled = new Date(apt.scheduled_at);
    const duration = apt.exam?.average_duration || 30;
    return new Date(scheduled.getTime() + duration * 60 * 1000);
  }).filter(date => !isNaN(date));

  if (endTimes.length === 0) return 80;

  const lastTime = new Date(Math.max(...endTimes));

  // 분 단위로 계산
  const durationInMinutes = Math.round((lastTime - firstTime) / (1000 * 60));

  return Math.max(0, durationInMinutes);
};

const totalDuration = calculateTotalDuration();
```

#### G. 총 비용 계산 로직

```jsx
// 총 비용 계산 - API에서 받은 실제 환자 본인부담금 사용
const totalCost = completedAppointments.length > 0
  ? completedAppointments.reduce((sum, apt) => {
      // API에서 받은 실제 환자 본인부담금 사용
      const cost = apt.exam?.patient_cost || apt.exam?.base_price || 0;
      const numericCost = typeof cost === 'string' ?
        parseInt(cost.replace(/[^0-9]/g, '')) : Number(cost);
      return sum + numericCost;
    }, 0)
  : 0;
```

#### H. 시연용 위치 데이터

```jsx
// P-7 마무리: 퇴원 안내 위치 정보 (시연용)
const locationInfo = {
  name: '정문 출구',
  building: '본관',
  floor: '1층',
  room: '정문',
  department: '',
  directions: '안전하게 귀가하세요. 택시 승강장은 정문 앞에 있습니다.',
  mapFile: 'main_1f.svg',
  svgId: 'main-exit',
  // 시연용 좌표 데이터
  x_coord: 100,
  y_coord: 450,
  // 현재 위치 (수납창구에서 출발)
  currentLocation: {
    x_coord: 280,
    y_coord: 250,
    building: '본관',
    floor: '1',
    room: '수납창구'
  },
  // 경로 노드 (시연용)
  pathNodes: [
    { x: 280, y: 250, label: '현재 위치 (수납창구)' },
    { x: 200, y: 300, label: '중앙 홀' },
    { x: 100, y: 400, label: '로비' },
    { x: 100, y: 450, label: '정문 출구' }
  ]
};
```

### Content에 있는 기능 (238줄) - 기본 구현

```jsx
// 1. 완료 축하 메시지
<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border-2 border-green-200 shadow-lg">
  <CheckBadgeIcon className="w-20 h-20 text-green-600" />
  <h1 className="text-2xl text-green-800 font-bold mb-3">
    🎉 {actualUser?.name || '김환자'}님, 모든 검사가 완료되었습니다!
  </h1>
  <p className="text-lg text-green-700 font-medium">
    오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.
  </p>
</div>

// 2. 완료 통계 (로컬 계산)
<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
  <h3 className="text-xl font-bold text-blue-800 mb-4">
    📊 오늘의 검사 현황
  </h3>
  <div className="grid grid-cols-2 gap-6">
    <div className="text-center bg-white rounded-xl p-4">
      <p className="text-3xl font-bold text-blue-600 mb-1">
        {completionStats?.completedCount || actualAppointments.length}
      </p>
      <p className="text-base font-medium text-blue-500">완료된 검사</p>
    </div>
    <div className="text-center bg-white rounded-xl p-4">
      <p className="text-3xl font-bold text-blue-600 mb-1">
        {completionStats?.totalCount || actualAppointments.length}
      </p>
      <p className="text-base font-medium text-blue-500">총 검사</p>
    </div>
  </div>
</div>

// 3. 완료된 검사 목록
<div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-md">
  <h3 className="text-xl font-bold text-gray-800 mb-5">
    ✅ 완료된 검사 목록
  </h3>
  <div className="space-y-4">
    {todaySchedule.map((exam, index) => (
      <div
        key={exam.id || index}
        className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl"
      >
        <CheckBadgeIcon className="w-6 h-6 text-green-600" />
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">
            {exam.examName || exam.title}
          </p>
          <p className="text-base text-gray-600">
            📍 {exam.location}
          </p>
        </div>
        <span className="text-sm text-green-700 font-bold bg-green-200 px-3 py-1 rounded-full">
          ✓ 완료
        </span>
      </div>
    ))}
  </div>
</div>

// 4. 다음 단계 안내
<div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
  <h3 className="text-xl font-bold text-amber-800 mb-4">
    📋 다음 단계 안내
  </h3>
  <ul className="space-y-4">
    {/* 다음 예약이 있을 경우 표시 */}
    {!loadingNextAppointment && nextAppointment && (
      <li className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <CalendarIcon className="w-4 h-4 text-blue-600" />
        <span className="text-base text-blue-800 leading-relaxed">
          <strong>다음 예약:</strong> {new Date(nextAppointment.scheduled_at).toLocaleString()}
        </span>
      </li>
    )}

    <li className="flex items-start space-x-3 p-3 bg-white rounded-xl">
      <CalendarIcon className="w-4 h-4 text-amber-600" />
      <span className="text-base text-amber-800">검사 결과는 담당 의료진이 검토 후 안내드립니다</span>
    </li>
    <li className="flex items-start space-x-3 p-3 bg-white rounded-xl">
      <HomeIcon className="w-4 h-4 text-amber-600" />
      <span className="text-base text-amber-800">귀가 전 수납이 완료되었는지 확인해주세요</span>
    </li>
  </ul>
</div>

// 5. 다음 예약 정보 조회 (API)
useEffect(() => {
  const fetchNextAppointment = async () => {
    try {
      setLoadingNextAppointment(true);
      const response = await PatientJourneyAPI.getNextAppointment();

      if (response.success && response.data) {
        setNextAppointment(response.data);
      } else {
        setNextAppointment(null);
      }
    } catch (error) {
      console.error('다음 예약 조회 실패:', error);
      setNextAppointment(null);
    } finally {
      setLoadingNextAppointment(false);
    }
  };

  fetchNextAppointment();
}, []);
```

### ❌ Content에 누락된 주요 기능 (7개)

1. **검사 후 주의사항 API 통합**
   - apiService.getExamPostCareInstructions() 호출
   - 우선순위별 정렬 및 그룹화
   - Mock 데이터 fallback

2. **처방전 안내 섹션**
   - 조제약국 안내
   - 유효기간 안내 (3일)
   - 처방 여부 자동 감지

3. **카카오톡 메모 기능**
   - 다음 예약을 나에게 메모
   - Kakao.Link.sendDefault() 통합

4. **알림 설정 모달**
   - 3가지 혜택 안내
   - 보안 안내
   - 동의 플로우

5. **Mock 데이터 Fallback**
   - API 실패 시 시연용 데이터 표시
   - 개발 환경 데이터 보장

6. **총 소요 시간 계산**
   - 첫 검사 ~ 마지막 검사 완료 시간
   - 분 단위 계산

7. **총 비용 계산**
   - 환자 본인부담금 합계
   - 문자열 파싱 로직

### 📌 평가

- **Screen**: 매우 풍부한 기능 (717줄), 실제 프로덕션 수준
- **Content**: 기본 기능만 (238줄), 축하 메시지 중심
- **결론**: FinishedContent에 Screen의 7개 주요 기능을 이식해야 함 (예상 6-8시간)

---

## 🎯 최종 결론 및 우선순위

### 작업 필요한 Content 파일

| 파일 | 누락 기능 수 | 예상 작업 시간 | 우선순위 |
|------|--------------|----------------|---------|
| **FinishedContent.jsx** | 7개 | 6-8시간 | 🔴 **High** |
| **UnregisteredContent.jsx** | 3개 | 2-3시간 | 🟡 Medium |
| **ArrivedContent.jsx** | 0개 | 0시간 | ✅ 완료 |
| **RegisteredContent.jsx** | 0개 | 0시간 | ✅ 완료 |
| **WaitingContent.jsx** | 0개 | 0시간 | ✅ 완료 |
| **PaymentContent.jsx** | 0개 | 0시간 | ✅ 완료 |

### 총 예상 작업 시간: 8-11시간

### 다음 단계

1. ✅ **이 문서 작성 완료**
2. ⏭️ **다음 대화에서 데이터 연결 계획 수립**
   - Backend → Store → Container → Content 데이터 흐름 정의
   - 각 Content가 필요로 하는 props 명세
3. ⏭️ **실제 코드 수정**
   - Phase 1: FinishedContent 보강
   - Phase 2: UnregisteredContent 보강
   - Phase 3: 모든 Content를 Props 기반으로 전환

---

**작성 완료일**: 2025-01-16
**다음 문서**: `CONTENT_DATA_CONNECTION_PLAN.md` (다음 대화에서 작성)
