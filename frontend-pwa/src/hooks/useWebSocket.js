// frontend-pwa/src/hooks/useWebSocket.js
import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

/**
 * WebSocket 연결을 관리하는 커스텀 Hook
 * @param {string} queueId - 대기열 ID
 * @param {Object} options - 옵션 설정
 */
export const useWebSocket = (queueId, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [lastMessage, setLastMessage] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [error, setError] = useState(null);
  
  const optionsRef = useRef(options);
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onMessage,
    onQueueUpdate,
    onError
  } = optionsRef.current;

  // WebSocket 연결
  const connect = useCallback(() => {
    if (!queueId) {
      console.warn('⚠️ queueId가 없어서 WebSocket 연결을 할 수 없습니다.');
      return;
    }

    console.log(`🔌 WebSocket 연결 시도: ${queueId}`);
    setConnectionStatus('connecting');
    setError(null);
    websocketService.connect(queueId);
  }, [queueId]);

  // WebSocket 연결 해제
  const disconnect = useCallback(() => {
    console.log('🔌 WebSocket 연결 해제 요청');
    websocketService.disconnect();
  }, []);

  // 메시지 전송
  const sendMessage = useCallback((message) => {
    websocketService.sendMessage(message);
  }, []);

  // Ping 전송
  const sendPing = useCallback(() => {
    websocketService.sendPing();
  }, []);

  // 대기열 상태 요청
  const requestQueueStatus = useCallback(() => {
    sendMessage({
      type: 'queue_status_request',
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);

  // WebSocket 이벤트 리스너 설정
  useEffect(() => {
    // 연결 성공
    const handleConnected = () => {
      console.log('✅ WebSocket 연결 성공!');
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      if (onConnect) onConnect();
    };

    // 연결 해제
    const handleDisconnected = () => {
      console.log('❌ WebSocket 연결 해제됨');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      if (onDisconnect) onDisconnect();
    };

    // 메시지 수신
    const handleMessage = (data) => {
      console.log('📨 WebSocket 메시지 수신:', data);
      setLastMessage(data);
      if (onMessage) onMessage(data);
    };

    // 대기열 업데이트
    const handleQueueUpdate = (data) => {
      console.log('🔔 대기열 업데이트:', data);
      setQueueData(data);
      if (onQueueUpdate) onQueueUpdate(data);
    };

    // 오류 발생
    const handleError = (errorData) => {
      console.error('💥 WebSocket 오류:', errorData);
      setError(errorData.error);
      setConnectionStatus('error');
      if (onError) onError(errorData.error);
    };

    // 최대 재연결 시도 초과
    const handleMaxReconnectAttempts = () => {
      console.error('❌ 최대 재연결 시도 초과');
      setConnectionStatus('failed');
      setError(new Error('최대 재연결 시도 횟수를 초과했습니다.'));
    };

    // 이벤트 리스너 등록
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('message', handleMessage);
    websocketService.on('queueUpdate', handleQueueUpdate);
    websocketService.on('error', handleError);
    websocketService.on('maxReconnectAttemptsReached', handleMaxReconnectAttempts);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('message', handleMessage);
      websocketService.off('queueUpdate', handleQueueUpdate);
      websocketService.off('error', handleError);
      websocketService.off('maxReconnectAttemptsReached', handleMaxReconnectAttempts);
    };
  }, [onConnect, onDisconnect, onMessage, onQueueUpdate, onError]);

  // 🔧 queueId가 변경될 때마다 자동 연결 (핵심 수정!)
  useEffect(() => {
    // 이전 연결이 있다면 먼저 해제
    if (isConnected) {
      console.log('🔄 새로운 queueId로 재연결을 위해 기존 연결 해제');
      disconnect();
    }

    // queueId가 있고 autoConnect가 true인 경우 연결
    if (autoConnect && queueId) {
      console.log(`🚀 queueId 변경됨: ${queueId}, 자동 연결 시작`);
      // 약간의 딜레이를 주어 이전 연결이 완전히 해제되도록 함
      const timer = setTimeout(() => {
        connect();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [queueId, autoConnect, connect, disconnect]); // isConnected 제거하여 무한 루프 방지

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      if (isConnected) {
        console.log('🧹 컴포넌트 언마운트로 인한 WebSocket 연결 해제');
        disconnect();
      }
    };
  }, [disconnect, isConnected]);

  return {
    // 상태
    isConnected,
    connectionStatus,
    lastMessage,
    queueData,
    error,
    
    // 메서드
    connect,
    disconnect,
    sendMessage,
    sendPing,
    requestQueueStatus,
    
    // 유틸리티
    getConnectionStatus: () => websocketService.getConnectionStatus()
  };
};

export default useWebSocket;