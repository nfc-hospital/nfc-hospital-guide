import { api } from './client';

export const PatientJourneyAPI = {
  /**
   * 현재 환자 상태 조회
   * @returns {Promise} 환자 여정 상태 정보
   */
  getCurrentState: async () => {
    try {
      const response = await api.get('/queue/patient-journey/current_state/');
      return response;
    } catch (error) {
      console.error('Failed to get current state:', error);
      throw error;
    }
  },
  
  /**
   * 액션 수행을 통한 상태 전이
   * @param {string} actionType - 수행할 액션 타입
   * @param {Object} payload - 액션에 필요한 추가 데이터
   * @returns {Promise} 변경된 상태 정보
   */
  performAction: async (actionType, payload = {}) => {
    try {
      const response = await api.post('/queue/patient-journey/perform_action/', {
        action_type: actionType,
        payload
      });
      return response;
    } catch (error) {
      console.error('Failed to perform action:', error);
      throw error;
    }
  },
  
  /**
   * 상태 정의 조회 (공개 API)
   * @returns {Promise} 상태 정의 정보
   */
  getStateDefinitions: async () => {
    try {
      const response = await api.get('/state-definitions/');
      return response;
    } catch (error) {
      console.error('Failed to get state definitions:', error);
      throw error;
    }
  }
};

// 기존 API와의 호환성을 위한 브릿지 함수들
export const migrateToNewAPI = {
  // 기존 함수명 유지하되 새 API 호출
  getPatientCurrentState: () => PatientJourneyAPI.getCurrentState(),
  
  updatePatientState: (state) => PatientJourneyAPI.performAction('manual_update', { state }),
  
  // 마이그레이션 추적
  logMigration: (oldFunc, newFunc) => {
    if (import.meta.env.DEV) {
      console.warn(`Migration: ${oldFunc} → ${newFunc}`);
    }
  }
};

export default PatientJourneyAPI;