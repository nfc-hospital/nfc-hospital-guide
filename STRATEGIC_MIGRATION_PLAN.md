# 🎯 전략적 Content 이식 계획

**작성일**: 2025-01-16
**목적**: Screen에서 Content로 기능을 선택적이고 전략적으로 이식하여 심미적이면서도 실용적인 최종 화면 완성

---

## 🔍 핵심 원칙

1. **심미성 > 기능 과부하**: 고령자 친화적이면서도 현대적인 디자인 우선
2. **필수 기능 선별**: 모든 기능이 아닌, 사용자 여정에 진짜 필요한 기능만
3. **컴포넌트 분리**: 재사용 가능한 부분은 별도 컴포넌트로 추출
4. **코드 정리**: 717줄을 그대로 옮기지 않고, 핵심만 간결하게

---

## 1️⃣ UnregisteredScreen → UnregisteredContent

### 📊 현재 상태 분석

| 구분 | Screen (168줄) | Content (85줄) |
|------|----------------|----------------|
| **UI 스타일** | FormatBTemplate + 구조화된 섹션 | 단순한 안내 메시지 카드 |
| **실용성** | ⭐⭐⭐⭐⭐ (준비사항 체크, 예약 변경) | ⭐⭐ (정보 제공만) |
| **심미성** | ⭐⭐⭐ (템플릿 의존) | ⭐⭐⭐⭐ (깔끔한 카드 디자인) |
| **고령자 친화** | ⭐⭐⭐⭐ (큰 버튼, 명확한 액션) | ⭐⭐⭐ (간단하지만 액션 부족) |

**선택 이유:**
- **Screen의 강점**: `ExamPreparationChecklist`와 `RescheduleModal`은 실제 사용자가 준비사항을 확인하고 문제 발생 시 대응할 수 있는 **실용적 기능**
- **Content의 강점**: 환영 메시지와 NFC 안내가 더 **시각적으로 부드럽고 친근함**
- **문제**: Content에는 사용자 액션이 거의 없어 "그래서 뭘 해야 하지?"라는 혼란 발생 가능

### ✅ 채택할 요소

#### A. Screen에서 가져올 것
1. **ExamPreparationChecklist 컴포넌트** (필수 ⭐⭐⭐⭐⭐)
   - **이유**: 사용자가 검사별 준비사항을 체크리스트로 확인하고 완료 표시 가능
   - **근거**: Screen 119-137줄의 `customPreparationContent`는 단순 정보 제공이 아닌 상호작용 기능
   - **효과**: 고령자가 "뭘 준비해야 하는지" 명확히 알 수 있음

2. **RescheduleModal** (필수 ⭐⭐⭐⭐)
   - **이유**: 준비사항을 지키지 못한 경우 병원에 연락하거나 접수창구 위치 확인 가능
   - **근거**: Screen 49-96줄, 실제 병원 현장에서 발생하는 문제 대응
   - **효과**: 사용자가 막막해하지 않고 즉시 대응 가능

3. **preparationItems 구조화** (권장 ⭐⭐⭐)
   - **이유**: 공통 서류 준비사항을 명확한 데이터 구조로 제공
   - **근거**: Screen 99-111줄, 신분증/건강보험증 등 모든 검사에 필수
   - **효과**: 사용자가 기본 준비물을 빠뜨리지 않음

4. **allRequiredCompleted 상태 표시** (권장 ⭐⭐⭐)
   - **이유**: 모든 준비사항을 완료하면 "준비 완료!" 배지 표시
   - **근거**: Screen 125-128줄, 긍정적 피드백 제공
   - **효과**: 사용자의 성취감과 안심감 증대

#### B. Content에서 유지할 것
1. **환영 메시지 디자인** (필수 ⭐⭐⭐⭐⭐)
   - **이유**: Content 27-37줄의 `bg-blue-50 rounded-2xl` 디자인이 더 부드럽고 친근함
   - **근거**: 고령자 친화적 색상 대비와 명확한 메시지
   - **효과**: 첫인상이 좋고 안심감 제공

2. **NFC 스캔 안내** (필수 ⭐⭐⭐⭐)
   - **이유**: Content 40-54줄의 단계별 안내가 명확함
   - **근거**: 고령자가 NFC 기능을 처음 사용할 때 필요한 정보
   - **효과**: 기술에 익숙하지 않은 사용자도 쉽게 따라할 수 있음

