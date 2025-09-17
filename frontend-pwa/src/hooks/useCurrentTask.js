import useJourneyStore, { useJourneySelectors } from '../store/journeyStore';
import { shallow } from 'zustand/shallow';

/**
 * 현재 진행중인 작업을 가져오는 커스텀 훅
 * @returns {Object|null} 현재 진행중인 작업 정보
 */
export const useCurrentTask = () => {
  return useJourneyStore(useJourneySelectors.getCurrentTask, shallow);
};

/**
 * 현재 검사 정보를 가져오는 커스텀 훅
 * @returns {Object|null} 현재 검사 정보
 */
export const useCurrentExam = () => {
  return useJourneyStore(useJourneySelectors.getCurrentExam, shallow);
};

export default useCurrentTask;