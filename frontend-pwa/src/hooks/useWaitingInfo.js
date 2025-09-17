import useJourneyStore, { useJourneySelectors } from '../store/journeyStore';
import { shallow } from 'zustand/shallow';

/**
 * 대기 정보를 가져오는 커스텀 훅
 * @returns {Object|null} 대기 정보 (대기 인원, 예상 시간 등)
 */
export const useWaitingInfo = () => {
  return useJourneyStore(useJourneySelectors.getWaitingInfo, shallow);
};

/**
 * 완료 통계를 가져오는 커스텀 훅
 * @returns {Object} 완료 통계 (완료된 검사 수, 전체 검사 수 등)
 */
export const useCompletionStats = () => {
  return useJourneyStore(useJourneySelectors.getCompletionStats, shallow);
};

export default useWaitingInfo;