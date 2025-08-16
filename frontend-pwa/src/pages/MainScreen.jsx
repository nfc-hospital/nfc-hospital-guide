import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJourneyStore from '../store/journeyStore';
import { useAuth } from '../context/AuthContext';

// 상태별 화면 컴포넌트들
import UnregisteredScreen from '../components/screens/UnregisteredScreen';
import ArrivedScreen from '../components/screens/ArrivedScreen';
import RegisteredScreen from '../components/screens/RegisteredScreen';
import WaitingScreen from '../components/screens/WaitingScreen';
import CalledScreen from '../components/screens/CalledScreen';
import FinishedScreen from '../components/screens/FinishedScreen';
import PaymentScreen from '../components/screens/PaymentScreen';
import AdminHomeScreen from '../components/screens/AdminHomeScreen';

// 로딩 및 에러 컴포넌트
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 상태별 화면 매핑
const StateScreenMap = {
  UNREGISTERED: UnregisteredScreen,
  ARRIVED: ArrivedScreen,
  REGISTERED: RegisteredScreen,
  WAITING: WaitingScreen,
  CALLED: CalledScreen,
  ONGOING: WaitingScreen, // 진행 중도 대기 화면 사용
  COMPLETED: RegisteredScreen, // 완료도 등록 화면 사용
  PAYMENT: PaymentScreen,
  FINISHED: FinishedScreen,
};

const MainScreen = () => {
  const { tagId } = useParams(); // URL에서 NFC 태그 ID 가져오기
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    fetchJourneyData,
    fetchTagInfo,
    clearTagInfo,
    patientState,
    taggedLocationInfo,
    isLoading,
    error,
    isTagLoading,
    tagError,
    user: journeyUser,
    startPolling,
    stopPolling,
  } = useJourneyStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsInitializing(true);
        
        // NFC 태그 ID가 있으면 태그 정보와 함께 로드
        if (tagId) {
          console.log('🏷️ NFC 태그 감지:', tagId);
          await fetchJourneyData(tagId);
        } else {
          // 태그가 없으면 일반 데이터만 로드
          await fetchJourneyData();
        }
        
        // 환자인 경우 실시간 업데이트 시작
        if (journeyUser?.role === 'patient') {
          startPolling();
        }
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeData();

    // 클린업: 컴포넌트 언마운트 시 폴링 중지 및 태그 정보 초기화
    return () => {
      stopPolling();
      clearTagInfo();
    };
  }, [tagId]);

  // 역할별 화면 렌더링
  const renderContent = () => {
    // 관리자인 경우 관리자 홈 화면 표시
    if (journeyUser?.role && ['staff', 'dept-admin', 'super-admin'].includes(journeyUser.role)) {
      return <AdminHomeScreen />;
    }

    // 환자인 경우 상태별 화면 표시
    if (journeyUser?.role === 'patient' && patientState) {
      const StateScreen = StateScreenMap[patientState] || UnregisteredScreen;
      
      return (
        <StateScreen 
          taggedLocation={taggedLocationInfo}
          patientState={patientState}
        />
      );
    }

    // 기본값: 미등록 화면
    return <UnregisteredScreen />;
  };

  // 로딩 중
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
        {isTagLoading && (
          <p className="mt-4 text-lg text-gray-600">NFC 태그 정보를 불러오는 중...</p>
        )}
      </div>
    );
  }

  // 에러 처리
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // NFC 태그 에러는 별도로 표시 (전체 화면을 막지 않음)
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {tagError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <p className="text-amber-800 text-center">
              NFC 태그 정보를 불러올 수 없습니다: {tagError}
            </p>
          </div>
        )}
        {renderContent()}
      </div>
    </ErrorBoundary>
  );
};

export default MainScreen;
