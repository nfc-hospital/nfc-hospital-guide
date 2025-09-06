import { useState, useEffect, useCallback, useRef } from 'react';
import { PatientJourneyAPI } from '../api/patientJourneyService';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const usePatientJourney = () => {
  const [journeyState, setJourneyState] = useState(null);
  const [queueDetails, setQueueDetails] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  
  useEffect(() => {
    // 초기 데이터 로드
    loadInitialState();
    
    // WebSocket 연결
    connectWebSocket();
    
    return () => {
      cleanup();
    };
  }, []);
  
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
  };
  
  const loadInitialState = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PatientJourneyAPI.getCurrentState();
      updateState(data);
    } catch (err) {
      console.error('Failed to load initial state:', err);
      setError('Failed to load patient state');
    } finally {
      setLoading(false);
    }
  };
  
  const updateState = (data) => {
    setJourneyState(data.journey_state);
    setQueueDetails(data.queue_details);
    setAppointments(data.appointments);
    setAvailableActions(data.available_actions);
  };
  
  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No auth token, skipping WebSocket connection');
      return;
    }
    
    const ws = new WebSocket(`${WS_BASE_URL}/ws/patient-journey/?token=${token}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
      
      // 연결되면 즉시 초기 상태 요청
      ws.send(JSON.stringify({ command: 'fetch_initial_state' }));
      
      // 연결 유지를 위한 ping
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ command: 'ping' }));
        }
      }, 30000); // 30초마다
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'initial_state':
          case 'state_update':
          case 'action_result':
            const { payload } = message;
            updateState(payload);
            break;
            
          case 'pong':
            // 연결 확인
            break;
            
          case 'error':
            console.error('WebSocket error message:', message.error);
            setError(message.error);
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setError('Connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // 재연결 시도
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }, 3000);
    };
    
    wsRef.current = ws;
  };
  
  const performAction = useCallback(async (actionType, payload = {}) => {
    setError(null);
    
    // WebSocket이 연결되어 있으면 WebSocket 사용
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: 'perform_action',
        action_type: actionType,
        payload
      }));
      return;
    }
    
    // WebSocket이 연결되지 않은 경우 HTTP 폴백
    try {
      const data = await PatientJourneyAPI.performAction(actionType, payload);
      updateState(data);
      return data;
    } catch (error) {
      console.error('Action failed:', error);
      setError(error.response?.data?.error || 'Action failed');
      throw error;
    }
  }, []);
  
  const refresh = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'fetch_initial_state' }));
    } else {
      // HTTP로 새로고침
      await loadInitialState();
    }
  }, []);
  
  // 액션 수행 헬퍼 함수들
  const scanNFC = useCallback((tagId) => {
    return performAction('scan_nfc', { tag_id: tagId });
  }, [performAction]);
  
  const register = useCallback(() => {
    return performAction('register');
  }, [performAction]);
  
  const confirmArrival = useCallback((examId) => {
    return performAction('confirm_arrival', { exam_id: examId });
  }, [performAction]);
  
  const enterExamRoom = useCallback((examId) => {
    return performAction('enter_exam_room', { exam_id: examId });
  }, [performAction]);
  
  const completeExam = useCallback((examId) => {
    return performAction('complete_exam', { exam_id: examId });
  }, [performAction]);
  
  const makePayment = useCallback(() => {
    return performAction('make_payment');
  }, [performAction]);
  
  const leaveHospital = useCallback(() => {
    return performAction('leave_hospital');
  }, [performAction]);
  
  return {
    // 상태
    journeyState,
    queueDetails,
    appointments,
    availableActions,
    loading,
    isConnected,
    error,
    
    // 액션
    performAction,
    refresh,
    
    // 헬퍼 액션들
    scanNFC,
    register,
    confirmArrival,
    enterExamRoom,
    completeExam,
    makePayment,
    leaveHospital
  };
};

export default usePatientJourney;