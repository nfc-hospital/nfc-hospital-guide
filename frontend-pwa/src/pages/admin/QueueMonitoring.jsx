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
  const [selectedDepartment, setSelectedDepartment] = useState(null);

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
        department: selectedDepartment.department
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
          
          // WebSocket 데이터 구조에 따라 처리
          if (data.type === 'dashboard_update') {
            setQueueData(prevData => {
              if (!prevData) return prevData;
              
              // queue_stats가 있는 경우
              if (data.data?.queue_stats) {
                return {
                  ...prevData,
                  summary: {
                    ...prevData.summary,
                    ...data.data.queue_stats
                  }
                };
              }
              
              // 직접 summary 데이터가 오는 경우
              if (data.data?.summary) {
                return {
                  ...prevData,
                  summary: {
                    ...prevData.summary,
                    ...data.data.summary
                  }
                };
              }
              
              // 전체 데이터 업데이트
              if (data.data) {
                return {
                  ...prevData,
                  ...data.data,
                  summary: {
                    ...prevData.summary,
                    ...(data.data.summary || {})
                  }
                };
              }
              
              return prevData;
            });
          }
          
          // queue_update 타입 처리 (대기열 상태 변경 시)
          if (data.type === 'queue_update' && data.data) {
            // 대기열 업데이트 시 데이터 새로고침
            loadQueueData();
          }
        },
        (error) => {
          console.error('WebSocket connection error:', error);
          setRealTimeConnected(false);
        },
        () => {
          console.log('WebSocket connected successfully');
          setRealTimeConnected(true);
        },
        () => {
          console.log('WebSocket disconnected');
          setRealTimeConnected(false);
        }
      );
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner />
      </div>
    );
  }

  const summary = queueData?.summary || {};
  const departments = queueData?.departments || [];

  // 대기 상태 색상 결정
  const getWaitingStatus = (count) => {
    if (count === 0) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '여유' };
    if (count <= 5) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '보통' };
    if (count <= 10) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '혼잡' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '매우 혼잡' };
  };

  // 통계 카드 컴포넌트
  const StatCard = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              <span className="text-green-500 mr-1">↑</span>
              <span className="text-gray-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-50 rounded-lg flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  // 부서 카드 컴포넌트
  const DepartmentCard = ({ department }) => {
    const [showDetails, setShowDetails] = useState(false);
    const status = getWaitingStatus(department.waitingCount);
    
    // 부서명과 검사명 표시
    const displayTitle = department.examName && department.examName !== department.department 
      ? department.examName 
      : department.department;
    
    return (
      <div className={`relative bg-white rounded-xl border-2 ${status.border} hover:shadow-xl transition-all duration-300`}>
        {/* 상태 배지 */}
        <div className={`absolute top-4 right-4 px-3 py-1 ${status.bg} ${status.text} text-xs font-bold rounded-full`}>
          {status.label}
        </div>
        
        {/* 카드 헤더 */}
        <div className="p-6 pb-0">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
            {department.department}
          </h3>
          <p className="text-xl font-bold text-gray-900 mb-4">{displayTitle}</p>
        </div>

        {/* 통계 정보 */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${status.text}`}>
                {department.waitingCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">대기중</div>
            </div>
            <div className="text-center border-l border-r border-gray-200">
              <div className="text-2xl font-bold text-orange-600">
                {department.calledCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">호출됨</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(department.avgWaitTime || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">평균(분)</div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>대기 밀도</span>
              <span>{Math.min(100, (department.waitingCount / 20) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  department.waitingCount === 0 ? 'bg-emerald-500' :
                  department.waitingCount <= 5 ? 'bg-blue-500' :
                  department.waitingCount <= 10 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (department.waitingCount / 20) * 100)}%` }}
              />
            </div>
          </div>

          {/* 검사실 정보 */}
          {department.exams && department.exams.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-between py-2"
            >
              <span>{department.exams.length}개 검사실 운영중</span>
              <span className="text-gray-400">{showDetails ? '▼' : '▶'}</span>
            </button>
          )}

          {/* 호출 버튼 */}
          {department.waitingCount > 0 && (
            <button 
              onClick={() => handleCallPatient(department.examId, department.examName || department.department)}
              className="w-full mt-3 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02] shadow-md"
            >
              다음 환자 호출
            </button>
          )}
        </div>

        {/* 상세 정보 */}
        {showDetails && department.exams && department.exams.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="font-semibold text-gray-900 mb-3 text-sm">검사실별 상세 현황</p>
            <div className="space-y-2">
              {department.exams.map((exam) => (
                <div key={exam.examId} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span className="text-sm text-gray-700">{exam.examName}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    {exam.waitingCount || 0}명
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                대기열 모니터링
              </h1>
              <p className="text-gray-600">실시간 환자 대기 현황 및 관리 시스템</p>
            </div>
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-full">
              <div className={`w-3 h-3 rounded-full ${realTimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {realTimeConnected ? '실시간 연결됨' : '연결 끊김'}
              </span>
            </div>
          </div>
        </div>

        {/* 전체 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="전체 대기" 
            value={summary.totalWaiting || 0}
            icon="👥" 
            color="blue"
          />
          <StatCard 
            title="호출됨" 
            value={summary.totalCalled || 0}
            icon="📢" 
            color="orange"
          />
          <StatCard 
            title="진행 중" 
            value={summary.totalInProgress || 0}
            icon="🏥" 
            color="green"
          />
          <StatCard 
            title="평균 대기시간" 
            value={`${Math.round(summary.avgWaitTime || 0)}분`}
            icon="⏱️" 
            color="purple"
          />
        </div>

        {/* 누락 환자 알림 */}
        {missingPatients.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 overflow-hidden">
            <div className="bg-red-500 text-white px-6 py-3">
              <h2 className="text-lg font-bold flex items-center">
                <span className="text-2xl mr-2">⚠️</span>
                누락 환자 알림 ({missingPatients.length}명)
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {missingPatients.map(patient => (
                  <div key={patient.queueId} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border-l-4 border-red-500">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {patient.queueNumber}번 - {patient.patientName}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {patient.examName} | 호출 후 {patient.missingDuration}분 경과
                      </p>
                    </div>
                    <button 
                      onClick={() => handleCallPatient(patient.queueId, '재호출')}
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                    >
                      재호출
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 부서별 대기 현황 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">부서별 대기 현황</h2>
            <div className="text-sm text-gray-500">
              총 {departments.length}개 부서 운영중
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <DepartmentCard key={dept.examId} department={dept} />
            ))}
          </div>
          
          {departments.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <span className="text-6xl">🏥</span>
              <p className="text-gray-500 text-lg mt-4">현재 대기 중인 환자가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 최근 호출 내역 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">최근 호출 내역</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {queueData?.recentCalled?.map((call, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="font-medium text-gray-900">{call.queueNumber}번</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-600">{call.examName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(call.calledAt).toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              )) || (
                <div className="text-center py-8">
                  <span className="text-4xl">📭</span>
                  <p className="text-gray-500 mt-2">최근 호출 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 max-w-sm shadow-xl">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-2">⚠️</span>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium underline"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueMonitoring;