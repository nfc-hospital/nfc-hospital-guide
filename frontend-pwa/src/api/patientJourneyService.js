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
  },

  /**
   * 다음 예약 조회
   * @returns {Promise} 다음 예약 정보
   */
  getNextAppointment: async () => {
    try {
      const response = await api.get('/queue/patient/next-appointment/');
      return response;
    } catch (error) {
      console.error('Failed to get next appointment:', error);
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

// 상태 정의를 앱 시작 시 로드하고 저장
let stateDefinitions = null;

export const loadStateDefinitions = async () => {
    if (!stateDefinitions) {
        try {
            const response = await PatientJourneyAPI.getStateDefinitions();
            stateDefinitions = response.data || response;
        } catch (error) {
            console.warn('Failed to load state definitions, using fallback');
            // Fallback: 하드코딩된 상태 정의
            stateDefinitions = {
                journey_states: [
                    'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING', 
                    'CALLED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT', 'FINISHED'
                ],
                queue_states: [
                    'waiting', 'called', 'in_progress', 'completed', 
                    'delayed', 'no_show', 'cancelled'
                ],
                mappings: {
                    queue_to_journey: {
                        'waiting': 'WAITING',
                        'called': 'CALLED', 
                        'in_progress': 'IN_PROGRESS',
                        'completed': 'COMPLETED',
                        'delayed': 'WAITING',
                        'no_show': 'WAITING',
                        'cancelled': 'COMPLETED'
                    },
                    journey_to_queue: {
                        'WAITING': 'waiting',
                        'CALLED': 'called',
                        'IN_PROGRESS': 'in_progress', 
                        'COMPLETED': 'completed'
                    }
                }
            };
        }
    }
    return stateDefinitions;
};

export const getStateDefinitions = () => stateDefinitions;

// 🔧 상태 정규화 함수들 - 'ongoing' → 'in_progress' 변환
export const normalizeQueueState = (state) => {
    if (!state) return state;
    
    // 주요 변환 규칙
    const normalizations = {
        'ongoing': 'in_progress',
        'ONGOING': 'IN_PROGRESS',
        // 추가 정규화 규칙이 필요하면 여기에 추가
    };
    
    return normalizations[state] || state;
};

// 대기열 데이터 정규화
export const normalizeQueueData = (queues) => {
    if (!Array.isArray(queues)) return queues;
    
    return queues.map(queue => ({
        ...queue,
        state: normalizeQueueState(queue.state)
    }));
};

// 환자 상태 정규화
export const normalizePatientState = (state) => {
    if (!state) return state;
    
    const normalizations = {
        'ongoing': 'IN_PROGRESS',
        'ONGOING': 'IN_PROGRESS',
    };
    
    return normalizations[state] || state;
};

// 상태 일관성 체크
export const validateStateConsistency = (patientState, queueStates = []) => {
    const issues = [];
    
    // 'ongoing' 상태 감지
    if (patientState && patientState.toLowerCase().includes('ongoing')) {
        issues.push({
            type: 'deprecated_state',
            field: 'patientState',
            value: patientState,
            suggestion: normalizePatientState(patientState)
        });
    }
    
    queueStates.forEach((queue, index) => {
        if (queue.state && queue.state.toLowerCase().includes('ongoing')) {
            issues.push({
                type: 'deprecated_state',
                field: `queueStates[${index}].state`,
                value: queue.state,
                suggestion: normalizeQueueState(queue.state)
            });
        }
    });
    
    return {
        isValid: issues.length === 0,
        issues
    };
};

export default PatientJourneyAPI;