3. **서비스 안내** (선택 ⭐⭐)
   - **이유**: 이용 가능한 서비스 목록 제공
   - **근거**: Content 57-67줄, 병원 시스템의 기능 소개
   - **효과**: 사용자가 어떤 혜택을 받을 수 있는지 인지

### ❌ 제거할 요소

1. **FormatBTemplate 통합** (Screen)
   - **이유**: Template에 의존하면 Content의 독립성이 떨어짐
   - **근거**: Content는 순수 컴포넌트여야 하며, Template은 Screen이 담당
   - **대안**: Content는 순수 JSX만 반환

2. **actionButtons 배열** (Screen 147-160줄)
   - **이유**: "병원 찾아오기", "전화 문의" 버튼은 FormatBTemplate의 역할
   - **근거**: Content는 정보 표시에 집중, 액션은 Template이 처리
   - **대안**: RescheduleModal 내부에 통합

### 🔄 조합 전략

```jsx
// 최종 UnregisteredContent 구조 (예상 150줄)
<div className="space-y-6">
  {/* 1. Content 환영 메시지 유지 (부드러운 디자인) */}
  <div className="bg-blue-50 rounded-2xl p-6 text-center">
    <UserPlusIcon />
    <p>병원 안내 시스템에 오신 것을 환영합니다</p>
  </div>

  {/* 2. Screen의 ExamPreparationChecklist 추가 */}
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <h3>검사별 준비사항</h3>
    <ExamPreparationChecklist
      appointments={todaysAppointments}
      onRescheduleRequest={handleRescheduleRequest}
      onCompletionChange={handleCompletionChange}
    />
    {allRequiredCompleted && (
      <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full">
        준비 완료!
      </span>
    )}
  </div>

  {/* 3. Screen의 preparationItems 추가 (공통 서류) */}
  <div className="bg-gray-50 rounded-2xl p-6">
    <h3>📄 공통 서류 준비사항</h3>
    <ul>
      <li>• 신분증 (주민등록증, 운전면허증)</li>
      <li>• 건강보험증</li>
      <li>• 의뢰서 (타 병원에서 온 경우)</li>
    </ul>
  </div>

  {/* 4. Content NFC 안내 유지 */}
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <h3>NFC 태그 스캔 방법</h3>
    <ul>
      <li>• 휴대폰의 NFC 기능을 켜주세요</li>
      <li>• 병원 내 안내판의 NFC 태그에 휴대폰을 가까이 대주세요</li>
    </ul>
  </div>

  {/* 5. Screen의 RescheduleModal 추가 */}
  <RescheduleModal
    isOpen={showRescheduleModal}
    selectedAppointment={selectedAppointment}
    onClose={() => setShowRescheduleModal(false)}
  />
</div>
```

### 📦 컴포넌트 분리

**RescheduleModal → 별도 파일로 추출**
- **위치**: `/src/components/modals/RescheduleModal.jsx`
- **이유**: UnregisteredContent와 ArrivedContent에서 재사용
- **크기**: ~50줄 (Screen 49-96줄)

### 🎨 최종 화면 설계

**목표**: 기능은 풍부하지만 복잡하지 않고, 아름답지만 실용적인 화면

**정보 계층 (위 → 아래):**
1. 환영 메시지 (파란색 카드, 부드러운 느낌) ← Content 디자인
2. 검사별 준비사항 체크리스트 (상호작용) ← Screen 기능
3. 공통 서류 준비사항 (회색 카드) ← Screen 데이터
4. NFC 스캔 안내 (흰색 카드) ← Content 안내

**예상 결과:**
- 줄 수: ~150줄 (Screen 168줄보다 간결, Content 85줄보다 풍부)
- 기능: 준비사항 체크, 예약 변경 대응
- 디자인: Content의 부드러운 카드 스타일 유지
- 사용성: 고령자가 명확히 이해하고 액션 가능

---

## 2️⃣ FinishedScreen → FinishedContent ⚠️ 최우선 작업

### 📊 현재 상태 분석

