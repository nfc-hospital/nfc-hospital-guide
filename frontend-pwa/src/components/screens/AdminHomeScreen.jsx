import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminHomeScreen = () => {
  const navigate = useNavigate();
  const { 
    user, 
    adminDashboardData, 
    isAdminLoading, 
    adminError, 
    fetchAdminDashboardData 
  } = useJourneyStore();

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchAdminDashboardData().catch(error => {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('대시보드 데이터를 불러오는데 실패했습니다');
    });

    // 30초마다 데이터 새로고침
    const interval = setInterval(() => {
      fetchAdminDashboardData().catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAdminDashboardData]);

  // 로딩 상태
  if (isAdminLoading && !adminDashboardData) {
    return <LoadingSpinner fullScreen={true} message="대시보드 데이터를 불러오고 있습니다..." />;
  }

  // 에러 상태
  if (adminError && !adminDashboardData) {
    return (
      <div className="min-h-screen bg-background-secondary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <div className="w-20 h-20 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              데이터를 불러올 수 없습니다
            </h1>
            <p className="text-lg text-text-secondary mb-6">{adminError}</p>
            <button
              onClick={() => fetchAdminDashboardData()}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 데이터 추출 (기본값 설정)
  const {
    totalPatients = 0,
    avgWaitTime = 0,
    systemStatus = 'unknown',
    urgentAlerts = [],
    lastUpdated = new Date().toISOString()
  } = adminDashboardData || {};

  const getStatusInfo = (status) => {
    switch (status) {
      case 'normal':
        return { text: '정상', color: 'text-success', bgColor: 'bg-success/10' };
      case 'warning':
        return { text: '주의', color: 'text-warning', bgColor: 'bg-warning/10' };
      case 'error':
        return { text: '오류', color: 'text-danger', bgColor: 'bg-danger/10' };
      default:
        return { text: '확인 중', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const statusInfo = getStatusInfo(systemStatus);

  return (
    <div className="min-h-screen bg-background-secondary p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            🏥 병원 관리 시스템
          </h1>
          <p className="text-xl text-text-secondary">
            환영합니다, {user?.name || user?.username}님
          </p>
        </div>

        {/* 오늘의 핵심 지표 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">👥</span>
              <span className="text-sm text-text-muted">오늘</span>
            </div>
            <div className="text-3xl font-bold text-primary mb-1">
              {totalPatients}명
            </div>
            <div className="text-base text-text-secondary">전체 환자 수</div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">⏱️</span>
              <span className="text-sm text-text-muted">현재</span>
            </div>
            <div className="text-3xl font-bold text-warning mb-1">
              {avgWaitTime}분
            </div>
            <div className="text-base text-text-secondary">평균 대기시간</div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">💚</span>
              <span className="text-sm text-text-muted">시스템</span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${statusInfo.color}`}>
              {statusInfo.text}
            </div>
            <div className="text-base text-text-secondary">시스템 상태</div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">🚨</span>
              <span className="text-sm text-text-muted">긴급</span>
            </div>
            <div className="text-3xl font-bold text-danger mb-1">
              {urgentAlerts.length}건
            </div>
            <div className="text-base text-text-secondary">긴급 알림</div>
          </div>
        </div>

        {/* 긴급 알림 섹션 */}
        {urgentAlerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
              <span className="mr-3">🚨</span>
              긴급 알림
            </h2>
            <div className="space-y-3">
              {urgentAlerts.slice(0, 5).map((alert, index) => (
                <div 
                  key={alert.id || index}
                  className={`rounded-xl p-4 border-2 ${
                    alert.type === 'error' 
                      ? 'bg-danger/10 border-danger/30' 
                      : alert.type === 'warning'
                      ? 'bg-warning/10 border-warning/30'
                      : 'bg-info/10 border-info/30'
                  }`}
                >
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-text-primary">
                        {alert.message || alert.title}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        {alert.time || new Date(alert.created_at || Date.now()).toLocaleTimeString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {urgentAlerts.length > 5 && (
                <p className="text-center text-text-muted text-sm">
                  + {urgentAlerts.length - 5}개의 추가 알림
                </p>
              )}
            </div>
          </div>
        )}

        {/* 메인 액션 버튼 */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-primary text-white py-6 px-8 rounded-2xl text-2xl font-bold hover:bg-primary-dark transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center mb-8"
        >
          <span className="mr-3">🎛️</span>
          상세 관리하기
        </button>

        {/* 시스템 상태 정보 */}
        <div className={`rounded-xl p-4 ${statusInfo.bgColor} mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <span className={`font-medium ${statusInfo.color}`}>
                시스템 상태: {statusInfo.text}
              </span>
            </div>
            <button 
              onClick={() => fetchAdminDashboardData()}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center text-text-muted">
          <p className="text-sm">
            마지막 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminHomeScreen;