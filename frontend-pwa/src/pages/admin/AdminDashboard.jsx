import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, wsClient } from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeConnected, setRealTimeConnected] = useState(false);

  useEffect(() => {
    loadDashboardData();
    connectRealTime();
    
    return () => {
      wsClient.disconnect('/admin/dashboard');
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [queueResponse, allTags, todayScansData, analytics] = await Promise.all([
        adminAPI.queue.getRealTimeData().catch(() => ({ data: { summary: {} } })),
        adminAPI.nfc.getAllTags({ limit: 100 }).catch(() => ({ results: [], count: 0 })),
        adminAPI.nfc.getTodayScans().catch(() => ({ totalScans: 0 })),
        adminAPI.analytics.getBottlenecks().catch(() => ({ summary: {} }))
      ]);
  
      // API 응답에서 실제 데이터 추출
      const queueData = queueResponse.data || { summary: {} };  // ← 여기가 핵심!
      
      const activeCount = allTags.results ? 
        allTags.results.filter(tag => tag.is_active === true).length : 
        0;
      
      const totalCount = allTags.count || 0;
      
      const nfcStatus = {
        summary: {
          healthyCount: activeCount,
          totalCount: totalCount,
          todayScans: todayScansData.totalScans || 0,
          errorCount: 0
        }
      };
  
      setDashboardData({
        queue: queueData,  // 이제 올바른 구조로 들어감
        nfc: nfcStatus,
        analytics: analytics
      });
      
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectRealTime = () => {
    try {
      wsClient.connect(
        '/admin/dashboard',
        (data) => {
          console.log('Real-time dashboard update:', data);
          if (data.type === 'dashboard_update') {
            setDashboardData(prevData => ({
              ...prevData,
              ...data.data
            }));
          }
        },
        (error) => {
          console.error('WebSocket connection error:', error);
          setRealTimeConnected(false);
        },
        () => {
          // onOpen 콜백: 연결 성공 시에만 상태 업데이트
          console.log('WebSocket connection established');
          setRealTimeConnected(true);
        },
        () => {
          // onClose 콜백: 연결 종료 시 상태 업데이트
          console.log('WebSocket connection closed');
          setRealTimeConnected(false);
        }
      );
      // 즉시 true로 설정하지 않고, onOpen 콜백에서 설정
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setRealTimeConnected(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">오류 발생</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const queueStats = dashboardData?.queue?.summary || {};
  const nfcStats = dashboardData?.nfc?.summary || {};

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 실시간 상태만 표시 */}
      <div className="flex justify-end items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${realTimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {realTimeConnected ? '실시간 연결됨' : '연결 끊김'}
          </span>
        </div>
      </div>

      {/* 주요 통계 카드 - 진행 중인 검사 제거, 오늘 NFC 스캔 추가 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="대기 중인 환자"
          value={dashboardData?.queue?.summary?.totalWaiting || 0}
          color="blue"
          icon="👥"
        />
        <StatCard
          title="호출된 환자"
          value={queueStats.totalCalled || 0}
          color="orange"
          icon="📢"
        />
        <StatCard
          title="활성 NFC 태그"
          value={`${nfcStats.healthyCount || 0}/${nfcStats.totalCount || 0}`}
          color="green"
          icon="🏷️"
        />
        <StatCard
          title="오늘 NFC 스캔"
          value={nfcStats.todayScans || 0}
          color="purple"
          icon="📡"
        />
      </div>

      {/* 빠른 액션 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="태그 관리"
          description="NFC 태그 등록, 수정, 상태 모니터링"
          link="/dashboard/nfc-tags"
          icon="🏷️"
          color="blue"
        />
        <QuickActionCard
          title="대기열 모니터링"
          description="실시간 대기열 현황 및 환자 호출"
          link="/dashboard/queue"
          icon="⏱️"
          color="green"
        />
        <QuickActionCard
          title="통계 및 분석"
          description="환자 동선, 대기시간, 혼잡도 분석"
          link="/dashboard/analytics"
          icon="📊"
          color="purple"
        />
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 활동</h2>
        <div className="space-y-3">
          {dashboardData?.queue?.recent_events?.slice(0, 5).map((event, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  event.priority === 'high' ? 'bg-red-500' : 
                  event.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <span className="text-gray-800">{event.message}</span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString('ko-KR')}
              </span>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-4">최근 활동이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 알림 및 경고 */}
      {nfcStats.errorCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">시스템 알림</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {nfcStats.errorCount}개의 NFC 태그에서 문제가 감지되었습니다.
              </p>
              <Link
                to="/dashboard/nfc-tags"
                className="text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                자세히 보기 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 통계 카드 컴포넌트
const StatCard = ({ title, value, color, icon }) => {
  const colorClasses = {
    blue: {
      container: 'bg-blue-50',
      text: 'text-blue-600',
      icon: 'bg-blue-50'
    },
    green: {
      container: 'bg-green-50',
      text: 'text-green-600',
      icon: 'bg-green-50'
    },
    orange: {
      container: 'bg-orange-50',
      text: 'text-orange-600',
      icon: 'bg-orange-50'
    },
    purple: {
      container: 'bg-purple-50',
      text: 'text-purple-600',
      icon: 'bg-purple-50'
    }
  };

  const styles = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${styles.icon}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold ${styles.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

// 빠른 액션 카드 컴포넌트
const QuickActionCard = ({ title, description, link, icon, color }) => {
  const colorClasses = {
    blue: {
      title: 'text-blue-600',
      action: 'text-blue-600'
    },
    green: {
      title: 'text-green-600',
      action: 'text-green-600'
    },
    purple: {
      title: 'text-purple-600',
      action: 'text-purple-600'
    }
  };

  const styles = colorClasses[color] || colorClasses.blue;

  return (
    <Link
      to={link}
      className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className={`text-lg font-semibold ${styles.title}`}>{title}</h3>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
      <div className={`mt-4 text-sm font-medium ${styles.action}`}>
        자세히 보기 →
      </div>
    </Link>
  );
};

export default AdminDashboard;