| 구분 | Screen (717줄) | Content (238줄) |
|------|----------------|------------------|
| **UI 스타일** | FormatBTemplate + 복잡한 모달 | 깔끔한 카드 디자인 |
| **실용성** | ⭐⭐⭐⭐⭐ (7개 주요 기능) | ⭐⭐ (기본 안내만) |
| **심미성** | ⭐⭐⭐⭐ (그라데이션, 애니메이션) | ⭐⭐⭐⭐⭐ (매우 깔끔) |
| **고령자 친화** | ⭐⭐⭐ (정보 과부하) | ⭐⭐⭐⭐⭐ (단순 명확) |
| **Mock 데이터** | ⭐⭐⭐⭐⭐ (완벽한 Fallback) | ⭐⭐⭐ (기본 Fallback만) |

**선택 이유:**
- **Screen의 강점**: 검사 후 주의사항, 처방전 안내, 카카오톡 메모, 알림 설정 등 **실제 병원 퇴원 시 필요한 모든 기능**
- **Content의 강점**: 축하 메시지와 완료 통계가 **시각적으로 매우 깔끔하고 명확함**
- **문제**: Screen은 기능이 너무 많아 717줄이며, Content는 너무 단순해서 사용자에게 필요한 정보 부족

### ✅ 채택할 요소

#### A. Screen에서 가져올 것

**1. 검사 후 주의사항 API 통합** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Screen 251-302줄
- **이유**: 각 검사별 실제 주의사항을 API에서 가져와 우선순위별 정렬
- **근거**:
  ```js
  // Screen의 fetchPostCareInstructions (256-294줄)
  const promises = completedAppointments.map(async (apt) => {
    const response = await apiService.getExamPostCareInstructions(apt.exam?.exam_id);
    return response.data || response;
  });
  ```
- **효과**: 채혈 후 주의사항 (high), 약물 복용 안내 (high) 등 중요도별로 표시
- **Mock Fallback**: Screen 67-124줄의 `mockPostCareInstructions` 사용

**2. 검사 후 주의사항 그룹화 로직** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Screen 404-453줄
- **이유**: API 데이터를 `type`과 `priority`로 그룹화하여 시각적으로 정리
- **근거**:
  ```js
  // Screen의 generatePrecautions (404-453줄)
  const groupedInstructions = {};
  instructionsToUse.forEach(instruction => {
    const key = `${instruction.type}_${instruction.priority}`;
    groupedInstructions[key] = {
      icon: instruction.icon || '📋',
      title: instruction.title,
      priority: instruction.priority,
      bgColor: instruction.priority === 'high'
        ? 'bg-red-50 text-red-800'  // 긴급 (빨강)
        : 'bg-orange-50 text-orange-800'  // 중요 (주황)
    };
  });
  ```
- **효과**: 고령자가 중요도를 색상으로 즉시 인지 (빨강 > 주황 > 파랑)

**3. 처방전 안내 섹션** (필수 ⭐⭐⭐⭐)
- **위치**: Screen 545-567줄
- **이유**: 약물 처방이 있는 경우 조제약국 안내 및 유효기간 안내
- **근거**:
  ```jsx
  // Screen 368-373줄
  const hasPrescription = completedAppointments.some(apt =>
    apt.exam?.department === '내과' ||
    apt.exam?.has_prescription
  );

  // Screen 545-567줄
  {hasPrescription && (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50">
      <h3>처방전 안내</h3>
      <p>조제약국에서 처방전을 제출하여 약을 받으세요.</p>
      <span>처방전은 발행일로부터 3일 이내에 사용하세요</span>
    </div>
  )}
  ```
- **효과**: 사용자가 처방전 유효기간을 놓치지 않음

**4. 카카오톡 메모 기능** (권장 ⭐⭐⭐⭐)
- **위치**: Screen 582-607줄
- **이유**: 다음 예약을 카카오톡으로 나에게 메모 보내기
- **근거**:
  ```jsx
  // Screen 582-607줄
  <button onClick={() => {
    if (window.Kakao) {
      window.Kakao.Link.sendDefault({
        objectType: 'text',
        text: `[병원 예약 알림]\n다음 예약: ${nextSchedule}`,
      });
    }
  }}>
    <h4>카카오톡 메모</h4>
    <p>나에게 예약 알림 보내기</p>
  </button>
  ```
- **효과**: 고령자가 다음 예약을 잊어버리지 않도록 카카오톡으로 리마인더 저장
- **디자인**: Screen의 그라데이션 버튼 (from-yellow-400 to-amber-500) 유지

