// frontend-pwa/src/components/WaitingStatus.jsx
import React, { useState, useEffect } from 'react';

const WaitingStatus = ({ queueData, isRealTimeConnected = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [estimatedCallTime, setEstimatedCallTime] = useState(null);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 예상 호출 시간 계산
  useEffect(() => {
    if (queueData?.estimated_wait_time) {
      const callTime = new Date();
      callTime.setMinutes(callTime.getMinutes() + queueData.estimated_wait_time);
      setEstimatedCallTime(callTime);
    }
  }, [queueData?.estimated_wait_time]);

  // 상태별 색상 및 메시지
  const getStatusInfo = (state) => {
    switch (state) {
      case 'waiting':
        return {
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          message: '대기 중',
          description: '순서를 기다리고 있습니다',
          icon: '⏳'
        };
      case 'called':
        return {
          color: 'bg-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800',
          message: '호출됨',
          description: '검사실로 이동해주세요',
          icon: '📢'
        };
      case 'in_progress':
        return {
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          message: '진행 중',
          description: '검사가 진행되고 있습니다',
          icon: '🔬'
        };
      case 'completed':
        return {
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          message: '완료',
          description: '검사가 완료되었습니다',
          icon: '✅'
        };
      case 'cancelled':
        return {
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          message: '취소됨',
          description: '검사가 취소되었습니다',
          icon: '❌'
        };
      default:
        return {
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          message: '알 수 없음',
          description: '상태를 확인해주세요',
          icon: '❓'
        };
    }
  };

  // 우선순위별 표시
  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: '긴급',
          icon: '🚨'
        };
      case 'high':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: '높음',
          icon: '⚡'
        };
      case 'normal':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: '일반',
          icon: '📋'
        };
      case 'low':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '낮음',
          icon: '📝'
        };
      default:
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: '일반',
          icon: '📋'
        };
    }
  };

  // 대기 시간 포맷
  const formatWaitTime = (minutes) => {
    if (!minutes || minutes === 0) return '곧 호출 예정';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `약 ${hours}시간 ${mins}분`;
    }
    return `약 ${mins}분`;
  };

  // 시간 포맷
  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statusInfo = getStatusInfo(queueData?.state);
  const priorityInfo = getPriorityInfo(queueData?.priority);

  if (!queueData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <p>대기열 정보가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 제목과 실시간 상태 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">대기 현황</h2>
        <div className="flex items-center space-x-3">
          {/* 우선순위 표시 */}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.bgColor} ${priorityInfo.color}`}>
            {priorityInfo.icon} {priorityInfo.label}
          </span>
          
          {/* 실시간 연결 상태 */}
          {isRealTimeConnected ? (
            <span className="flex items-center text-green-600 text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              실시간 업데이트
            </span>
          ) : (
            <span className="flex items-center text-gray-500 text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
              오프라인
            </span>
          )}
        </div>
      </div>

      {/* 메인 상태 카드 */}
      <div className={`${statusInfo.bgColor} rounded-lg p-6 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{statusInfo.icon}</div>
            <div>
              <h3 className={`text-2xl font-bold ${statusInfo.textColor}`}>
                {statusInfo.message}
              </h3>
              <p className={`text-lg ${statusInfo.textColor} opacity-80`}>
                {statusInfo.description}
              </p>
            </div>
          </div>
          
          {/* 대기 번호 */}
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">대기번호</div>
            <div className={`text-4xl font-bold ${statusInfo.textColor}`}>
              {queueData.queue_number}
            </div>
          </div>
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 예상 대기시간 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">⏰</span>
            <h4 className="font-semibold text-gray-800">예상 대기시간</h4>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatWaitTime(queueData.estimated_wait_time)}
          </p>
          {estimatedCallTime && queueData.state === 'waiting' && (
            <p className="text-sm text-gray-600 mt-1">
              예상 호출: {formatTime(estimatedCallTime)}
            </p>
          )}
        </div>

        {/* 현재 시간 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">🕐</span>
            <h4 className="font-semibold text-gray-800">현재 시간</h4>
          </div>
          <p className="text-2xl font-bold text-gray-700">
            {formatTime(currentTime)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {currentTime.toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      {/* 등록 시간 정보 */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <span className="font-medium">등록시간:</span>
            {' '}
            {queueData.created_at ? 
              new Date(queueData.created_at).toLocaleString('ko-KR') : 
              '정보 없음'
            }
          </div>
          {queueData.called_at && (
            <div>
              <span className="font-medium">호출시간:</span>
              {' '}
              {new Date(queueData.called_at).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
      </div>

      {/* 상태별 특별 메시지 */}
      {queueData.state === 'called' && (
        <div className="mt-4 p-4 bg-orange-100 border-l-4 border-orange-500 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📢</span>
            <div>
              <p className="font-semibold text-orange-800">검사실에서 호출하셨습니다!</p>
              <p className="text-orange-700 text-sm">즉시 검사실로 이동해주세요.</p>
            </div>
          </div>
        </div>
      )}

      {queueData.state === 'in_progress' && (
        <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔬</span>
            <div>
              <p className="font-semibold text-green-800">검사가 진행 중입니다</p>
              <p className="text-green-700 text-sm">잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      )}

      {queueData.state === 'completed' && (
        <div className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-500 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="font-semibold text-blue-800">검사가 완료되었습니다</p>
              <p className="text-blue-700 text-sm">결과는 담당의에게 문의하세요.</p>
            </div>
          </div>
        </div>
      )}

      {/* 개발용 디버그 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <details>
            <summary className="cursor-pointer font-semibold text-yellow-800">
              🔧 디버그 정보
            </summary>
            <div className="mt-2 space-y-1 text-yellow-700">
              <div>Queue ID: {queueData.queue_id}</div>
              <div>State: {queueData.state}</div>
              <div>Priority: {queueData.priority}</div>
              <div>WebSocket: {isRealTimeConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Last Update: {queueData.updated_at}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default WaitingStatus;