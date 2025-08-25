import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminHomeScreen from '../components/screens/AdminHomeScreen';
import { api } from '../api/client';
import { getFacilityByName } from '../data/facilityManagement';

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
const CompletedScreen = ({ taggedLocation }) => {
  const { 
    user, 
    patientState,
    getTodaysScheduleForUI,
    getNextExam,
    getCompletionStats
  } = useJourneyStore();
  
  // Store에서 계산된 상태 사용
  const todaySchedule = getTodaysScheduleForUI();
  const nextExam = getNextExam();
  const completionStats = getCompletionStats();
  const actualCurrentStep = completionStats.completedCount - 1;
  
  // facilityManagement에서 시설 정보 찾기
  const facilityData = nextExam ? getFacilityByName(nextExam.title) : null;
  
  const locationInfo = nextExam ? {
    name: nextExam.title,
    building: nextExam.building || '본관',
    floor: `${nextExam.floor || '2'}층`,
    room: nextExam.room,
    department: nextExam.department,
    directions: '다음 검사실로 이동해주세요',
    mapFile: facilityData?.mapFile || 'main_1f.svg',
    svgId: facilityData?.svgId
  } : null;
  
  return (
    <FormatATemplate
      screenType="completed"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={null}
      locationInfo={locationInfo}
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
  
  // Store에서 직접 데이터 가져오기 (로컬 state 제거)
  const {
    user,
    patientState,
    taggedLocationInfo,
    isLoading,
    error,
    fetchJourneyData,
    clearTagInfo,
    // 계산된 상태들을 직접 가져오기
    getTodaysScheduleForUI,
    getCurrentTask,
    getWaitingInfo,
    getCompletionStats
  } = useJourneyStore();
  
  // 로컬 state 대신 store의 selector 함수 사용
  const todaySchedule = getTodaysScheduleForUI();
  const currentTask = getCurrentTask();
  const waitingInfo = getWaitingInfo();
  const completionStats = getCompletionStats();

  // 로컬 state 계산 로직 제거 - 이제 store에서 직접 계산된 값 사용

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    let isMounted = true; // 컴포넌트 마운트 상태 추적
    
    const loadData = async () => {
      if (tagId && isMounted) {
        await fetchJourneyData(tagId);
      }
    };
    
    loadData();
    
    // StrictMode의 이중 호출로 인한 불필요한 cleanup 방지
    return () => {
      isMounted = false;
      // clearTagInfo() 호출 제거 - StrictMode 문제 해결
      // 실제로 페이지를 떠날 때만 정리되도록 함
    };
  }, [tagId, fetchJourneyData]); // fetchJourneyData 추가 (Zustand는 안정적)

  // 로딩 상태
  if (isLoading) {
    return <LoadingSpinner fullScreen={true} message="정보를 불러오고 있습니다..." />;
  }

  // 에러 상태
  if (error) {
    const errorMessage = typeof error === 'string' ? error : 
                        error?.message || 
                        (error && typeof error === 'object' ? JSON.stringify(error) : '알 수 없는 오류가 발생했습니다');
    return <ErrorScreen message={errorMessage} />;
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
    
    // 개발 환경에서 디버깅을 위한 로그
    if (import.meta.env.DEV) {
      console.log('🏥 환자 화면 렌더링 정보:', {
        currentState,
        patientState,
        userState: user?.state,
        locationType,
        todaysAppointments: todaySchedule?.length || 0,
        completedCount: completionStats.completedCount
      });
    }
    
    // 호출 상태가 아닌 다른 상태들 처리
    
    // 2순위: 검사실 NFC를 태그했고, 대기 또는 진행중인 검사가 있는 경우
    if (locationType === 'exam_room' && (currentState === 'WAITING' || currentState === 'ONGOING')) {
      // 여기서 taggedLocationInfo.id와 currentAppointment.exam.id를 비교하여
      // 올바른 검사실에 왔는지 확인하는 로직을 추가할 수 있습니다.
      return <WaitingScreen 
        taggedLocation={taggedLocationInfo} 
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
        />;
        break;
      
      case 'WAITING': // 검사실 태그 없이 대기 상태일 경우 (예: 앱 재시작)
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
        />;
        break;

      case 'CALLED':
        // CALLED 상태는 대기 화면을 보여주되, 모달로 호출 알림 표시
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
        />;
        break;
      
      case 'ONGOING':
        currentScreen = <WaitingScreen 
          taggedLocation={taggedLocationInfo} 
        />; // ONGOING도 WaitingScreen 재사용
        break;
      
      case 'COMPLETED':
        currentScreen = <CompletedScreen 
          taggedLocation={taggedLocationInfo} 
        />;
        break;
      
      case 'PAYMENT':
        currentScreen = <PaymentScreen taggedLocation={taggedLocationInfo} />;
        break;
      
      case 'FINISHED':
        currentScreen = <FinishedScreen 
          taggedLocation={taggedLocationInfo} 
        />;
        break;
      
      default:
        console.warn('Unknown patient state:', currentState);
        currentScreen = <RegisteredScreen 
          taggedLocation={taggedLocationInfo} 
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