**5. 알림 설정 모달** (선택 ⭐⭐⭐)
- **위치**: Screen 629-713줄
- **이유**: 다음 예약까지 자동 로그인 및 알림 설정
- **근거**: 3가지 혜택 (검사 전날 알림, 당일 아침 알림, 자동 로그인) + 보안 안내
- **문제**: 모달이 너무 복잡함 (85줄)
- **대안**: 간소화 버전 (40줄 내외)으로 줄여서 이식

**6. 총 소요 시간 계산** (권장 ⭐⭐⭐)
- **위치**: Screen 204-248줄
- **이유**: 첫 검사 시작 ~ 마지막 검사 완료까지 총 소요 시간 표시
- **근거**:
  ```js
  // Screen 204-248줄
  const calculateTotalDuration = () => {
    const startTimes = completedAppts.map(apt => new Date(apt.created_at));
    const endTimes = completedAppts.map(apt => new Date(apt.completed_at));
    const firstTime = new Date(Math.min(...startTimes));
    const lastTime = new Date(Math.max(...endTimes));
    return Math.round((lastTime - firstTime) / (1000 * 60)); // 분 단위
  };
  ```
- **효과**: "오늘 검사에 총 80분 소요되었습니다" 표시로 사용자에게 시간 인지 제공
- **Mock Fallback**: API 데이터 없으면 80분 고정값 (Screen 208줄)

**7. 총 비용 계산** (선택 ⭐⭐)
- **위치**: Screen 358-366줄
- **이유**: 오늘 검사의 총 본인부담금 표시
- **근거**:
  ```js
  // Screen 358-366줄
  const totalCost = completedAppointments.reduce((sum, apt) => {
    const cost = apt.exam?.patient_cost || apt.exam?.base_price || 0;
    const numericCost = parseInt(cost.replace(/[^0-9]/g, ''));
    return sum + numericCost;
  }, 0);
  ```
- **효과**: "오늘 총 진료비: 90,000원" 표시
- **문제**: FormatBTemplate이 이미 paymentAmount prop으로 표시 중
- **대안**: Content에서는 불필요, Template에 맡김

**8. Mock 데이터 Fallback 시스템** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Screen 58-201줄
- **이유**: API 데이터가 없어도 시연용 화면 표시 가능
- **근거**:
  ```js
  // Screen 58-64줄
  const mockPatientData = {
    name: '김미경',
    age: 50,
    visitPurpose: '내과 정기 검진',
  };

  // Screen 67-124줄
  const mockPostCareInstructions = [
    { type: 'blood_test', title: '채혈 후 주의사항', priority: 'high', ... },
    { type: 'medication', title: '고혈압 약물 복용 안내', priority: 'high', ... },
    ...
  ];

  // Screen 127-201줄
  const mockCompletedExams = [
    { exam: { title: '채혈 검사', cost: '35,000' }, status: 'completed', ... },
    ...
  ];
  ```
- **효과**: 개발 환경과 데모에서도 완전한 화면 표시

#### B. Content에서 유지할 것

**1. 완료 축하 메시지 디자인** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Content 106-116줄
- **이유**: Content의 디자인이 훨씬 깔끔하고 감동적임
- **근거**:
  ```jsx
  // Content 106-116줄
  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8
                  text-center border-2 border-green-200 shadow-lg">
    <CheckBadgeIcon className="w-20 h-20 text-green-600" />
    <h1 className="text-2xl text-green-800 font-bold mb-3">
      🎉 {user?.name}님, 모든 검사가 완료되었습니다!
    </h1>
    <p className="text-lg text-green-700 font-medium">
      오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.
    </p>
  </div>
  ```
- **효과**: 사용자에게 성취감과 안도감 제공
- **비교**: Screen에는 이 메시지가 없고 바로 Template으로 시작

**2. 완료 통계 카드 디자인** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Content 119-137줄
- **이유**: 2칸 그리드 레이아웃이 시각적으로 매우 명확함
- **근거**:
  ```jsx
  // Content 119-137줄
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
    <h3>📊 오늘의 검사 현황</h3>
    <div className="grid grid-cols-2 gap-6">
      <div className="text-center bg-white rounded-xl p-4">
        <p className="text-3xl font-bold text-blue-600">
          {completedCount}
        </p>
        <p>완료된 검사</p>
      </div>
      <div className="text-center bg-white rounded-xl p-4">
        <p className="text-3xl font-bold text-blue-600">
          {totalCount}
        </p>
        <p>총 검사</p>
      </div>
    </div>
  </div>
  ```
