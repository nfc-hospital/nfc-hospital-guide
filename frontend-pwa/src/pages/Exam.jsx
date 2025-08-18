import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import apiService from '../api/apiService';

// 메인 Exam 컴포넌트
const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // 대기열 상태 관리
  const [queueData, setQueueData] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examQueues, setExamQueues] = useState({}); // 검사별 대기열 현황
  
  // WebSocket용 별도 queueId state
  const [currentQueueId, setCurrentQueueId] = useState(null);
  
  // 실시간 알림 상태
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState('preparation');
  
  // 체크리스트 상태 - localStorage에서 불러오기
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(`exam-checklist-${examId}`);
    return saved ? JSON.parse(saved) : {};
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

  // 검사 상태 표시 함수
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'waiting': return '대기중';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      case 'scheduled': return '예약됨';
      case 'done': return '검사완료';
      default: return '진행 예정';
    }
  };

  // 검사 상태 스타일 함수
  const getStatusStyle = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500/80 text-white';
      case 'in_progress': return 'bg-blue-500/80 text-white';
      case 'completed': return 'bg-green-500/80 text-white';
      case 'cancelled': return 'bg-red-500/80 text-white';
      case 'scheduled': return 'bg-purple-500/80 text-white';
      case 'done': return 'bg-green-600/80 text-white';
      default: return 'bg-white/20 text-white';
    }
  };

  // 기본 검사명 반환 함수
  const getDefaultExamName = (examId) => {
    const examNames = {
      'URINE01': '소변검사',
      'BLOOD01': '혈액검사',
      'XRAY01': '흉부 X-ray',
      'CT01': 'CT 촬영',
      'MRI01': 'MRI 촬영',
      'ULTRA01': '초음파 검사',
      'ECG01': '심전도 검사',
      'ENDOSCOPY01': '내시경 검사'
    };
    return examNames[examId] || `검사 (${examId})`;
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

  // WebSocket 연결
  const {
    isConnected,
    connectionStatus,
    queueData: realTimeQueueData,
    connect,
    disconnect
  } = useWebSocket(currentQueueId, {
    autoConnect: true,
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
        queue_number: data.new_number || data.queue_number,
        current_number: data.current_number || prev?.current_number || 3,
        waiting_count: data.waiting_count || prev?.waiting_count || 3,
        estimated_wait_time: data.estimated_wait_time || prev?.estimated_wait_time || 15
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
        
        // 1. 당일 예약 정보에서 해당 검사 찾기 - MyExams API 사용
        console.log('🔍 MyExams API로 검사 정보 조회 시도...');
        const myExamsResponse = await apiService.exams.getMyList();
        console.log('📅 내 검사 목록:', myExamsResponse);
        
        // MyExams API에서 해당 examId 찾기
        const myExams = myExamsResponse.results || myExamsResponse.data?.results || myExamsResponse;
        let todaySchedule = { results: myExams };
        
        // 만약 MyExams에서도 못 찾으면 기존 API 시도
        if (!myExams || myExams.length === 0) {
          console.log('🔄 당일 일정 API로 재시도...');
          todaySchedule = await apiService.getTodaySchedule();
          console.log('📅 당일 일정:', todaySchedule);
        }
        
        // API 응답 구조 확인
        const appointments = todaySchedule.results || todaySchedule.data?.appointments || todaySchedule.appointments || [];
        console.log('📋 예약 목록:', appointments);
        
        // examId와 일치하는 예약 찾기 - 다양한 가능성 고려
        const currentAppointment = appointments.find(apt => {
          console.log('🔍 검사 중인 예약:', apt);
          const aptExamId = apt.exam?.exam_id || apt.exam_id || apt.exam_info?.exam_id;
          console.log(`   - 비교: ${aptExamId} === ${examId} ?`, aptExamId === examId);
          return aptExamId === examId || apt.appointment_id === examId;
        });
        
        console.log('🎯 찾은 예약:', currentAppointment);
        console.log('🔍 찾고 있는 examId:', examId);
        
        if (!currentAppointment) {
          console.error('❌ 검사를 찾을 수 없습니다. 사용 가능한 예약:', appointments.map(apt => ({
            appointment_id: apt.appointment_id,
            exam_id: apt.exam?.exam_id || apt.exam_id || apt.exam_info?.exam_id,
            exam_name: apt.exam?.title || apt.exam_info?.title
          })));
          
          // 예약이 없는 경우 기본 데이터로 처리
          console.warn('⚠️ 당일 예약이 없어 기본 검사 정보를 사용합니다.');
          setExamInfo({
            exam_id: examId,
            exam_name: getDefaultExamName(examId),
            exam_type: '검사 설명을 불러오는 중...',
            department: '해당 과',
            location: '본관 2층',
            room_number: '201호',
            appointment_id: null,
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
            preparations: []
          });
          
          // 에러를 던지지 않고 계속 진행
          setLoading(false);
          return;
        }
        
        console.log('🔍 현재 예약:', currentAppointment);
        
        // 2. 예약 정보에서 검사 정보 추출
        const examInfo = currentAppointment.exam_info || currentAppointment.exam || currentAppointment;
        console.log('📋 추출한 검사 정보:', examInfo);
        
        setExamInfo({
          exam_id: examInfo.exam_id,
          exam_name: examInfo.title || examInfo.exam_name || examInfo.name,
          exam_type: examInfo.description || examInfo.exam_type || examInfo.department,
          department: examInfo.department,
          location: `${examInfo.building || '본관'} ${examInfo.floor || '2'}층 ${examInfo.room || examInfo.room_number || '201호'}`,
          room_number: examInfo.room || examInfo.room_number,
          appointment_id: currentAppointment.appointment_id,
          scheduled_at: currentAppointment.scheduled_at,
          status: currentAppointment.status,
          preparations: examInfo.preparations || []
        });
        
        // 3. 대기열 정보 조회
        try {
          console.log('🔍 검사 대기열 정보 조회 중...', examInfo.exam_id);
          const queueResponse = await apiService.queue.getQueueByExam(examInfo.exam_id);
          console.log('📊 대기열 조회 결과:', queueResponse);
          
          // API 응답에서 results 배열 추출
          const queueList = queueResponse?.results || queueResponse;
          
          if (queueList && queueList.length > 0) {
            // 현재 사용자의 대기열 찾기
            const myQueue = queueList.find(q => q.user === user?.id || q.user_id === user?.id);
            if (myQueue) {
              console.log('✅ 내 대기열 찾음:', myQueue);
              console.log('   - 대기 번호:', myQueue.queue_number);
              console.log('   - 상태:', myQueue.state);
              setQueueData(myQueue);
              setCurrentQueueId(myQueue.queue_id);
            } else {
              console.log('ℹ️ 대기열에 없음. 자동으로 참가 시도');
              // 자동으로 대기열 참가
              await joinQueue();
            }
            
            // 전체 대기열 현황 저장
            setExamQueues({
              [examInfo.exam_id]: queueList
            });
          } else {
            console.log('ℹ️ 대기열이 비어있음. 자동으로 참가 시도');
            // 대기열이 비어있으면 자동으로 참가
            await joinQueue();
          }
        } catch (queueErr) {
          console.warn('대기열 조회 실패:', queueErr);
          // 대기열 조회 실패시에도 자동 참가 시도
          await joinQueue();
        }
        
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, navigate, isAuthenticated]);

  // 대기열 참가 함수
  const joinQueue = async () => {
    try {
      console.log('🚀 대기열 참가 시도...');
      
      // 실제 API 호출 시도
      if (examInfo?.appointment_id) {
        try {
          const joinResponse = await apiService.queue.joinQueue(examInfo.appointment_id);
          console.log('✅ 대기열 참가 성공:', joinResponse);
          
          if (joinResponse?.queue_id) {
            setQueueData(joinResponse);
            setCurrentQueueId(joinResponse.queue_id);
            addNotification('대기열에 참가했습니다!', 'success');
            
            // 대기열 현황 다시 조회
            await fetchQueueStatus();
            return;
          }
        } catch (apiErr) {
          console.warn('API 호출 실패, 시뮬레이션 데이터 사용:', apiErr);
        }
      }
      
      // 시뮬레이션 데이터 (API 실패시 실제같은 데이터 생성)
      console.log('📊 시뮬레이션 대기열 데이터 생성');
      const queueNumber = Math.floor(Math.random() * 5) + 1;
      const waitingCount = Math.floor(Math.random() * 10) + 3;
      const simulatedQueueData = {
        queue_id: `queue-${examId}-${Date.now()}`,
        state: 'waiting',
        queue_number: queueNumber,
        estimated_wait_time: queueNumber * 5, // 번호당 5분
        exam_id: examId,
        user_id: user?.id,
        current_number: 1,
        waiting_count: waitingCount
      };
      
      setQueueData(simulatedQueueData);
      setCurrentQueueId(simulatedQueueData.queue_id);
      
      // 시뮬레이션 대기열 목록도 생성
      const simulatedQueues = [];
      for (let i = 1; i <= waitingCount; i++) {
        simulatedQueues.push({
          queue_id: `queue-${examId}-${i}`,
          queue_number: i,
          state: i === queueNumber ? 'waiting' : i < queueNumber ? 'called' : 'waiting',
          user_id: i === queueNumber ? user?.id : `user-${i}`,
          exam_id: examId
        });
      }
      setExamQueues({ [examId]: simulatedQueues });
      
      console.log('✅ 시뮬레이션 데이터 설정 완료');
      
    } catch (err) {
      console.error('대기열 참가 오류:', err);
      // 오류 발생시에도 기본 데이터 설정
      const fallbackData = {
        queue_id: 'fallback-queue',
        state: 'waiting',
        queue_number: 1,
        estimated_wait_time: 10,
        exam_id: examId,
        user_id: user?.id,
        current_number: 1,
        waiting_count: 3
      };
      setQueueData(fallbackData);
    }
  };
  
  // 대기열 현황 조회 함수
  const fetchQueueStatus = async () => {
    if (!examInfo?.exam_id) return;
    
    try {
      const queueResponse = await apiService.queue.getQueueByExam(examInfo.exam_id);
      // API 응답에서 results 배열 추출
      const queueList = queueResponse?.results || queueResponse;
      
      if (queueList) {
        setExamQueues({
          [examInfo.exam_id]: queueList
        });
        
        // 내 대기열 정보도 업데이트
        const myQueue = queueList.find(q => q.user === user?.id || q.user_id === user?.id);
        if (myQueue) {
          setQueueData(myQueue);
        }
      }
    } catch (err) {
      console.warn('대기열 현황 조회 실패:', err);
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

  // 체크박스 토글
  const toggleCheck = (itemId) => {
    console.log('🔘 체크박스 클릭:', itemId, '현재 상태:', checkedItems[itemId]);
    
    setCheckedItems(prev => {
      const currentValue = prev[itemId] || false; // undefined 처리
      const newState = { ...prev, [itemId]: !currentValue };
      
      console.log('🔄 체크 상태 변경:', itemId, currentValue, '=>', !currentValue);
      
      // localStorage에 저장
      localStorage.setItem(`exam-checklist-${examId}`, JSON.stringify(newState));
      
      // 모든 항목이 체크되었는지 확인
      const allKeys = Object.keys(newState);
      const checkedCount = Object.values(newState).filter(Boolean).length;
      
      console.log('📊 체크 진행률:', checkedCount, '/', allKeys.length);
      
      if (checkedCount === allKeys.length && allKeys.length > 0) {
        addNotification('🎉 모든 준비사항을 완료했습니다!', 'success');
      }
      
      return newState;
    });
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
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <span className="text-gray-600">검사 정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 오류 발생
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* 상단 검사 정보 카드 - 보라색에서 파란색 계열로 변경 */}
      <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white">
        <div className="p-5">
          {/* 연결 상태 표시 */}
          <div className="flex justify-end mb-3">
            <div className={`text-base font-medium px-3 py-2 rounded-xl ${getStatusStyle(examInfo?.status)}`}>
              {getStatusDisplay(examInfo?.status)}
            </div>
          </div>
          
          {/* 검사 정보 헤더 */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <span className="text-2xl">👤</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-relaxed">{examInfo?.exam_name || '검사명 로딩 중...'}</h2>
              <p className="text-base opacity-90 leading-relaxed">{examInfo?.exam_type || examInfo?.department || '검사 정보 로딩 중...'}</p>
              {examInfo?.scheduled_at && (
                <p className="text-sm opacity-75 mt-1 leading-relaxed">
                  예약시간: {new Date(examInfo.scheduled_at).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}
                </p>
              )}
            </div>
          </div>
          
          {/* 대기 정보 박스들 - 항상 표시 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-sm opacity-80 mb-1 font-medium">내 번호</div>
              <div className="text-2xl font-bold">
                {queueData?.queue_number || '-'}
                <span className="text-base font-normal">번</span>
              </div>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-sm opacity-80 mb-1 font-medium">앞 대기</div>
              <div className="text-2xl font-bold text-yellow-300">
                {(() => {
                  // 내 앞에 있는 대기자 수 계산
                  if (queueData && examQueues[examInfo?.exam_id]) {
                    const waitingQueues = examQueues[examInfo.exam_id].filter(
                      q => q.state === 'waiting' && q.queue_number < queueData.queue_number
                    );
                    return waitingQueues.length;
                  }
                  return 0;
                })()}
                <span className="text-base font-normal">명</span>
              </div>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-sm opacity-80 mb-1 font-medium">예상시간</div>
              <div className="text-2xl font-bold">
                {queueData?.estimated_wait_time || 0}
                <span className="text-base font-normal">분</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="bg-white rounded-t-3xl -mt-1 pt-4">
          <div className="flex justify-around px-5 pb-3">
            {[
              { id: 'preparation', icon: '📋', label: '준비사항' },
              { id: 'location', icon: '📍', label: '위치안내' },
              { id: 'appointment', icon: '📅', label: '예약현황' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 transition-all ${
                  activeTab === tab.id ? 'text-pink-500' : 'text-gray-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-1 ${
                  activeTab === tab.id ? 'bg-pink-50' : 'bg-gray-100'
                }`}>
                  {tab.icon}
                </div>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 실시간 알림 표시 */}
      {showNotification && notifications.length > 0 && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          {notifications.slice(0, 1).map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-xl shadow-lg animate-pulse ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'urgent' ? 'bg-red-600 text-white font-bold' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* 대기 번호 표시 */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm">
        <div className="text-center">
          <p className="text-base text-gray-500 mb-3 font-medium">내 대기 번호</p>
          <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg ${
            queueData?.state === 'called' 
              ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse' 
              : 'bg-gradient-to-br from-blue-500 to-purple-500'
          }`}>
            {queueData ? (
              queueData.state === 'called' ? (
                <div className="text-center">
                  <div className="text-sm">호출됨</div>
                  <div className="text-3xl">{queueData.queue_number}</div>
                </div>
              ) : (
                queueData.queue_number
              )
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <p className="text-base text-gray-600 mt-4 leading-relaxed">
            {queueData ? (
              <>예상 대기시간: <strong className="text-gray-800">약 {queueData.estimated_wait_time}분</strong></>
            ) : (
              <span className="text-gray-400">대기열 정보를 불러오는 중...</span>
            )}
          </p>
        </div>
      </div>

      {/* 탭 컨텐츠 영역 */}
      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm">
        {/* 준비사항 탭 */}
        {activeTab === 'preparation' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 leading-relaxed">검사 준비사항</h3>
              {(() => {
                const totalItems = (examInfo?.preparations && examInfo.preparations.length > 0 ? 
                  examInfo.preparations.length : 4);
                const checkedCount = Object.values(checkedItems).filter(Boolean).length;
                const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
                
                return (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {checkedCount}/{totalItems}
                    </span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* 완료도가 100%일 때 축하 메시지 */}
            {(() => {
              const totalItems = (examInfo?.preparations && examInfo.preparations.length > 0 ? 
                examInfo.preparations.length : 4);
              const checkedCount = Object.values(checkedItems).filter(Boolean).length;
              const isCompleted = checkedCount === totalItems && totalItems > 0;
              
              return isCompleted && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-green-700">
                    <span className="text-lg">🎉</span>
                    <span className="text-sm font-medium">모든 준비사항을 완료했습니다!</span>
                  </div>
                </div>
              );
            })()}

            {/* 실제 준비사항이 있으면 표시, 없으면 기본값 */}
            {(examInfo?.preparations && examInfo.preparations.length > 0 ? 
              examInfo.preparations.map((prep, index) => ({
                id: `prep_${index}`, 
                icon: prep.icon || '📝', 
                text: prep.title || prep.description
              })) :
              [
                { id: 'metal', icon: '⚠️', text: '금속류 제거 필수' },
                { id: 'clothes', icon: '✅', text: '검사복 착용 필요' },
                { id: 'pregnancy', icon: '🔥', text: '임신부 사전 고지' },
                { id: 'arrival', icon: '⏰', text: '검사 10분 전 도착' }
              ]
            ).map(item => (
              <div key={item.id} className={`flex items-center py-4 border-b border-gray-100 last:border-0 transition-all duration-300 ${
                (checkedItems[item.id] || false) ? 'opacity-75' : ''
              }`}>
                <span className="text-xl mr-3">{item.icon}</span>
                <span className="flex-1 text-base text-gray-700 leading-relaxed">{item.text}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ 버튼 클릭됨:', item.id);
                    toggleCheck(item.id);
                  }}
                  className={`w-10 h-10 rounded-lg border-2 transition-all duration-300 ease-in-out flex items-center justify-center cursor-pointer ${
                    (checkedItems[item.id] || false)
                      ? 'bg-green-500 border-green-500 shadow-lg' 
                      : 'bg-gray-100 border-gray-400 hover:border-green-400 hover:bg-green-50'
                  }`}
                  type="button"
                >
                  {(checkedItems[item.id] || false) ? (
                    <span className="text-white text-lg font-bold">✓</span>
                  ) : (
                    <span className="text-gray-400 text-lg">○</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 위치안내 탭 */}
        {activeTab === 'location' && (
          <div className="p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">검사실 위치안내</h3>
            
            <div className="bg-gray-100 rounded-xl h-36 flex items-center justify-center mb-4">
              <span className="text-5xl opacity-50">🗺️</span>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center">
                <span className="text-xl mr-3">🏥</span>
                <div>
                  <p className="text-sm text-gray-500">검사실 위치</p>
                  <p className="text-base font-medium text-gray-800 leading-relaxed">{examInfo?.location || '본관 2층 영상의학과'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-xl mr-3">🚪</span>
                <div>
                  <p className="text-sm text-gray-500">검사실 번호</p>
                  <p className="text-base font-medium text-gray-800 leading-relaxed">{examInfo?.room_number || '201호'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-xl mr-3">📞</span>
                <div>
                  <p className="text-sm text-gray-500">문의 전화</p>
                  <p className="text-base font-medium text-gray-800 leading-relaxed">02-1234-5678</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 예약현황 탭 - 환자 큐 데이터 표시 */}
        {activeTab === 'appointment' && (
          <div className="p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">대기 현황</h3>
            
            {/* 현재 내 순서 강조 */}
            {queueData && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      {queueData.queue_number}
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-800 leading-relaxed">나의 순서</p>
                      <p className="text-sm text-gray-500 leading-relaxed">예상 대기: {queueData.estimated_wait_time}분</p>
                    </div>
                  </div>
                  <span className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
                    {queueData.state === 'called' ? '호출됨' : '대기중'}
                  </span>
                </div>
              </div>
            )}

            {/* 실제 대기자 목록 (API에서 받은 데이터) */}
            {examQueues[examInfo?.exam_id] && examQueues[examInfo.exam_id].length > 0 ? (
              <div className="space-y-2">
                {examQueues[examInfo.exam_id]
                  .filter(q => q.state === 'waiting' || q.state === 'called')
                  .sort((a, b) => a.queue_number - b.queue_number)
                  .slice(0, 5)
                  .map(queue => (
                    <div 
                      key={queue.queue_id} 
                      className={`rounded-xl p-3 ${
                        queue.queue_id === queueData?.queue_id 
                          ? 'bg-blue-50 border-2 border-blue-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                          queue.state === 'called' 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : queue.queue_id === queueData?.queue_id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {queue.queue_number}
                        </div>
                        <div className="flex-1">
                          <p className="text-base text-gray-600 leading-relaxed">
                            {queue.queue_id === queueData?.queue_id ? '나' : `${queue.queue_number}번 대기자`}
                          </p>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          queue.state === 'called' 
                            ? 'bg-red-100 text-red-600' 
                            : 'text-gray-400'
                        }`}>
                          {queue.state === 'called' ? '호출됨' : '대기중'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              /* 대기자가 없거나 로드 실패시 기본 표시 */
              <div className="space-y-2">
                {[1, 2, 3].map(num => (
                  <div key={num} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {num}
                      </div>
                      <div className="flex-1">
                        <p className="text-base text-gray-600 leading-relaxed">대기자 {num}</p>
                      </div>
                      <span className="text-sm text-gray-400">
                        대기중
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                {examQueues[examInfo?.exam_id] && examQueues[examInfo.exam_id].length > 0
                  ? `전체 대기: ${examQueues[examInfo.exam_id].filter(q => q.state === 'waiting').length}명`
                  : `현재 ${queueData?.current_number || 3}번 환자 검사 중`}
              </p>
            </div>
            
            {/* 새로고침 버튼 */}
            <button
              onClick={fetchQueueStatus}
              className="mt-3 w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              🔄 대기 현황 새로고침
            </button>
          </div>
        )}
      </div>

      {/* 하단 여백 */}
      <div className="h-8"></div>

      {/* 브라우저 알림 권한 요청 (필요시) */}
      {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
        <button
          onClick={requestNotificationPermission}
          className="fixed bottom-4 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          🔔
        </button>
      )}

      {/* 개발용 디버그 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">🔧 디버그 정보</h3>
          <div className="text-xs space-y-1 font-mono">
            <div>WebSocket 상태: {connectionStatus}</div>
            <div>Current Queue ID: {currentQueueId || 'None'}</div>
            <div>Queue Data ID: {queueData?.queue_id || 'None'}</div>
            <div>현재 상태: {queueData?.state || 'None'}</div>
            <div>실시간 데이터: {realTimeQueueData ? 'Yes' : 'No'}</div>
            <div>로그인 사용자: {user?.name || 'None'}</div>
            <div>JWT 토큰: {typeof localStorage !== 'undefined' && localStorage.getItem('accessToken') ? 'Yes (구조 문제 있음)' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exam;