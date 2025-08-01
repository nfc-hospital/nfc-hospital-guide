// frontend-pwa/src/components/WebSocketTest.jsx
import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketTest = () => {
  const [queueId, setQueueId] = useState('6bfe1e24-0f80-4e09-a260-7e92499963c7'); // 실제 Queue ID
  const [messages, setMessages] = useState([]);
  
  const {
    isConnected,
    connectionStatus,
    lastMessage,
    queueData,
    error,
    connect,
    disconnect,
    sendPing,
    requestQueueStatus
  } = useWebSocket(queueId, {
    autoConnect: false, // 수동 연결로 테스트
    onConnect: () => {
      addMessage('✅ WebSocket 연결 성공!', 'success');
    },
    onDisconnect: () => {
      addMessage('❌ WebSocket 연결 해제됨', 'error');
    },
    onMessage: (data) => {
      addMessage(`📨 메시지 수신: ${JSON.stringify(data)}`, 'info');
    },
    onQueueUpdate: (data) => {
      addMessage(`🔔 대기열 업데이트: ${JSON.stringify(data)}`, 'update');
    },
    onError: (error) => {
      addMessage(`💥 오류 발생: ${error.message}`, 'error');
    }
  });

  const addMessage = (message, type) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { message, type, timestamp }]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'failed': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 연결됨';
      case 'connecting': return '🟡 연결 중...';
      case 'error': return '🔴 오류';
      case 'failed': return '🔴 연결 실패';
      default: return '⚪ 연결 안됨';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">🧪 WebSocket 연결 테스트</h1>
      
      {/* 연결 상태 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📡 연결 상태</h2>
        <p className={`text-lg font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        {error && (
          <p className="text-red-600 text-sm mt-2">
            오류: {error.message}
          </p>
        )}
      </div>

      {/* Queue ID 입력 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Queue ID:
        </label>
        <input
          type="text"
          value={queueId}
          onChange={(e) => setQueueId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Queue ID를 입력하세요"
        />
      </div>

      {/* 제어 버튼들 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={connect}
          disabled={isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          연결
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          연결 해제
        </button>
        <button
          onClick={sendPing}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          Ping 전송
        </button>
        <button
          onClick={requestQueueStatus}
          disabled={!isConnected}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          상태 요청
        </button>
        <button
          onClick={clearMessages}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          로그 지우기
        </button>
      </div>

      {/* 현재 대기열 데이터 */}
      {queueData && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📊 현재 대기열 정보</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Queue ID: {queueData.queue_id}</div>
            <div>상태: {queueData.state}</div>
            <div>대기번호: {queueData.queue_number}</div>
            <div>메시지: {queueData.message}</div>
          </div>
        </div>
      )}

      {/* 메시지 로그 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">📝 실시간 로그</h3>
        <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">메시지가 없습니다.</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`mb-2 text-sm ${
                msg.type === 'success' ? 'text-green-600' :
                msg.type === 'error' ? 'text-red-600' :
                msg.type === 'update' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                <span className="font-mono text-xs text-gray-400">
                  [{msg.timestamp}]
                </span>
                {' '}
                {msg.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 사용 가이드 */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">📋 테스트 가이드:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Queue ID를 입력하고 "연결" 버튼 클릭</li>
          <li>"Ping 전송"으로 연결 상태 확인</li>
          <li>"상태 요청"으로 대기열 정보 조회</li>
          <li>백엔드에서 대기열 상태를 변경하면 실시간 알림 확인</li>
        </ol>
      </div>
    </div>
  );
};

export default WebSocketTest;