- **효과**: 고령자가 숫자를 크고 명확하게 인지
- **비교**: Screen은 FormatBTemplate에 의존하여 이런 섹션 없음

**3. 완료된 검사 목록 디자인** (필수 ⭐⭐⭐⭐)
- **위치**: Content 140-167줄
- **이유**: 각 검사를 녹색 그라데이션 카드로 표시하여 완료감 강조
- **근거**:
  ```jsx
  // Content 140-167줄
  <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
    <h3>✅ 완료된 검사 목록</h3>
    {todaySchedule.map((exam) => (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl
                      border border-green-200">
        <CheckBadgeIcon className="w-6 h-6 text-green-600" />
        <p className="text-lg font-bold">{exam.examName}</p>
        <p className="text-base text-gray-600">📍 {exam.location}</p>
        <span className="bg-green-200 px-3 py-1 rounded-full">✓ 완료</span>
      </div>
    ))}
  </div>
  ```
- **효과**: 사용자가 "내가 뭘 했는지" 명확히 확인 가능

**4. 다음 단계 안내 카드** (필수 ⭐⭐⭐⭐)
- **위치**: Content 170-220줄
- **이유**: 다음 예약 API 조회 포함, 3-4가지 안내사항 제공
- **근거**:
  ```jsx
  // Content 24-42줄 (다음 예약 API 조회)
  useEffect(() => {
    const fetchNextAppointment = async () => {
      const response = await PatientJourneyAPI.getNextAppointment();
      if (response.success) setNextAppointment(response.data);
    };
    fetchNextAppointment();
  }, []);

  // Content 176-199줄 (다음 예약 표시)
  {nextAppointment && (
    <li className="bg-blue-50 rounded-xl">
      <CalendarIcon />
      <strong>다음 예약:</strong> {nextAppointment.scheduled_at}
    </li>
  )}
  ```
- **효과**: 사용자가 다음 방문 일정을 놓치지 않음

**5. 감사 인사 카드** (필수 ⭐⭐⭐⭐⭐)
- **위치**: Content 223-231줄
- **이유**: 따뜻한 마무리 메시지로 사용자 경험 완성
- **근거**:
  ```jsx
  // Content 223-231줄
  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8
                  text-center">
    <div className="text-4xl mb-3">🙏</div>
    <h4 className="text-xl font-bold text-gray-800 mb-2">
      저희 병원을 이용해 주셔서 감사합니다
    </h4>
    <p className="text-base text-gray-600">
      더 나은 서비스로 보답하겠습니다
    </p>
  </div>
  ```
- **효과**: 긍정적인 마지막 인상 제공

### ❌ 제거할 요소

**1. FormatBTemplate 통합** (Screen 528-714줄)
- **이유**: Content는 순수 컴포넌트여야 함
- **대안**: Screen이 Template 사용, Content는 순수 JSX만

**2. 복잡한 CSS 애니메이션** (Screen 11-33줄)
- **이유**: `@keyframes fadeUp, slideDown` 등이 과도함
- **근거**: 고령자에게는 단순한 전환이 더 편안함
- **대안**: Tailwind의 `transition-all duration-300`만 사용

**3. Mock 데이터의 과도한 상세** (Screen 127-201줄)
- **이유**: mockCompletedExams가 4개 검사 × 10개 필드로 너무 상세
- **근거**: Content의 fallbackAppointments (58-62줄)처럼 최소한만 필요
- **대안**: 3개 검사 × 5개 필드로 간소화

**4. 시연용 위치 데이터** (Screen 496-523줄)
- **이유**: locationInfo의 pathNodes 등이 너무 구체적
- **근거**: Content에서는 위치 정보가 필요 없음 (Template이 처리)
- **대안**: 제거

**5. 총 비용 계산 로직** (Screen 358-366줄)
- **이유**: FormatBTemplate의 paymentAmount prop으로 충분
- **근거**: Content에서 중복 계산 불필요
- **대안**: 제거

### 🔄 조합 전략

