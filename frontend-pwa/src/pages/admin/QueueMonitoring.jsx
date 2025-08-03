import { useState, useEffect } from 'react';
import { adminAPI, wsClient } from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const QueueMonitoring = () => {
  const [queueData, setQueueData] = useState(null);
  const [departmentData, setDepartmentData] = useState([]);
  const [missingPatients, setMissingPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    loadQueueData();
    connectRealTime();
    
    return () => {
      wsClient.disconnect('/admin/dashboard');
    };
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentData();
    }
  }, [selectedDepartment]);

  const loadQueueData = async () => {
    try {
      setLoading(true);
      const [queueStats, missing] = await Promise.all([
        adminAPI.queue.getRealTimeData(),
        adminAPI.queue.getMissingPatients().catch(() => ({ data: { missingPatients: [] } }))
      ]);
      
      if (queueStats.success) {
        setQueueData(queueStats.data);
      }
      
      if (missing.success || missing.data) {
        setMissingPatients(missing.data?.missingPatients || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Queue data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentData = async () => {
    try {
      const response = await adminAPI.queue.getByDepartment({
        department: selectedDepartment
      });
      if (response.success) {
        setDepartmentData(response.data);
      }
    } catch (err) {
      console.error('Department data loading error:', err);
    }
  };

  const connectRealTime = () => {
    try {
      wsClient.connect(
        '/admin/dashboard',
        (data) => {
          console.log('Real-time queue update:', data);
          if (data.type === 'dashboard_update' && data.data.queue_stats) {
            setQueueData(prevData => ({
              ...prevData,
              summary: data.data.queue_stats
            }));
          }
        },
        (error) => {
          console.error('WebSocket connection error:', error);
          setRealTimeConnected(false);
        }
      );
      setRealTimeConnected(true);
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setRealTimeConnected(false);
    }
  };

  const handleCallPatient = async (queueId, examRoom) => {
    try {
      await adminAPI.queue.callPatient({
        queueId,
        examRoom
      });
      loadQueueData(); // 데이터 새로고침
      alert('환자가 호출되었습니다.');
    } catch (err) {
      console.error('Patient call error:', err);
      alert('환자 호출 중 오류가 발생했습니다: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const summary = queueData?.summary || {};
  const departments = queueData?.departments || [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대기열 모니터링</h1>
          <p className="text-gray-600 mt-1">실시간 환자 대기 현황 및 관리</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${realTimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {realTimeConnected ? '실시간 연결됨' : '연결 끊김'}
          </span>
        </div>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="전체 대기"
          value={summary.totalWaiting || 0}
          color="blue"
          icon="👥"
        />
        <StatCard
          title="호출됨"
          value={summary.totalCalled || 0}
          color="orange"
          icon="📢"
        />
        <StatCard
          title="진행 중"
          value={summary.totalInProgress || 0}
          color="green"
          icon="🏥"
        />
        <StatCard
          title="평균 대기시간"
          value={`${Math.round(summary.avgWaitTime || 0)}분`}
          color="purple"
          icon="⏱️"
        />
      </div>

      {/* 부서별 대기 현황 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">부서별 대기 현황</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.examId}
                department={dept}
                onCallPatient={handleCallPatient}
              />
            ))}
          </div>
          
          {departments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">현재 대기 중인 환자가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 누락 환자 알림 */}
      {missingPatients.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg">
          <div className="px-6 py-4 border-b border-red-200">
            <h2 className="text-xl font-semibold text-red-800 flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              누락 환자 알림 ({missingPatients.length}명)
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {missingPatients.map((patient) => (
                <div key={patient.queueId} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <div className="font-medium text-gray-900">
                      {patient.queueNumber}번 - {patient.patientName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {patient.examName} | 호출 후 {patient.missingDuration}분 경과
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCallPatient(patient.queueId, '재호출')}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                    >
                      재호출
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 최근 호출 내역 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">최근 호출 내역</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {queueData?.recentCalled?.map((call, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-800">
                    {call.queueNumber}번 - {call.examName}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(call.calledAt).toLocaleTimeString('ko-KR')}
                </span>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">최근 호출 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
};

// 통계 카드 컴포넌트
const StatCard = ({ title, value, color, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-50`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold text-${color}-600`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

// 부서 카드 컴포넌트
const DepartmentCard = ({ department, onCallPatient }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (waitingCount) => {
    if (waitingCount === 0) return 'bg-green-100 text-green-800';
    if (waitingCount <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{department.examName}</h3>
          <p className="text-sm text-gray-600">{department.department}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(department.waitingCount)}`}>
          {department.waitingCount}명 대기
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">평균 대기시간:</span>
          <span className="font-medium">{Math.round(department.avgWaitTime || 0)}분</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">호출된 환자:</span>
          <span className="font-medium">{department.calledCount || 0}명</span>
        </div>
      </div>

      {department.waitingCount > 0 && (
        <div className="mt-3 flex space-x-2">
          <button
            onClick={() => onCallPatient(department.examId, department.examName)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            다음 환자 호출
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
          >
            {showDetails ? '숨기기' : '상세'}
          </button>
        </div>
      )}

      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">상세 정보가 여기에 표시됩니다.</p>
          {/* 추가 상세 정보 구현 가능 */}
        </div>
      )}
    </div>
  );
};

export default QueueMonitoring;