import useJourneyStore, { useJourneySelectors } from '../store/journeyStore';
import { shallow } from 'zustand/shallow';

/**
 * 환자 상태 정보를 가져오는 커스텀 훅
 * @returns {Object} 환자 상태 관련 정보
 */
export const usePatientState = () => {
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const stateFlags = useJourneyStore(useJourneySelectors.getStateFlags, shallow);
  
  return {
    user,
    patientState,
    ...stateFlags
  };
};

/**
 * 오늘의 일정을 UI용으로 포맷팅해서 가져오는 커스텀 훅
 * @returns {Array} 포맷팅된 오늘의 일정
 */
export const useTodaySchedule = () => {
  return useJourneyStore(useJourneySelectors.getTodaysScheduleForUI, shallow);
};

/**
 * 현재 단계 정보를 가져오는 커스텀 훅
 * @returns {number} 현재 단계 인덱스
 */
export const useCurrentStep = () => {
  return useJourneyStore(useJourneySelectors.getCurrentStep);
};

export default usePatientState;