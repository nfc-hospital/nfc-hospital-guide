import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminHomeScreen from '../components/screens/AdminHomeScreen';
import { api } from '../api/client';

// 비로그인 사용자용 컴포넌트
import PublicGuide from '../components/PublicGuide';

// JourneyContainer import - 모든 상태별 화면을 통합 관리
import JourneyContainer from '../components/JourneyContainer';


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

  // 환자 역할인 경우 - JourneyContainer가 모든 상태 처리
  if (user.role === 'patient') {
    
    // 개발 환경에서 디버깅을 위한 로그
    if (import.meta.env.DEV) {
      console.log('🏥 환자 화면 렌더링 정보:', {
        patientState,
        userState: user?.state,
        todaysAppointments: todaySchedule?.length || 0,
        completedCount: completionStats.completedCount,
        taggedLocationInfo
      });
    }
    
    // JourneyContainer가 모든 상태를 처리
    return (
      <JourneyContainer 
        taggedLocation={taggedLocationInfo} 
      />
    );
  }

  // 알 수 없는 역할
  return <ErrorScreen message={`알 수 없는 사용자 역할입니다: ${user.role}`} />;
};

export default Home;