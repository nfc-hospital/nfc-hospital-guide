// frontend-pwa/src/pages/Exam.jsx - 개선 버전
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import WaitingStatus from '../components/WaitingStatus';
import ExamInfo from '../components/ExamInfo';

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // 대기열 상태 관리
  const [queueData, setQueueData] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ WebSocket용 별도 queueId state
  const [currentQueueId, setCurrentQueueId] = useState(null);
  
  // 실시간 알림 상태
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);

  // ✅ 개선된 WebSocket 연결 (자동 연결)
  const {
    isConnected,
    connectionStatus,
    queueData: realTimeQueueData,
    connect,
    disconnect
  } = useWebSocket(currentQueueId, {
    autoConnect: true, // ← 자동 연결로 변경
    onConnect: () => {
      console.log('✅ 실시간 대기열 연결 성공!');
      addNotification('실시간 업데이트가 활성화되었습니다.', 'success');
    },
    onDisconnect: () => {
      console.log('❌ 실시간 연결이 해제되었습니다.');
      addNotification('실시간 연결이 해제되었습니다.', 'warning');
    },
    onQueueUpdate: (data) => {
      console.log('🔔 실시간 대기열 업데이트:', data);
      
      // 대기열 데이터 업데이트
      setQueueData(prev => ({
        ...prev,
        ...data,
        state: data.new_state || data.state,
        queue_number: data.new_number || data.queue_number
      }));
      
      // 사용자에게 알림 표시
      if (data.message) {
        addNotification(data.message, getNotificationType(data.new_state || data.state));
        
        // 호출 상태일 때 특별한 처리
        if (data.new_state === 'called' || data.state === 'called') {
          showCallNotification();
        }
      }
    },
    onError: (error) => {
      console.error('💥 WebSocket 오류:', error);
      addNotification('실시간 연결에 문제가 발생했습니다.', 'error');
    }
  });

  // 알림 추가 함수
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  // 알림 타입 결정
  const getNotificationType = (state) => {
    switch (state) {
      case 'called': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  // 호출 알림 표시
  const showCallNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🏥 검사실 호출', {
        body: '검사실에서 호출하셨습니다. 즉시 검사실로 이동해주세요.',
        icon: '/favicon.ico',
        tag: 'queue-call'
      });
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    addNotification('🚨 검사실에서 호출하셨습니다! 즉시 이동해주세요.', 'urgent');
  };

  // 초기 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 인증 확인
        if (!isAuthenticated) {
          console.warn('로그인이 필요합니다.');
          navigate('/login');
          return;
        }
        
        // 1. 검사 정보 조회
        const examResponse = await fetch(`/api/v1/exams/${examId}/`);
        if (!examResponse.ok) throw new Error('검사 정보를 불러올 수 없습니다.');
        const examData = await examResponse.json();
        setExamInfo(examData);
        
        // 2. 대기열 정보 조회 - 임시로 스킵하고 참가 버튼 표시
        console.log('ℹ️ JWT 토큰 구조 문제로 인해 대기열 조회를 임시로 스킵합니다.');
        console.log('💡 대기열 참가 버튼을 통해 새로 참가하세요.');
        setQueueData(null); // 참가 버튼 표시
        
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, navigate, isAuthenticated]);

  // ✅ 개선된 대기열 참가 함수
  const joinQueue = async () => {
    try {
      console.log('🧪 JWT 토큰 문제로 인해 임시 테스트 데이터를 사용합니다.');
      
      const queueId = '6bfe1e24-0f80-4e09-a260-7e92499963c7';
      const tempQueueData = {
        queue_id: queueId,
        state: 'waiting',
        queue_number: 1,
        estimated_wait_time: 15,
        exam_id: examId,
        user_id: user?.id
      };
      
      console.log('📝 대기열 데이터 설정:', tempQueueData);
      setQueueData(tempQueueData);
      
      console.log('🔌 WebSocket 연결용 queueId 설정:', queueId);
      setCurrentQueueId(queueId); // ← 이렇게 하면 useWebSocket이 자동으로 연결!
      
      addNotification('임시 테스트 대기열에 참가했습니다!', 'success');
      
    } catch (err) {
      console.error('대기열 참가 오류:', err);
      addNotification(err.message, 'error');
    }
  };

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addNotification('알림 권한이 허용되었습니다.', 'success');
      }
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // currentQueueId를 null로 설정하면 useWebSocket이 자동으로 연결 해제
      setCurrentQueueId(null);
    };
  }, []);

  // 로딩 중
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">검사 정보를 불러오는 중...</span>
      </div>
    );
  }

  // 오류 발생
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">❌ {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 실시간 연결 상태 표시 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧪 검사 대기 (테스트 모드)</h1>
        <div className="flex items-center space-x-4">
          {/* WebSocket 연결 상태 */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span>{isConnected ? '실시간 연결됨' : '연결 안됨'}</span>
          </div>
          
          {/* 알림 권한 요청 버튼 */}
          {Notification.permission === 'default' && (
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              알림 허용
            </button>
          )}
        </div>
      </div>

      {/* JWT 토큰 문제 안내 */}
      <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-400 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>임시 테스트 모드:</strong> JWT 토큰 구조 문제로 인해 실제 API 대신 테스트 데이터를 사용 중입니다. 
              WebSocket 실시간 기능은 정상 작동합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 실시간 알림 표시 */}
      {showNotification && notifications.length > 0 && (
        <div className="mb-4">
          {notifications.slice(0, 1).map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg animate-pulse ${
                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                notification.type === 'urgent' ? 'bg-red-200 text-red-900 font-bold' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* 검사 정보 */}
      {examInfo && <ExamInfo examInfo={examInfo} />}

      {/* 대기열 상태 또는 참가 버튼 */}
      {queueData ? (
        <WaitingStatus 
          queueData={{
            ...queueData,
            // 실시간 데이터가 있으면 우선 사용
            ...(realTimeQueueData && {
              state: realTimeQueueData.new_state || realTimeQueueData.state,
              queue_number: realTimeQueueData.new_number || realTimeQueueData.queue_number
            })
          }}
          isRealTimeConnected={isConnected}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">대기열 참가 (테스트)</h2>
          <p className="text-gray-600 mb-6">
            JWT 토큰 문제로 인해 임시 테스트 데이터로 WebSocket 기능을 테스트합니다.
          </p>
          <button
            onClick={joinQueue}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
          >
            테스트 대기열 참가하기
          </button>
        </div>
      )}

      {/* 개발용 디버그 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">🔧 디버그 정보</h3>
          <div className="text-sm space-y-1">
            <div>WebSocket 상태: {connectionStatus}</div>
            <div>Current Queue ID: {currentQueueId || 'None'}</div>
            <div>Queue Data ID: {queueData?.queue_id || 'None'}</div>
            <div>현재 상태: {queueData?.state || 'None'}</div>
            <div>실시간 데이터: {realTimeQueueData ? 'Yes' : 'No'}</div>
            <div>로그인 사용자: {user?.name || 'None'}</div>
            <div>JWT 토큰: {localStorage.getItem('accessToken') ? 'Yes (구조 문제 있음)' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exam;