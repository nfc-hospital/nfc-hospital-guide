import { useEffect, useRef, useCallback } from 'react';
import useJourneyStore from '../store/journeyStore';
import apiService from '../api/apiService';

export function useRealtimeQueues(enabled = true) {
  const intervalRef = useRef(null);
  const { setCurrentQueues, currentQueues } = useJourneyStore();
  
  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await apiService.getMyQueueStatus();
      if (response.success && response.data) {
        const updatedQueues = response.data.queues || [];
        
        // 대기열 변경 감지
        if (currentQueues.length > 0 && updatedQueues.length > 0) {
          const oldQueue = currentQueues[0];
          const newQueue = updatedQueues[0];
          
          // 호출됨 상태로 변경되었을 때 알림
          if (oldQueue.state === 'waiting' && newQueue.state === 'called') {
            // 브라우저 알림 (권한이 있는 경우)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('병원 호출 알림', {
                body: `${newQueue.exam?.title} 검사실에서 호출하셨습니다!`,
                icon: '/icon-192x192.png',
                vibrate: [200, 100, 200]
              });
            }
            
            // 화면 내 알림 (토스트 등)
            // TODO: 토스트 알림 구현
          }
        }
        
        setCurrentQueues(updatedQueues);
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  }, [currentQueues, setCurrentQueues]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // 초기 조회
    fetchQueueStatus();
    
    // 5초마다 폴링
    intervalRef.current = setInterval(fetchQueueStatus, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, fetchQueueStatus]);
  
  // 수동 새로고침 함수
  const refresh = useCallback(() => {
    return fetchQueueStatus();
  }, [fetchQueueStatus]);
  
  return { refresh };
}