```jsx
// 최종 FinishedContent 구조 (예상 400줄)
<div className="space-y-6">
  {/* 1. Content 축하 메시지 유지 (감동적 디자인) */}
  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
    <CheckBadgeIcon className="w-20 h-20 text-green-600" />
    <h1>🎉 {user?.name}님, 모든 검사가 완료되었습니다!</h1>
    <p>오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.</p>
  </div>

  {/* 2. Content 완료 통계 유지 (명확한 2칸 그리드) */}
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
    <h3>📊 오늘의 검사 현황</h3>
    <div className="grid grid-cols-2 gap-6">
      <div><p className="text-3xl font-bold">{completedCount}</p></div>
      <div><p className="text-3xl font-bold">{totalCount}</p></div>
    </div>
  </div>

  {/* 3. Screen의 검사 후 주의사항 추가 (우선순위별 정렬) */}
  <div className="bg-white rounded-2xl p-6">
    <h3>⚠️ 검사 후 주의사항</h3>
    {precautions.map(group => (
      <div className={group.bgColor}>  {/* high=빨강, medium=주황 */}
        <p>{group.icon} {group.title}</p>
        <ul>
          {group.items.map(item => <li>• {item}</li>)}
        </ul>
      </div>
    ))}
  </div>

  {/* 4. Screen의 처방전 안내 추가 */}
  {hasPrescription && (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6">
      <h3>💊 처방전 안내</h3>
      <p>조제약국에서 처방전을 제출하여 약을 받으세요.</p>
      <span>처방전은 발행일로부터 3일 이내에 사용하세요</span>
    </div>
  )}

  {/* 5. Content 완료 검사 목록 유지 (녹색 카드) */}
  <div className="bg-white rounded-2xl p-6">
    <h3>✅ 완료된 검사 목록</h3>
    {todaySchedule.map(exam => (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CheckBadgeIcon />
        <p>{exam.examName}</p>
        <span>✓ 완료</span>
      </div>
    ))}
  </div>

  {/* 6. Screen의 카카오톡 메모 + 알림 설정 추가 */}
  {nextAppointment && (
    <div className="grid grid-cols-1 gap-4">
      <button className="bg-gradient-to-br from-yellow-400 to-amber-500"
              onClick={handleKakaoMemo}>
        <h4>카카오톡 메모</h4>
        <p>나에게 예약 알림 보내기</p>
      </button>
      <button className="bg-gradient-to-br from-blue-500 to-indigo-600"
              onClick={() => setShowModal(true)}>
        <h4>알림 설정</h4>
        <p>다음 예약까지 자동 알림</p>
      </button>
    </div>
  )}

  {/* 7. Content 다음 단계 안내 유지 */}
  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
    <h3>📋 다음 단계 안내</h3>
    <ul>
      {nextAppointment && <li>다음 예약: {nextAppointment.scheduled_at}</li>}
      <li>검사 결과는 담당 의료진이 검토 후 안내드립니다</li>
      <li>귀가 전 수납이 완료되었는지 확인해주세요</li>
    </ul>
  </div>

  {/* 8. Content 감사 인사 유지 (따뜻한 마무리) */}
  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8">
    <div className="text-4xl mb-3">🙏</div>
    <h4>저희 병원을 이용해 주셔서 감사합니다</h4>
  </div>

  {/* 9. Screen의 알림 설정 모달 (간소화 버전) */}
  {showModal && (
    <NotificationModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      nextSchedule={nextSchedule}
    />
  )}
</div>
```

### 📦 컴포넌트 분리

**1. NotificationModal → 별도 파일로 추출**
- **위치**: `/src/components/modals/NotificationModal.jsx`
- **이유**: 알림 설정 모달이 85줄로 너무 김
- **간소화**: 40줄로 축소 (헤더 + 3가지 혜택 + 보안 안내 + 버튼)
- **재사용**: FinishedContent에서만 사용

**2. PostCareInstructions → 별도 컴포넌트로 추출**
- **위치**: `/src/components/journey/PostCareInstructions.jsx`
- **이유**: 검사 후 주의사항 로직이 복잡함 (API 조회 + 그룹화 + 정렬)
- **크기**: ~80줄
- **재사용**: FinishedContent에서만 사용하지만 코드 가독성 향상

### 🎨 최종 화면 설계

**목표**: 기능은 풍부하지만 복잡하지 않고, 아름답지만 실용적인 화면

