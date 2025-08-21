import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useJourneyStore from '../store/journeyStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminHomeScreen from '../components/screens/AdminHomeScreen';
import { api } from '../api/client';

// 비로그인 사용자용 컴포넌트
import PublicGuide from '../components/PublicGuide';

// 상태별 화면 컴포넌트들 import
import UnregisteredScreen from '../components/screens/UnregisteredScreen';
import ArrivedScreen from '../components/screens/ArrivedScreen';
import RegisteredScreen from '../components/screens/RegisteredScreen';
import WaitingScreen from '../components/screens/WaitingScreen';
import PaymentScreen from '../components/screens/PaymentScreen';
import FinishedScreen from '../components/screens/FinishedScreen';

// 템플릿 및 카드 컴포넌트들 import
import FormatATemplate from '../components/templates/FormatATemplate';
import CalledModal from '../components/modals/CalledModal';

// ONGOING과 COMPLETED는 WaitingScreen을 재사용 (유사한 UI)
const OngoingScreen = WaitingScreen;
const CompletedScreen = ({ taggedLocation, upcoming_tasks, completed_tasks }) => {
  const { user, todaysAppointments = [], patientState } = useJourneyStore();
  
  // 오늘의 일정 준비
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];
  
  // 현재 단계 계산 - 완료된 검사들 중 최신
  const currentStep = todaySchedule.findIndex(s => s.status === 'completed');
  const actualCurrentStep = currentStep === -1 ? 0 : currentStep;
  
  return (
    <FormatATemplate
      screenType="completed"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction="다음 검사실로 이동하기"
      waitingInfo={null}
      locationInfo={null}
      todaySchedule={todaySchedule}
      queueData={null}
      taggedLocation={taggedLocation}
      patientState={patientState || 'COMPLETED'}
      currentExam={null}
    >
      {/* 완료 메시지 */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-green-900 mb-2">
          검사가 성공적으로 완료되었습니다
        </h2>
        <p className="text-green-800">
          잠시 후 다음 일정이 안내됩니다
        </p>
      </div>
    </FormatATemplate>
  );
};

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
    console.log('📅 현재 todaysAppointments:', todaysAppointments);
    
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
  }, [tagId]); // user를 dependency에서 제거하여 무한 루프 방지

  // 로딩 상태
  if (isLoading) {
    return <LoadingSpinner fullScreen={true} message="정보를 불러오고 있습니다..." />;
  }

  // 에러 상태
  if (error) {
    return <ErrorScreen message={error} />;
  }

  // 사용자 정보가 없는 경우 - 비로그인 상태
  if (!user) {
    return <PublicGuide />;
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
    
    // NFC 태그 위치 정보를 기반으로 위치 타입 판별
    const getLocationType = (locationInfo) => {
      if (!locationInfo) return null;
      
      const { building, floor, room, description } = locationInfo;
      const roomLower = room?.toLowerCase() || '';
      const descLower = description?.toLowerCase() || '';
      
      // 검사실 타입 판별
      if (roomLower.includes('검사') || roomLower.includes('ct') || roomLower.includes('mri') || 
          roomLower.includes('x-ray') || roomLower.includes('초음파') || roomLower.includes('채혈') ||
          descLower.includes('검사') || descLower.includes('ct') || descLower.includes('mri')) {
        return 'exam_room';
      }
      
      // 접수/원무과 타입 판별
      if (roomLower.includes('접수') || roomLower.includes('원무') || 
          descLower.includes('접수') || descLower.includes('원무')) {
        return 'reception';
      }
      
      // 수납 타입 판별
      if (roomLower.includes('수납') || descLower.includes('수납')) {
        return 'payment';
      }
      
      // 로비 타입 판별
      if (roomLower.includes('로비') || descLower.includes('로비')) {
        return 'lobby';
      }
      
      // 대기실 타입 판별
      if (roomLower.includes('대기') || descLower.includes('대기')) {
        return 'waiting_area';
      }
      
      return 'other';
    };
    
    const locationType = getLocationType(taggedLocationInfo);
    
    // WaitingScreen에서 데이터를 자체적으로 처리하므로 간단하게 전달
    
    // --- 분기 로직 시작 ---
    
    // CalledModal 상태 체크 (다른 화면들 위에 모달로 표시)
    const isCalledModalOpen = currentState === 'CALLED';
    
    // 호출 상태가 아닌 다른 상태들 처리
    
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
    
    // 3순위: 그 외 상태별 기본 화면 (CALLED 상태는 제외)
    let currentScreen;
    switch (currentState) {
      case 'UNREGISTERED':
        currentScreen = <UnregisteredScreen taggedLocation={taggedLocationInfo} />;
        break;
      
      case 'ARRIVED':
        currentScreen = <ArrivedScreen taggedLocation={taggedLocationInfo} />;
        break;
      
      case 'REGISTERED':
        // 접수 완료 상태에서 로비 태그 -> 접수 완료 화면
        // 접수 완료 상태에서 검사실 태그 -> 2순위에서 처리됨
        currentScreen = <RegisteredScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />;
        break;
      
      case 'WAITING': // 검사실 태그 없이 대기 상태일 경우 (예: 앱 재시작)
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />;
        break;

      case 'CALLED':
        // CALLED 상태는 대기 화면을 보여주되, 모달로 호출 알림 표시
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />;
        break;
      
      case 'ONGOING':
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />; // ONGOING도 WaitingScreen 재사용
        break;
      
      case 'COMPLETED':
        currentScreen = <CompletedScreen 
          taggedLocation={taggedLocationInfo} 
          upcoming_tasks={scheduleData.upcomingTasks}
          completed_tasks={scheduleData.completedTasks}
        />;
        break;
      
      case 'PAYMENT':
        currentScreen = <PaymentScreen taggedLocation={taggedLocationInfo} />;
        break;
      
      case 'FINISHED':
        currentScreen = <FinishedScreen 
          taggedLocation={taggedLocationInfo} 
          completed_tasks={scheduleData.completedTasks}
        />;
        break;
      
      default:
        console.warn('Unknown patient state:', currentState);
        currentScreen = <RegisteredScreen 
          taggedLocation={taggedLocationInfo} 
          current_task={scheduleData.currentTask}
          upcoming_tasks={scheduleData.upcomingTasks}
        />; // 기본값으로 등록 완료 화면 표시
        break;
    }

    // 기본 화면 + CalledModal 오버레이
    return (
      <>
        {currentScreen}
        <CalledModal 
          isOpen={isCalledModalOpen} 
          onClose={() => {
            // 모달 닫기 시 상태를 WAITING으로 변경하거나 다른 처리
            console.log('CalledModal closed');
          }} 
        />
      </>
    );
  }

  // 알 수 없는 역할
  return <ErrorScreen message={`알 수 없는 사용자 역할입니다: ${user.role}`} />;
};

export default Home;