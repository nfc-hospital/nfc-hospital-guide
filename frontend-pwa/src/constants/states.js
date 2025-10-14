// Frontend 상태 정의 - Backend의 common/state_definitions.py와 동기화
export const PatientJourneyState = {
  UNREGISTERED: 'UNREGISTERED',
  ARRIVED: 'ARRIVED',
  REGISTERED: 'REGISTERED',
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',  // ONGOING 대체
  // COMPLETED 제거 - IN_PROGRESS 완료 시 Backend에서 동적으로 WAITING 또는 PAYMENT로 분기
  PAYMENT: 'PAYMENT',
  FINISHED: 'FINISHED'
};

export const QueueDetailState = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_PROGRESS: 'in_progress',  // ongoing 대체
  COMPLETED: 'completed',
  DELAYED: 'delayed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled'
};

// 상태 전이 가능 여부 체크
export const canTransitionTo = (from, to) => {
  const transitions = {
    [PatientJourneyState.UNREGISTERED]: [PatientJourneyState.ARRIVED],
    [PatientJourneyState.ARRIVED]: [PatientJourneyState.REGISTERED],
    [PatientJourneyState.REGISTERED]: [PatientJourneyState.WAITING],
    [PatientJourneyState.WAITING]: [PatientJourneyState.CALLED],
    [PatientJourneyState.CALLED]: [PatientJourneyState.IN_PROGRESS],
    // IN_PROGRESS 완료 시 Backend에서 동적으로 WAITING 또는 PAYMENT로 분기
    [PatientJourneyState.IN_PROGRESS]: [PatientJourneyState.WAITING, PatientJourneyState.PAYMENT],
    [PatientJourneyState.PAYMENT]: [PatientJourneyState.FINISHED]
  };

  return transitions[from]?.includes(to) || false;
};

// 상태별 한글 표시
export const getStateDisplay = (state) => {
  const displays = {
    // Patient Journey States
    [PatientJourneyState.UNREGISTERED]: '미등록',
    [PatientJourneyState.ARRIVED]: '도착',
    [PatientJourneyState.REGISTERED]: '등록완료',
    [PatientJourneyState.WAITING]: '대기중',
    [PatientJourneyState.CALLED]: '호출됨',
    [PatientJourneyState.IN_PROGRESS]: '진행중',
    // COMPLETED 제거
    [PatientJourneyState.PAYMENT]: '수납',
    [PatientJourneyState.FINISHED]: '종료',

    // Queue Detail States (Queue 내부 상태는 유지)
    [QueueDetailState.WAITING]: '대기중',
    [QueueDetailState.CALLED]: '호출됨',
    [QueueDetailState.IN_PROGRESS]: '진행중',
    [QueueDetailState.COMPLETED]: '완료',
    [QueueDetailState.DELAYED]: '지연',
    [QueueDetailState.NO_SHOW]: '부재',
    [QueueDetailState.CANCELLED]: '취소'
  };

  return displays[state] || state;
};

// 상태별 색상 클래스
export const getStateColorClass = (state) => {
  const colors = {
    // Patient Journey States
    [PatientJourneyState.UNREGISTERED]: 'bg-gray-100 text-gray-700',
    [PatientJourneyState.ARRIVED]: 'bg-blue-100 text-blue-700',
    [PatientJourneyState.REGISTERED]: 'bg-indigo-100 text-indigo-700',
    [PatientJourneyState.WAITING]: 'bg-amber-100 text-amber-700',
    [PatientJourneyState.CALLED]: 'bg-green-100 text-green-700',
    [PatientJourneyState.IN_PROGRESS]: 'bg-purple-100 text-purple-700',
    // COMPLETED 제거
    [PatientJourneyState.PAYMENT]: 'bg-orange-100 text-orange-700',
    [PatientJourneyState.FINISHED]: 'bg-gray-300 text-gray-700',

    // Queue Detail States (Queue 내부 상태는 유지)
    [QueueDetailState.WAITING]: 'bg-amber-100 text-amber-700',
    [QueueDetailState.CALLED]: 'bg-green-100 text-green-700',
    [QueueDetailState.IN_PROGRESS]: 'bg-purple-100 text-purple-700',
    [QueueDetailState.COMPLETED]: 'bg-teal-100 text-teal-700',
    [QueueDetailState.DELAYED]: 'bg-red-100 text-red-700',
    [QueueDetailState.NO_SHOW]: 'bg-gray-100 text-gray-700',
    [QueueDetailState.CANCELLED]: 'bg-red-100 text-red-700'
  };

  return colors[state] || 'bg-gray-100 text-gray-700';
};