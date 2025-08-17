import { useEffect, useCallback } from 'react';
import useJourneyStore from '../store/journeyStore';
import { appointmentAPI, queueAPI } from '../api/client';

/**
 * 환자 여정 관리를 위한 커스텀 훅
 * journeyStore의 주요 기능들을 쉽게 사용할 수 있도록 래핑
 */
export default function useJourney() {
  const {
    // 상태
    user,
    patientState,
    isLoading,
    error,
    taggedLocationInfo,
    
    // 대기열/예약 정보
    todaysAppointments,
    currentQueues,
    
    // 액션
    fetchJourneyData,
    updatePatientState,
    checkInQueue,
    acknowledgeCall,
    clearError,
    fetchTagInfo,
    clearTagInfo,
  } = useJourneyStore();

  // 오늘 예약 정보 가져오기
  const fetchTodaysAppointments = useCallback(async () => {
    try {
      const response = await appointmentAPI.getTodaysAppointments();
      useJourneyStore.setState({ 
        todaysAppointments: response.data || [],
        appointments: response.data || [] 
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      return [];
    }
  }, []);

  // 내 대기열 정보 가져오기
  const fetchMyQueues = useCallback(async () => {
    try {
      const response = await queueAPI.getMyQueue();
      useJourneyStore.setState({ 
        currentQueues: response.data || [],
        queues: response.data || [] 
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch queues:', error);
      return [];
    }
  }, []);

  // 여정 데이터 새로고침
  const refreshJourneyData = useCallback(async () => {
    await fetchJourneyData();
    // 추가로 예약과 대기열 정보도 새로고침
    if (user?.role === 'patient') {
      await Promise.all([
        fetchTodaysAppointments(),
        fetchMyQueues()
      ]);
    }
  }, [fetchJourneyData, fetchTodaysAppointments, fetchMyQueues, user]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (!user) {
      fetchJourneyData();
    }
  }, []);

  return {
    // 상태
    user,
    patientState,
    isLoading,
    error,
    taggedLocationInfo,
    todaysAppointments: todaysAppointments || [],
    currentQueues: currentQueues || [],
    
    // 계산된 값
    hasAppointments: (todaysAppointments?.length || 0) > 0,
    hasActiveQueues: (currentQueues?.filter(q => 
      q.state === 'waiting' || q.state === 'ongoing'
    )?.length || 0) > 0,
    
    // 액션
    fetchJourneyData,
    refreshJourneyData,
    updatePatientState,
    checkInQueue,
    acknowledgeCall,
    clearError,
    fetchTagInfo,
    clearTagInfo,
    fetchTodaysAppointments,
    fetchMyQueues,
  };
}