**정보 계층 (위 → 아래):**
1. 축하 메시지 (녹색 그라데이션) ← Content 디자인
2. 완료 통계 (2칸 그리드) ← Content 디자인
3. **검사 후 주의사항 (우선순위별)** ← Screen 기능 ⭐ 추가
4. **처방전 안내** ← Screen 기능 ⭐ 추가
5. 완료 검사 목록 ← Content 디자인
6. **카카오톡 메모 + 알림 설정** ← Screen 기능 ⭐ 추가
7. 다음 단계 안내 ← Content 디자인
8. 감사 인사 ← Content 디자인

**예상 결과:**
- 줄 수: ~400줄 (Screen 717줄보다 간결, Content 238줄보다 풍부)
- 기능: 주의사항, 처방전, 카카오톡 메모, 알림 설정, 다음 예약
- 디자인: Content의 깔끔한 카드 스타일 유지
- Mock 데이터: Screen의 Fallback 시스템 유지
- 사용성: 정보 과부하 없이 필수 기능만 제공

---

## 🎯 작업 우선순위 및 예상 시간

| 작업 | 예상 시간 | 난이도 | 우선순위 |
|------|-----------|--------|----------|
| **1. FinishedContent 보강** | 6-8시간 | ⭐⭐⭐⭐⭐ | 🔴 **High** |
| **2. UnregisteredContent 보강** | 2-3시간 | ⭐⭐⭐ | 🟡 Medium |
| **3. 컴포넌트 분리 (RescheduleModal)** | 1시간 | ⭐⭐ | 🟡 Medium |
| **4. 컴포넌트 분리 (NotificationModal)** | 1시간 | ⭐⭐ | 🟡 Medium |
| **5. 컴포넌트 분리 (PostCareInstructions)** | 2시간 | ⭐⭐⭐ | 🟢 Low |
| **6. 테스트 및 디버깅** | 2-3시간 | ⭐⭐⭐ | 🟡 Medium |
| **합계** | **14-18시간** | - | - |

---

## 📋 다음 단계

### Phase 1: FinishedContent 보강 (6-8시간)
1. Screen의 Mock 데이터 Fallback 시스템 이식
2. 검사 후 주의사항 API 통합 및 그룹화 로직 추가
3. 처방전 안내 섹션 추가
4. 카카오톡 메모 버튼 추가
5. 알림 설정 모달 간소화 버전 추가
6. Content의 깔끔한 디자인 유지

### Phase 2: UnregisteredContent 보강 (2-3시간)
1. ExamPreparationChecklist 컴포넌트 통합
2. RescheduleModal 별도 파일로 추출
3. preparationItems 데이터 추가
4. allRequiredCompleted 상태 관리 추가
5. Content의 환영 메시지 디자인 유지

### Phase 3: 컴포넌트 분리 (4시간)
1. RescheduleModal 추출
2. NotificationModal 간소화 및 추출
3. PostCareInstructions 추출

### Phase 4: 테스트 및 최적화 (2-3시간)
1. 각 Content 컴포넌트 단독 테스트
2. Mock 데이터 동작 확인
3. API 연동 테스트
4. 고령자 친화적 디자인 검증

---

## 🎨 디자인 일관성 체크리스트

모든 Content 파일이 CLAUDE.md의 디자인 원칙을 준수하는지 확인:

- [ ] **큰 글씨**: 최소 18px, 중요 정보 24px 이상
- [ ] **높은 대비**: 텍스트와 배경 대비비 4.5:1 이상
- [ ] **충분한 터치 영역**: 버튼 최소 44x44px
- [ ] **부드러운 애니메이션**: transition 300ms
- [ ] **원클릭 중심**: 복잡한 네비게이션 없음
- [ ] **즉시 피드백**: 모든 상호작용에 반응
- [ ] **상태별 색상**: 대기=amber, 호출=green, 진행=blue, 완료=gray

---

**작성 완료일**: 2025-01-16
**다음 문서**: 실제 코드 수정 시작 (FinishedContent부터)

**핵심 메시지**:
- Screen의 모든 기능을 그대로 옮기지 않음
- Content의 아름다운 디자인을 최대한 보존
- 고령자가 진짜 필요로 하는 기능만 선별
- 코드 간결성과 유지보수성 우선
