import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useJourneyStore from '../store/journeyStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminHomeScreen from '../components/screens/AdminHomeScreen';
import { api } from '../api/client';

// 상태별 화면 컴포넌트들 import
import UnregisteredScreen from '../components/screens/UnregisteredScreen';
import ArrivedScreen from '../components/screens/ArrivedScreen';
import RegisteredScreen from '../components/screens/RegisteredScreen';
import WaitingScreen from '../components/screens/WaitingScreen';
import CalledScreen from '../components/screens/CalledScreen';
import PaymentScreen from '../components/screens/PaymentScreen';
import FinishedScreen from '../components/screens/FinishedScreen';

// 카드 컴포넌트들 import
import CompletedTaskCard from '../components/journey/CompletedTaskCard';
import UpcomingTasksCard from '../components/journey/UpcomingTasksCard';

// ONGOING과 COMPLETED는 WaitingScreen을 재사용 (유사한 UI)
const OngoingScreen = WaitingScreen;
const CompletedScreen = ({ upcoming_tasks, completed_tasks }) => (
  <div className="min-h-screen bg-gray-50 pb-20">
    <div className="bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          검사가 완료되었습니다
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          다음 일정을 확인해주세요
        </p>
      </div>
    </div>
    
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-green-900 mb-2">
          검사가 성공적으로 완료되었습니다
        </h2>
        <p className="text-green-800">
          잠시 후 다음 일정이 안내됩니다
        </p>
      </div>
      
      {/* 완료된 검사 표시 */}
      {completed_tasks && completed_tasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">방금 완료한 검사</h3>
          {completed_tasks.slice(-1).map((task) => (
            <CompletedTaskCard key={task.appointment_id} appointment={task} />
          ))}
        </div>
      )}
      
      {/* 다음 일정 표시 */}
      {upcoming_tasks && upcoming_tasks.length > 0 && (
        <UpcomingTasksCard appointments={upcoming_tasks} />
      )}
    </div>
  </div>
);

