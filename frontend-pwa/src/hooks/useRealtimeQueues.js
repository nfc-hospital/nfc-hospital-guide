import { useEffect, useRef, useCallback } from 'react';
import useJourneyStore from '../store/journeyStore';
import { queueAPI } from '../api/client';

export function useRealtimeQueues(enabled = true) {
  const intervalRef = useRef(null);
  const isLoadingRef = useRef(false);
  const { currentQueues } = useJourneyStore();
  const lastQueuesRef = useRef(currentQueues);
  
  const fetchQueueStatus = useCallback(async () => {
    // 중복 호출 방지
    if (isLoadingRef.current) {
      console.log('⏳ 이미 API 호출 중이므로 스킵');
      return;
    }
    
    isLoadingRef.current = true;
    try {
      const response = await queueAPI.getMyQueue();
      if (response && response.data) {
        const updatedQueues = response.data || [];
        
        // 대기열 변경 감지 (이전 상태와 비교)
        const oldQueues = lastQueuesRef.current;
        if (oldQueues.length > 0 && updatedQueues.length > 0) {
          const oldQueue = oldQueues[0];
          const newQueue = updatedQueues[0];
          
          // 호출됨 상태로 변경되었을 때 알림
          if (oldQueue.state === 'waiting' && newQueue.state === 'called') {
            // 브라우저 알림 (권한이 있는 경우)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('병원 호출 알림', {
                body: `${newQueue.exam?.title || '검사'} 검사실에서 호출하셨습니다!`,
                icon: '/icon-192x192.png',
                vibrate: [200, 100, 200]
              });
            }
          }
        }
        
        // 마지막 상태 업데이트
        lastQueuesRef.current = updatedQueues;
        
        // journeyStore 업데이트 (API 명세서에 따른 구조)
        const queueData = updatedQueues?.data || updatedQueues;
        const normalizedQueues = Array.isArray(queueData) ? queueData : (queueData ? [queueData] : []);
        
        useJourneyStore.setState({ 
          currentQueues: normalizedQueues, 
          queues: normalizedQueues 
        });
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []); // 의존성 배열에서 currentQueues 제거
  
  useEffect(() => {
    if (!enabled) return;
    
    // 초기 조회
    fetchQueueStatus();
    
    // 10초마다 폴링 (API 무한 루프 방지)
    intervalRef.current = setInterval(fetchQueueStatus, 10000);
    
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