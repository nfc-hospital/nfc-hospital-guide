// 커스텀 훅들을 중앙에서 export하는 index 파일

export { useCurrentTask, useCurrentExam } from './useCurrentTask';
export { useWaitingInfo, useCompletionStats } from './useWaitingInfo';
export { usePatientState, useTodaySchedule, useCurrentStep } from './usePatientState';

// 기존 훅들도 re-export (존재하는 파일들만)
export { default as useAPI } from './useAPI';
export { default as useJourney } from './useJourney';
export { default as usePatientJourney } from './usePatientJourney';
export { useRealtimeQueues } from './useRealtimeQueues';
export { default as useWebSocket } from './useWebSocket';