const ErrorScreen = ({ message }) => (
  <div className="min-h-screen bg-background-secondary p-6">
    <div className="max-w-mobile mx-auto">
      <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
        <div className="w-20 h-20 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          정보를 불러올 수 없습니다
        </h1>
        <p className="text-lg text-text-secondary mb-6">
          {message || '잠시 후 다시 시도해 주세요'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-primary text-white py-4 px-8 rounded-xl text-xl font-semibold hover:bg-primary-dark transition-colors duration-200 min-h-button"
        >
          새로고침
        </button>
      </div>
    </div>
  </div>
);

// 메인 Home 컴포넌트 - 동적 라우팅 컨트롤러
const Home = () => {
  const { tagId } = useParams(); // URL에서 NFC 태그 ID 가져오기
  const { 
    user, 
    patientState, 
    taggedLocationInfo,
    todaysAppointments,
    isLoading, 
    error, 
    fetchJourneyData,
    clearTagInfo 
  } = useJourneyStore();

  // 일정 데이터 상태 관리
  const [scheduleData, setScheduleData] = useState({
    state: null,
    currentTask: null,
    upcomingTasks: [],
    completedTasks: [],
    isLoading: false,
    error: null
  });

  // 당일 일정 데이터 가져오기
  const fetchTodaySchedule = async () => {
    if (!user || user.role !== 'patient') return;

    setScheduleData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await api.get('/schedule/today');
      const data = response.data;
      
      // 응답 데이터를 상태별로 분류
      const appointments = data.appointments || [];
      
      // 현재 진행 중인 작업 찾기 (WAITING, CALLED, ONGOING 상태)
      const currentTask = appointments.find(apt => 
        ['waiting', 'called', 'ongoing'].includes(apt.status)
      );
      
      // 예정된 작업들 (scheduled 상태)
      const upcomingTasks = appointments.filter(apt => 
        apt.status === 'scheduled' || apt.status === 'pending'
      );
      
      // 완료된 작업들 (done, completed 상태)
      const completedTasks = appointments.filter(apt => 
        apt.status === 'done' || apt.status === 'completed'
      );
      
      setScheduleData({
        state: data.state,
        currentTask,
        upcomingTasks,
        completedTasks,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch today schedule:', error);
      setScheduleData(prev => ({
        ...prev,
        isLoading: false,
        error: '일정을 불러오는데 실패했습니다.'
      }));
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🏠 Home 컴포넌트 마운트됨');
    console.log('📍 현재 user:', user);
    console.log('📍 현재 patientState:', patientState);
    console.log('🏷️ NFC 태그 ID:', tagId);
    
    // 사용자 정보가 없으면 데이터 로드
    if (!user && localStorage.getItem('access_token')) {
      console.log('🔄 토큰은 있지만 user 정보가 없어서 fetchJourneyData 호출');
      fetchJourneyData(tagId); // NFC 태그 ID와 함께 데이터 로드
    } else if (tagId && user) {
      // 사용자 정보는 있지만 새로운 태그를 스캔한 경우
      console.log('🏷️ 새로운 NFC 태그 스캔, 데이터 재로드');
      fetchJourneyData(tagId);
    } else if (user && user.role === 'patient') {
      // 환자 사용자인 경우 일정 데이터 로드
      fetchTodaySchedule();
    }
    
    // 컴포넌트 언마운트 시 태그 정보 초기화
    return () => {
      if (tagId) {
        clearTagInfo();
      }
    };
  }, [tagId, user]);

  // 로딩 상태
  if (isLoading) {
    return <LoadingSpinner fullScreen={true} message="정보를 불러오고 있습니다..." />;
  }

  // 에러 상태
  if (error) {
    return <ErrorScreen message={error} />;
  }

  // 사용자 정보가 없는 경우
  if (!user) {
    return <ErrorScreen message="사용자 정보를 찾을 수 없습니다" />;
  }

  // ✨ 역할에 따른 라우팅
  const adminRoles = ['super', 'dept', 'staff'];
  
  if (user && adminRoles.includes(user.role)) {
    // 관리자 역할인 경우 관리자 홈 화면으로
    return <AdminHomeScreen />;
  }

  // 환자 역할인 경우
  if (user.role === 'patient') {
    // patientState가 없는 경우 기본 화면
    if (!patientState) {
      console.warn('환자 상태 정보가 없습니다. 기본 화면을 표시합니다.');
      return <RegisteredScreen />;
    }

    // 환자 상태에 따른 화면 렌더링
    const currentState = patientState?.current_state || patientState;
    const locationType = taggedLocationInfo?.type; // 'exam_room', 'reception', 'lobby' 등
    
    // WaitingScreen에서 데이터를 자체적으로 처리하므로 간단하게 전달
    
    // --- 분기 로직 시작 ---
    
    // 1순위: 호출 상태는 항상 최우선으로 표시
    if (currentState === 'CALLED') {
      return <CalledScreen taggedLocation={taggedLocationInfo} />;
    }
    
    // 2순위: 검사실 NFC를 태그했고, 대기 또는 진행중인 검사가 있는 경우
    if (locationType === 'exam_room' && (currentState === 'WAITING' || currentState === 'ONGOING')) {
      // 여기서 taggedLocationInfo.id와 currentAppointment.exam.id를 비교하여
      // 올바른 검사실에 왔는지 확인하는 로직을 추가할 수 있습니다.
      return <WaitingScreen 
        taggedLocation={taggedLocationInfo} 
        current_task={scheduleData.currentTask}
        upcoming_tasks={scheduleData.upcomingTasks}
      />;
    }
    
    // 3순위: 그 외 상태별 기본 화면
    switch (currentState) {
      case 'UNREGISTERED':
        return <UnregisteredScreen taggedLocation={taggedLocationInfo} />;
      
      case 'ARRIVED':
        return <ArrivedScreen taggedLocation={taggedLocationInfo} />;
      
      case 'REGISTERED':
        // 접수 완료 상태에서 로비 태그 -> 접수 완료 화면
        // 접수 완료 상태에서 검사실 태그 -> 2순위에서 처리됨
        return <RegisteredScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />;
      
      case 'WAITING': // 검사실 태그 없이 대기 상태일 경우 (예: 앱 재시작)
        return <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />;
      
      case 'ONGOING':
        return <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />; // ONGOING도 WaitingScreen 재사용
      
      case 'COMPLETED':
        return <CompletedScreen 
          taggedLocation={taggedLocationInfo} 
          upcoming_tasks={scheduleData.upcomingTasks}
          completed_tasks={scheduleData.completedTasks}
        />;
      
      case 'PAYMENT':
        return <PaymentScreen taggedLocation={taggedLocationInfo} />;
      
      case 'FINISHED':
        return <FinishedScreen 
          taggedLocation={taggedLocationInfo} 
          completed_tasks={scheduleData.completedTasks}
        />;
      
      default:
        console.warn('Unknown patient state:', currentState);
        return <RegisteredScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />; // 기본값으로 등록 완료 화면 표시
    }
  }

  // 알 수 없는 역할
  return <ErrorScreen message={`알 수 없는 사용자 역할입니다: ${user.role}`} />;
};

export default Home;