import React, { useState, useEffect, useRef } from 'react';
import apiService from '../../api/apiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminHomeScreen = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDepartments, setSelectedDepartments] = useState(new Set([
    '영상의학과', '진단검사의학과', '내과', '외과', '정형외과',
    '신경과', '응급의학과', '소아청소년과', '산부인과', '재활의학과'
  ]));
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '2025-01-01',
    end: '2025-01-15'
  });

  const [stats, setStats] = useState({
    todayPatients: 0,
    avgTreatmentTime: 0,
    systemStatus: '정상',
    utilization: 0
  });

  const [nfcTags, setNfcTags] = useState([]);
  const [queueData, setQueueData] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 초기값은 빈 배열 (데이터베이스에서 가져올 것임)
  const [examWaitTimeData, setExamWaitTimeData] = useState([]);
  const [examDataLoading, setExamDataLoading] = useState(true);

  // Navigation tabs configuration
  const navItems = [
    { id: 'dashboard', icon: '📊', label: '대시보드' },
    { id: 'nfc', icon: '📱', label: 'NFC 태그 관리' },
    { id: 'queue', icon: '👥', label: '대기열 모니터링' },
    { id: 'analytics', icon: '📈', label: '통계 및 분석' }
  ];

  useEffect(() => {
    console.log('🚀 컴포넌트 마운트!');
    
    // 데이터 로드
    const loadData = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchNFCTags(),
        fetchQueueData(),
        fetchAnalyticsData(),
        fetchExamData()  // 차트 데이터도 함께 로드
      ]);
      console.log('✅ 모든 데이터 로드 완료');
    };
    
    loadData();

    // 30초마다 데이터 새로고침 (차트 데이터는 제외)
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchQueueData();
      // fetchExamData는 한 번만 호출하고 새로고침하지 않음
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // examWaitTimeData 변경 모니터링
  useEffect(() => {
    console.log('📊 차트 데이터 상태 업데이트!');
    console.log('📊 데이터 타입:', typeof examWaitTimeData);
    console.log('📊 데이터 배열인가?:', Array.isArray(examWaitTimeData));
    console.log('📊 데이터 개수:', examWaitTimeData?.length);
    console.log('📊 데이터 내용:', examWaitTimeData);
    console.log('📊 조건 체크:', {
      'examWaitTimeData 존재': !!examWaitTimeData,
      'length > 0': examWaitTimeData?.length > 0,
      '전체 조건': examWaitTimeData && examWaitTimeData.length > 0
    });
  }, [examWaitTimeData]);

  // 대시보드 데이터 가져오기
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 병원 현황 및 통계 데이터 가져오기
      const [hospitalStatus, waitingStats, patientFlow] = await Promise.all([
        apiService.adminDashboard.getHospitalStatus().catch(() => null),
        apiService.analytics.getWaitingTime?.().catch(() => null),
        apiService.analytics.getPatientFlow?.().catch(() => null)
      ]);

      // 데이터 처리
      const todayPatients = hospitalStatus?.data?.todayPatients || 246;
      const avgWaitTime = waitingStats?.data?.averageWaitTime || 18;
      const systemStatus = hospitalStatus?.data?.systemStatus || '정상';
      const utilization = patientFlow?.data?.utilization || 78;

      setStats({
        todayPatients,
        avgTreatmentTime: avgWaitTime,
        systemStatus,
        utilization
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // NFC 태그 목록 가져오기
  const fetchNFCTags = async () => {
    try {
      // adminAPI를 통해 NFC 태그 목록 가져오기
      const { adminAPI } = await import('../../api/client');
      const response = await adminAPI.nfc.getAllTags();
      console.log('NFC 태그 응답:', response);
      
      if (response?.data) {
        const tags = response.data.results || response.data || [];
        console.log('받은 태그 데이터:', tags);
        setNfcTags(tags);
      }
    } catch (error) {
      console.error('NFC tags fetch error:', error);
    }
  };

  // 실시간 대기열 데이터 가져오기
  const fetchQueueData = async () => {
    try {
      const response = await apiService.queue.getRealtimeData().catch(() => null);
      if (response?.data) {
        const queues = response.data.queues || response.data || [];
        setQueueData(queues);
      }
    } catch (error) {
      console.error('Queue data fetch error:', error);
    }
  };

  // 통계 차트 데이터 가져오기
  const fetchAnalyticsData = async () => {
    try {
      const [waitingTime, congestion] = await Promise.all([
        apiService.analytics.getWaitingTime?.().catch(() => null),
        apiService.analytics.getCongestionHeatmap?.().catch(() => null)
      ]);

      setChartData({
        waitingTime: waitingTime?.data || {},
        congestion: congestion?.data || {}
      });
    } catch (error) {
      console.error('Analytics data fetch error:', error);
    }
  };

  // 검사별 평균 대기시간 데이터 가져오기
  const fetchExamData = async () => {
    console.log('📊📊📊 fetchExamData 함수 호출됨!!!');
    setExamDataLoading(true);
    try {
      console.log('📊 검사 데이터 요청 시작...');
      
      // axios 직접 사용
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('access_token');
      console.log('📊 토큰 확인:', token ? '있음' : '없음');
      
      console.log('📊 axios로 직접 요청 시작...');
      const response = await axios({
        method: 'GET',
        url: '/api/v1/dashboard/content/exams',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('📊 검사 데이터 응답 받음!');
      console.log('📊 응답 status:', response.status);
      console.log('📊 응답 data:', response.data);
      
      if (response?.data) {
        const exams = response.data.results || response.data || [];
        console.log('📊 검사 목록:', exams);
        
        // 검사별 평균 대기시간 데이터 변환 (안전하게 처리)
        if (exams && Array.isArray(exams) && exams.length > 0) {
          const waitTimeData = exams
            .filter(exam => exam && typeof exam === 'object' && (exam.title || exam.name)) // 안전성 검사
            .map(exam => {
              try {
                return {
                  name: exam.title || exam.name || '이름없음',
                  waitTime: exam.average_wait_time || exam.average_duration || 30,
                  department: exam.department || '미분류',
                  category: exam.category || null,
                  waitingCount: exam.current_waiting_count || 0
                };
              } catch (err) {
                console.error('에러 발생한 exam:', exam, err);
                return {
                  name: '오류데이터',
                  waitTime: 30,
                  department: '미분류',
                  category: null,
                  waitingCount: 0
                };
              }
            })
            .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0)); // 대기시간 긴 순서로 정렬
          
          console.log('📊 차트 데이터 설정:', waitTimeData);
          console.log('📊 차트 데이터 개수:', waitTimeData.length);
          
          if (waitTimeData.length > 0) {
            setExamWaitTimeData(waitTimeData);
            console.log('✅ 차트 데이터 설정 완료!');
          } else {
            console.log('📊 데이터는 있지만 유효한 title이 없음');
            // 샘플 데이터 사용
            setExamWaitTimeData([
              { name: 'CT 촬영', waitTime: 30, department: 'CT실', waitingCount: 0 },
              { name: 'MRI 촬영', waitTime: 30, department: 'MRI실', waitingCount: 0 },
              { name: 'X-ray 촬영', waitTime: 30, department: 'X-ray실', waitingCount: 0 },
              { name: '혈액검사', waitTime: 15, department: '진단검사의학과', waitingCount: 0 }
            ]);
          }
        } else {
          console.log('📊 검사 데이터가 없음');
        }
      } else {
        console.log('📊 응답이 없거나 data 필드가 없음');
      }
    } catch (error) {
      console.error('📊 Exam data fetch error:', error);
      console.error('📊 에러 상세:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      // 에러 시 샘플 데이터 사용
      console.log('📊 API 에러로 인해 샘플 데이터 사용');
      setExamWaitTimeData([
        { name: 'CT 촬영', waitTime: 30, department: 'CT실', waitingCount: 0 },
        { name: 'MRI 촬영', waitTime: 30, department: 'MRI실', waitingCount: 0 },
        { name: 'X-ray 촬영', waitTime: 30, department: 'X-ray실', waitingCount: 0 },
        { name: '혈액검사', waitTime: 15, department: '진단검사의학과', waitingCount: 0 }
      ]);
    } finally {
      setExamDataLoading(false);
      console.log('📊 데이터 로딩 완료');
    }
  };

  // TODO: [API] 데이터 내보내기
  const exportData = async (format) => {
    setShowExportDropdown(false);
    // const response = await fetch('/api/admin/export', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ 
    //     format, 
    //     dateRange, 
    //     departments: Array.from(selectedDepartments) 
    //   })
    // });
    // const blob = await response.blob();
    // Download logic here
  };

  // Render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <DashboardContent stats={stats} loading={loading} error={error} examWaitTimeData={examWaitTimeData} examDataLoading={examDataLoading} />;
      case 'nfc':
        return <NFCManagementContent tags={nfcTags} />;
      case 'queue':
        return <QueueMonitoringContent queueData={queueData} />;
      case 'analytics':
        return (
          <AnalyticsContent 
            selectedDepartments={selectedDepartments}
            setSelectedDepartments={setSelectedDepartments}
            showDeptDropdown={showDeptDropdown}
            setShowDeptDropdown={setShowDeptDropdown}
            showExportDropdown={showExportDropdown}
            setShowExportDropdown={setShowExportDropdown}
            exportData={exportData}
            dateRange={dateRange}
            setDateRange={setDateRange}
            chartData={chartData}
          />
        );
      default:
        return <DashboardContent stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Container */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 fixed left-0 top-0 bottom-0">
          <nav className="pt-20 pb-5">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`w-full flex items-center px-5 py-3 text-sm font-medium transition-all duration-200
                  ${activeTab === item.id 
                    ? 'bg-blue-50 text-blue-600 border-r-3 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="ml-64 flex-1 bg-white min-h-screen">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const DashboardContent = ({ stats, loading, error, examWaitTimeData, examDataLoading }) => {
  // 로딩 상태
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-800 font-semibold mb-2">데이터 로드 실패</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Stats Cards - 반응형 그리드 */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex-1 min-w-[250px] bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.todayPatients}명
              </div>
              <div className="text-sm text-gray-500 mt-1">오늘 방문 환자</div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">전일 대비</span>
            <span className="text-green-600 font-medium">↑ 12%</span>
          </div>
        </div>

        <div className="flex-1 min-w-[250px] bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.avgTreatmentTime}분
              </div>
              <div className="text-sm text-gray-500 mt-1">평균 진료 시간</div>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">
              ⏱️
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">전주 대비</span>
            <span className="text-green-600 font-medium">↓ 3분</span>
          </div>
        </div>

        <div className="flex-1 min-w-[250px] bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {stats.systemStatus}
              </div>
              <div className="text-sm text-gray-500 mt-1">시스템 상태</div>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl">
              ✅
            </div>
          </div>
          <div className="text-xs text-gray-400">모든 시스템 정상 작동</div>
        </div>

        <div className="flex-1 min-w-[250px] bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.utilization}%
              </div>
              <div className="text-sm text-gray-500 mt-1">병원 전체 가동률</div>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-xl">
              📊
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">전월 대비</span>
            <span className="text-red-600 font-medium">↑ 5%</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-lg font-semibold text-gray-900">검사별 평균 대기 시간</div>
              {examWaitTimeData.length > 10}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">오늘 14:30 기준</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-600 font-medium">
                  오늘
                </button>
                <button className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100">
                  이번 주
                </button>
                <button className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100">
                  이번 달
                </button>
              </div>
            </div>
          </div>
          {/* 차트 영역 - 가로 스크롤 가능 */}
          <div className="w-full h-96 bg-white overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {/* 데이터 로딩 중 표시 */}
            {examDataLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">검사 데이터를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <>
            
            {/* Recharts 차트 - 동적 너비 설정 */}
            <div style={{ 
              width: examWaitTimeData.length > 10 ? `${examWaitTimeData.length * 80}px` : '100%', 
              height: '350px',
              minWidth: '100%'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={examWaitTimeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                    height={100}
                  />
                  <YAxis 
                    label={{ value: '대기시간(분)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="waitTime" barSize={40}>
                    {examWaitTimeData.map((entry, index) => {
                      const maxWaitTime = Math.max(...examWaitTimeData.map(e => e.waitTime));
                      const minWaitTime = Math.min(...examWaitTimeData.map(e => e.waitTime));
                      
                      let fillColor = '#9ca3af'; // 기본 회색
                      if (entry.waitTime === maxWaitTime) {
                        fillColor = '#ef4444'; // 최고값 빨간색
                      } else if (entry.waitTime === minWaitTime) {
                        fillColor = '#10b981'; // 최저값 초록색
                      }
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fillColor} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </>
            )}
          </div>
          {examWaitTimeData.length > 8 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              ← 좌우로 스크롤하여 더 많은 검사를 확인하세요 →
            </p>
          )}
        </div>

        {/* Map */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="text-lg font-semibold text-gray-900">병원 혼잡도 (구역별)</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">실시간</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-600 font-medium">
                  실시간
                </button>
                <button className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100">
                  예측
                </button>
              </div>
            </div>
          </div>
          {/* TODO: [API] 실제 지도 데이터 연결 */}
          <div className="h-80 bg-gray-50 rounded-lg relative flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-2 opacity-50">🗺️</div>
              <div className="text-sm">병원 지도 영역</div>
              <div className="text-xs mt-1">실제 지도가 여기에 표시됩니다</div>
            </div>
            
            {/* Congestion Circles with border matching fill color */}
            <div className="absolute top-16 left-20 w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                 style={{
                   border: '3px solid #ef4444',
                   backgroundColor: 'rgba(239, 68, 68, 0.2)'
                 }}>
              <div className="text-red-600 font-bold text-lg">85%</div>
              <div className="text-xs text-red-600">응급실</div>
            </div>
            <div className="absolute top-32 right-24 w-18 h-18 rounded-full flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                 style={{
                   border: '3px solid #eab308',
                   backgroundColor: 'rgba(234, 179, 8, 0.2)'
                 }}>
              <div className="text-yellow-600 font-bold">60%</div>
              <div className="text-xs text-yellow-600">외래</div>
            </div>
            <div className="absolute bottom-20 left-28 w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                 style={{
                   border: '3px solid #22c55e',
                   backgroundColor: 'rgba(34, 197, 94, 0.2)'
                 }}>
              <div className="text-green-600 font-bold">35%</div>
              <div className="text-xs text-green-600">검사실</div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>낮음 (0-40%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>보통 (41-70%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>높음 (71-100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// NFC Management Component
const NFCManagementContent = ({ tags: initialTags }) => {
  const [tags, setTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showScanFilter, setShowScanFilter] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedScan, setSelectedScan] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTagCount, setTotalTagCount] = useState(0);  // 전체 태그 개수 저장
  const [availableBuildings, setAvailableBuildings] = useState(['전체']);  // 실제 building 목록 저장
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTag, setNewTag] = useState({
    code: '',
    tag_uid: '',
    building: '본관',
    floor: 1,
    room: '',
    description: '',
    x_coord: 0,
    y_coord: 0
  });

  // 모든 building 목록 가져오기
  const fetchAllBuildings = async () => {
    try {
      const { adminAPI } = await import('../../api/client');
      // 전체 태그를 가져와서 building 목록 추출 (limit을 크게 설정)
      const response = await adminAPI.nfc.getAllTags({ limit: 100, page: 1 });
      
      let allTags = [];
      if (response?.results) {
        allTags = response.results;
      } else if (response?.data?.results) {
        allTags = response.data.results;
      }
      
      // 모든 태그에서 building 추출
      const buildingSet = new Set();
      allTags.forEach(tag => {
        const building = tag.location?.building || tag.building;
        if (building) {
          buildingSet.add(building);
        }
      });
      
      // 정렬하고 '전체' 추가
      const sortedBuildings = ['전체', ...Array.from(buildingSet).sort()];
      console.log('🏢 전체 building 목록:', sortedBuildings);
      setAvailableBuildings(sortedBuildings);
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
      // 에러 시 기본값 사용
      setAvailableBuildings(['전체', '본관', '신관', '암센터', '별관']);
    }
  };

  // API를 통한 태그 목록 가져오기
  const fetchTags = async () => {
    try {
      setLoading(true);
      console.log('🔍 fetchTags 호출됨, 현재 페이지:', currentPage);
      
      // 필터 파라미터 구성
      const params = {
        page: currentPage,
        limit: 10,
      };
      
      // 조건부로 파라미터 추가
      if (selectedStatus === '활성') {
        params.is_active = 'true';
      } else if (selectedStatus === '비활성') {
        params.is_active = 'false';
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // location 필터 파라미터 (백엔드가 location 파라미터를 받음)
      if (selectedLocation && selectedLocation !== '전체') {
        params.location = selectedLocation;
      }
      
      // 마지막 스캔 정렬 파라미터
      if (selectedScan) {
        params.ordering = selectedScan === 'desc' ? '-last_scanned_at' : 'last_scanned_at';
        console.log('🔍 정렬 적용:', selectedScan, '→', params.ordering);
      }
      
      console.log('🔍 API 요청 파라미터:', params);

      // adminAPI를 통한 태그 목록 조회
      const { adminAPI } = await import('../../api/client');
      const response = await adminAPI.nfc.getAllTags(params);
      console.log('🔍 NFC 태그 fetchTags 응답:', response);
      console.log('🔍 response.count:', response?.count);
      console.log('🔍 response.data:', response?.data);
      
      // 다양한 응답 형식 처리
      let tagData = [];
      let totalCount = 0;
      
      // Django REST Framework 페이지네이션 응답 형식 처리
      if (response?.count !== undefined && response?.results) {
        // 표준 DRF 페이지네이션 응답: {count: 21, next: ..., previous: ..., results: [...]}
        tagData = response.results;
        totalCount = response.count;
      } else if (response?.data?.count !== undefined && response?.data?.results) {
        // axios 래핑된 DRF 응답
        tagData = response.data.results;
        totalCount = response.data.count;
      } else if (response?.data && Array.isArray(response.data)) {
        tagData = response.data;
      } else if (response?.results) {
        tagData = response.results;
      } else if (Array.isArray(response)) {
        tagData = response;
      }
      
      console.log('🔍 추출된 태그 데이터:', tagData);
      
      if (tagData.length > 0) {
        // 백엔드 응답 데이터 변환
        const formattedTags = tagData.map(tag => {
          // 각 태그의 원본 데이터 확인
          console.log('🏷️ 원본 태그 데이터:', tag);
          
          // API 응답 구조: location이 객체로 되어 있음
          // location: { building, floor, room, description }
          const building = tag.location?.building || tag.building || '본관';
          const floor = tag.location?.floor || tag.floor || 1;
          const room = tag.location?.room || tag.room || '';
          const description = tag.location?.description || tag.description || '';
          
          // location 문자열 생성 - room이 있을 때만 추가
          let locationStr = `${building} ${floor}층`;
          if (room && room.trim() !== '') {
            locationStr += ` ${room}`;
          }
          
          return {
            id: tag.tag_id || tag.id,
            code: tag.code || '',
            tag_uid: tag.tag_uid || '',
            building: building,
            floor: floor,
            room: room,
            location: locationStr.trim(),
            status: tag.is_active ? 'active' : 'inactive',
            lastScan: tag.last_scanned_at ? 
              new Date(tag.last_scanned_at).toLocaleString('ko-KR') : '없음',
            description: description
          };
        });
        
        console.log('🔍 포맷된 태그:', formattedTags);
        console.log('🔍 마지막 스캔 시간 확인:', formattedTags.map(t => ({
          id: t.id,
          lastScan: t.lastScan
        })));
        setTags(formattedTags);
        
        // 중복 없는 building 목록 추출 (현재 페이지에서만)
        const buildings = [...new Set(formattedTags.map(tag => tag.building))];
        console.log('🏢 현재 페이지의 buildings:', buildings);
      } else {
        console.log('🔍 태그 데이터가 없거나 빈 배열, 샘플 데이터 생성');
        // 샘플 데이터 설정
        const sampleTags = [
          {
            id: 'tag-001',
            code: 'NFC-001',
            tag_uid: 'UID-001',
            building: '본관',
            floor: 1,
            room: '101호',
            location: '본관 1층 101호',
            status: 'active',
            lastScan: '2025-01-15 14:30:00',
            description: '접수처 안내 태그'
          },
          {
            id: 'tag-002',
            code: 'NFC-002',
            tag_uid: 'UID-002',
            building: '본관',
            floor: 2,
            room: 'MRI실',
            location: '본관 2층 MRI실',
            status: 'active',
            lastScan: '2025-01-15 13:45:00',
            description: 'MRI 검사실 입구'
          },
          {
            id: 'tag-003',
            code: 'NFC-003',
            tag_uid: 'UID-003',
            building: '별관',
            floor: 1,
            room: '응급실',
            location: '별관 1층 응급실',
            status: 'inactive',
            lastScan: '없음',
            description: '응급실 대기구역'
          }
        ];
        setTags(sampleTags);
      }
      
      // 페이지네이션 정보 설정 (위에서 이미 추출한 totalCount 사용)
      if (totalCount > 0) {
        const calculatedPages = Math.ceil(totalCount / 10);
        console.log('🔍 총 태그 수:', totalCount, '총 페이지 수:', calculatedPages);
        setTotalTagCount(totalCount);  // 전체 태그 개수 저장
        setTotalPages(calculatedPages);
      } else {
        // totalCount가 없으면 현재 데이터로 계산
        const estimatedPages = Math.ceil(tagData.length / 10);
        setTotalTagCount(tagData.length);  // 현재 데이터 개수로 설정
        setTotalPages(estimatedPages || 1);
      }
    } catch (error) {
      console.error('🔍 Failed to fetch NFC tags:', error);
      // 에러 시 샘플 데이터 표시
      const sampleTags = [
        {
          id: 'tag-001',
          code: 'NFC-001',
          tag_uid: 'UID-001',
          building: '본관',
          floor: 1,
          room: '101호',
          location: '본관 1층 101호',
          status: 'active',
          lastScan: '2025-01-15 14:30:00',
          description: '접수처 안내 태그'
        }
      ];
      setTags(sampleTags);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기화 (initialTags는 무시하고 항상 API에서 가져오기)
  useEffect(() => {
    console.log('🏷️ NFCManagementContent 마운트됨');
    // 컴포넌트가 마운트되면 building 목록을 가져옴
    fetchAllBuildings();
    // fetchTags는 currentPage 변경 시 useEffect에서 자동 호출됨
  }, []);

  // 태그 상태 변경
  const handleStatusChange = async (tagId, newStatus) => {
    try {
      const { adminAPI } = await import('../../api/client');
      const isActive = newStatus === 'active';
      
      // 현재 태그 정보 찾기
      const currentTag = tags.find(t => t.id === tagId);
      if (!currentTag) return;
      
      // API 요청 구조에 맞게 location 객체로 전송
      await adminAPI.nfc.updateTag(tagId, {
        is_active: isActive,
        location: {
          building: currentTag.building,
          floor: currentTag.floor,
          room: currentTag.room,
          description: currentTag.description
        },
        code: currentTag.code,
        tag_uid: currentTag.tag_uid
      });
      
      // 목록 새로고침
      fetchTags();
    } catch (error) {
      console.error('Failed to update tag status:', error);
    }
  };

  // 새 태그 등록
  const handleAddTag = async () => {
    try {
      const { adminAPI } = await import('../../api/client');
      // API 요청 구조에 맞게 location 객체로 전송
      const response = await adminAPI.nfc.createTag({
        code: newTag.code,
        tag_uid: newTag.tag_uid,
        location: {
          building: newTag.building,
          floor: newTag.floor,
          room: newTag.room,
          description: newTag.description
        },
        coordinates: {
          x: newTag.x_coord,
          y: newTag.y_coord
        },
        is_active: true
      });
      
      if (response) {
        setShowAddModal(false);
        setNewTag({
          code: '',
          tag_uid: '',
          building: '본관',
          floor: 1,
          room: '',
          description: '',
          x_coord: 0,
          y_coord: 0
        });
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('태그 등록에 실패했습니다.');
    }
  };

  // 필터나 페이지 변경 시 데이터 재로드
  useEffect(() => {
    fetchTags();
  }, [currentPage, selectedStatus, selectedLocation, searchTerm, selectedScan]);

  const displayTags = tags;
  
  const statuses = ['전체', '활성', '비활성'];

  return (
    <div className="p-8 relative">
      {/* 로딩 오버레이 */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
          <div className="text-xl">로딩 중...</div>
        </div>
      )}
      
      {/* 새 태그 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">새 NFC 태그 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그 UID *</label>
                <input 
                  value={newTag.tag_uid}
                  onChange={(e) => setNewTag({...newTag, tag_uid: e.target.value})}
                  className="w-full p-2 border rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그 코드 *</label>
                <input 
                  value={newTag.code}
                  onChange={(e) => setNewTag({...newTag, code: e.target.value})}
                  className="w-full p-2 border rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">건물명 *</label>
                <input 
                  value={newTag.building}
                  onChange={(e) => setNewTag({...newTag, building: e.target.value})}
                  className="w-full p-2 border rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">층 *</label>
                <input 
                  type="number" 
                  value={newTag.floor}
                  onChange={(e) => setNewTag({...newTag, floor: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">방 번호 *</label>
                <input 
                  value={newTag.room}
                  onChange={(e) => setNewTag({...newTag, room: e.target.value})}
                  className="w-full p-2 border rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea 
                  value={newTag.description}
                  onChange={(e) => setNewTag({...newTag, description: e.target.value})}
                  className="w-full p-2 border rounded" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">X 좌표 *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newTag.x_coord}
                    onChange={(e) => setNewTag({...newTag, x_coord: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Y 좌표 *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newTag.y_coord}
                    onChange={(e) => setNewTag({...newTag, y_coord: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded" 
                    required 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setShowAddModal(false)} 
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button 
                onClick={handleAddTag} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">NFC 태그 관리</h1>
        <p className="text-sm text-gray-600">병원 내 NFC 태그 등록, 수정, 모니터링</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">태그 검색</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="태그 코드 또는 위치 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
          onClick={() => {
            setSearchTerm('');
            setSelectedLocation('');
            setSelectedStatus('');
            setCurrentPage(1);
          }}
        >
          초기화
        </button>
        <button 
          className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          onClick={() => setShowAddModal(true)}
        >
          새 태그 등록
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                태그 코드
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider relative">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowLocationFilter(!showLocationFilter)}>
                  <span>위치</span>
                  <span className="text-[10px] text-gray-400 ml-2">▼</span>
                </div>
                {showLocationFilter && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[150px] z-10">
                    {availableBuildings.map(building => (
                      <div 
                        key={building}
                        className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedLocation === building ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation(building);
                          setShowLocationFilter(false);
                          setCurrentPage(1);  // 필터 변경 시 첫 페이지로 이동
                        }}
                      >
                        {building}
                      </div>
                    ))}
                  </div>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider relative">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowStatusFilter(!showStatusFilter)}>
                  <span>상태</span>
                  <span className="text-[10px] text-gray-400 ml-2">▼</span>
                </div>
                {showStatusFilter && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[120px] z-10">
                    {statuses.map(status => (
                      <div 
                        key={status}
                        className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedStatus === status ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatus(status);
                          setShowStatusFilter(false);
                        }}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider relative">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowScanFilter(!showScanFilter)}>
                  <span>마지막 스캔</span>
                  <span className="text-[10px] text-gray-400 ml-2">▼</span>
                </div>
                {showScanFilter && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[150px] z-10">
                    <div 
                      className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedScan === 'desc' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScan('desc');
                        setShowScanFilter(false);
                        setCurrentPage(1);  // 정렬 변경 시 첫 페이지로
                      }}
                    >
                      최신순
                    </div>
                    <div 
                      className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedScan === 'asc' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScan('asc');
                        setShowScanFilter(false);
                        setCurrentPage(1);  // 정렬 변경 시 첫 페이지로
                      }}
                    >
                      오래된순
                    </div>
                    <div 
                      className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedScan === '' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScan('');
                        setShowScanFilter(false);
                        setCurrentPage(1);  // 정렬 변경 시 첫 페이지로
                      }}
                    >
                      기본 (생성일순)
                    </div>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayTags.map(tag => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{tag.id}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{tag.code}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    {tag.location}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      tag.status === 'active' 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-red-100 text-red-700 border-red-300'
                    }`}
                    value={tag.status}
                    onChange={(e) => handleStatusChange(tag.id, e.target.value)}
                  >
                    <option value="active">활성</option>
                    <option value="inactive">비활성</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{tag.lastScan}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            총 {totalTagCount || tags.length}개 태그
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              이전
            </button>
            <span className="px-3 py-1 text-sm">
              {currentPage} / {totalPages}
            </span>
            <button 
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Queue Monitoring Component
const QueueMonitoringContent = ({ queueData }) => {
  const [selectedDept, setSelectedDept] = useState('all');
  const [lastUpdate, setLastUpdate] = useState('14:32:15');
  const [roomCards, setRoomCards] = useState([]);
  const [patientFlow, setPatientFlow] = useState({
    reception: 0,
    waiting: 0,
    examining: 0,
    results: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(false);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchQueueData(selectedDept);
  }, []); // 처음 마운트 시에만 실행

  // 실시간 대기열 데이터 가져오기
  const fetchQueueData = async (department = 'all') => {
    console.log('🔄 fetchQueueData 시작 - 부서:', department);
    try {
      setLoading(true);
      
      // DB 연동: 실제 API 호출
      console.log('📊 apiService 객체:', apiService);
      console.log('📊 apiService.appointments:', apiService.appointments);
      console.log('📊 getAllExams 함수 존재?:', typeof apiService.appointments?.getAllExams);
      
      // 1. DB에서 검사실 정보 가져오기 - 여러 방법 시도
      let exams = [];
      
      // 방법1: apiService.appointments.getAllExams 시도
      try {
        console.log('🔄 방법1: apiService.appointments.getAllExams 시도');
        // 부서별 필터링 파라미터 추가
        const params = department !== 'all' ? { department } : {};
        const examsResponse = await apiService.appointments.getAllExams(params);
        console.log('📊 방법1 응답:', examsResponse);
        
        exams = examsResponse?.data?.results || examsResponse?.results || examsResponse?.data || [];
        console.log('✅ 방법1 성공 - 검사실 데이터:', exams.length, '개');
      } catch (error1) {
        console.log('❌ 방법1 실패:', error1.message);
        
        // 방법2: adminAPI 사용
        try {
          console.log('🔄 방법2: adminAPI 사용 시도');
          const { adminAPI } = await import('../../api/client');
          // 부서별 필터링 파라미터 추가
          const params = department !== 'all' ? { department } : {};
          const adminResponse = await adminAPI.content.getExams?.(params) || await adminAPI.dashboard.getExams?.(params);
          console.log('📊 방법2 응답:', adminResponse);
          
          exams = adminResponse?.data?.results || adminResponse?.results || adminResponse?.data || [];
          console.log('✅ 방법2 성공 - 검사실 데이터:', exams.length, '개');
        } catch (error2) {
          console.log('❌ 방법2 실패:', error2.message);
          
          // 방법3: 직접 fetch 사용
          try {
            console.log('🔄 방법3: 직접 fetch 사용');
            // 부서별 필터링 쿼리 파라미터 추가
            const queryParams = department !== 'all' ? `?department=${encodeURIComponent(department)}` : '';
            const directResponse = await fetch(`/api/v1/appointments/exams/${queryParams}`);
            const directData = await directResponse.json();
            console.log('📊 방법3 응답:', directData);
            
            exams = directData?.results || directData?.data || directData || [];
            console.log('✅ 방법3 성공 - 검사실 데이터:', exams.length, '개');
          } catch (error3) {
            console.log('❌ 방법3 실패:', error3.message);
            console.log('⚠️ 모든 API 접근 방법 실패 - Mock 데이터 사용');
            exams = [];
          }
        }
      }
      
      // 2. 실시간 대기열 데이터 가져오기
      const queueResponse = await apiService.queue.getRealtimeData().catch(err => {
        console.log('⚠️ 대기열 데이터 에러 (Mock 사용):', err);
        return null;
      });
      const queues = queueResponse?.data?.queues || [];
      console.log('📊 대기열 데이터:', queues);
      
      // 3. DB 데이터가 있으면 사용, 없으면 Mock
      if (exams && Array.isArray(exams) && exams.length > 0) {
        console.log('✅ DB 데이터 사용하여 카드 생성 - 총', exams.length, '개');
        
        const cards = exams.filter(exam => exam && typeof exam === 'object').map((exam, index) => {
          console.log(`📊 검사실 [${index}]:`, exam);
          
          // exam 객체의 안전성 검사
          const examId = exam?.exam_id || exam?.id || `exam_${index}`;
          const examTitle = exam?.title || exam?.name || `검사${index + 1}`;
          const examDept = exam?.department || 'general';
          
          try {
            // 해당 검사실의 대기열 찾기
            const examQueues = queues.filter(q => q?.exam_id === examId);
            const waitingCount = exam?.current_waiting_count || examQueues.filter(q => q?.state === 'waiting').length || 0;
            const processingCount = examQueues.filter(q => q?.state === 'ongoing').length || 0;
            const avgWaitTime = exam?.average_wait_time || examQueues.reduce((sum, q) => sum + (q?.estimated_wait_time || 0), 0) / (examQueues.length || 1) || 0;
            
            return {
              dept: examDept,
              name: examTitle,
              room: exam?.room || `${Math.floor(Math.random() * 3) + 1}0${Math.floor(Math.random() * 9) + 1}호`,
              floor: exam?.floor || `${Math.floor(Math.random() * 5) + 1}층`,
              status: avgWaitTime > 90 ? 'error' : avgWaitTime > 60 ? 'warning' : 'normal',
              waiting: waitingCount,
              waitTime: Math.round(avgWaitTime) || 0,
              processing: processingCount,
              equipment: exam?.is_active !== false ? '정상' : '점검중'
            };
          } catch (itemError) {
            console.error(`❌ 검사실 [${index}] 처리 중 에러:`, itemError, exam);
            return {
              dept: 'general',
              name: examTitle,
              room: `${index + 1}01호`,
              floor: '1층',
              status: 'normal',
              waiting: 0,
              waitTime: 0,
              processing: 0,
              equipment: '정상'
            };
          }
        });
        
        console.log('📊 생성된 DB 기반 카드:', cards);
        setRoomCards(cards);
      } else {
        console.log('⚠️ DB 데이터 없음 - Mock 데이터 사용');
        setRoomCards(getMockData());
      }
      
      // 환자 플로우 데이터 (대기열 상태별 집계)
      const summary = {
        registered: queues.filter(q => q.state === 'registered').length,
        totalWaiting: queues.filter(q => q.state === 'waiting').length,
        totalInProgress: queues.filter(q => q.state === 'ongoing').length,
        totalCalled: queues.filter(q => q.state === 'called').length,
        totalCompleted: queues.filter(q => q.state === 'completed').length
      };
      
      setPatientFlow({
        reception: summary.registered || 12,
        waiting: summary.totalWaiting || 45,
        examining: summary.totalInProgress || 8,
        results: summary.totalCalled || 23,
        completed: summary.totalCompleted || 89
      });
      
      console.log('✅ DB 연동 완료');
      
    } catch (error) {
      console.error('❌ fetchQueueData 전체 에러:', error);
      console.log('📊 Mock 데이터로 대체');
      setRoomCards(getMockData());
    } finally {
      setLoading(false);
      console.log('✅ fetchQueueData 완료');
    }
  };

  // Mock 데이터 반환 함수 (실제 데이터 없을 때 사용)
  const getMockData = () => [
    { dept: '영상의학과', name: '뇇 MRI', room: '201호', floor: '2층', status: 'normal', waiting: 4, waitTime: 35, processing: 1, equipment: '정상' },
    { dept: '영상의학과', name: '복부 CT', room: '202호', floor: '2층', status: 'warning', waiting: 12, waitTime: 65, processing: 1, equipment: '정상' },
    { dept: '영상의학과', name: '흰부 X-ray', room: '203호', floor: '2층', status: 'normal', waiting: 2, waitTime: 15, processing: 1, equipment: '정상' },
    { dept: '영상의학과', name: '복부 초음파', room: '204호', floor: '2층', status: 'normal', waiting: 6, waitTime: 25, processing: 1, equipment: '정상' },
    { dept: '영상의학과', name: '골밀도 검사', room: '205호', floor: '2층', status: 'normal', waiting: 3, waitTime: 20, processing: 0, equipment: '정상' },
    { dept: '진단검사의학과', name: '기본 혈액검사', room: '101호', floor: '1층', status: 'normal', waiting: 8, waitTime: 10, processing: 2, equipment: '정상' },
    { dept: '진단검사의학과', name: '소변검사', room: '102호', floor: '1층', status: 'normal', waiting: 5, waitTime: 8, processing: 1, equipment: '정상' },
    { dept: '진단검사의학과', name: 'PCR 검사', room: '103호', floor: '1층', status: 'warning', waiting: 15, waitTime: 45, processing: 1, equipment: '정상' },
    { dept: '순환기내과', name: '심전도 검사', room: '301호', floor: '3층', status: 'error', waiting: 0, waitTime: '-', processing: 0, equipment: '점검중' },
    { dept: '순환기내과', name: '심초음파', room: '302호', floor: '3층', status: 'normal', waiting: 7, waitTime: 30, processing: 1, equipment: '정상' },
    { dept: '소화기내과', name: '위내시경', room: '401호', floor: '4층', status: 'warning', waiting: 11, waitTime: 75, processing: 1, equipment: '정상' },
    { dept: '내과', name: '내과 진료', room: '501호', floor: '5층', status: 'normal', waiting: 9, waitTime: 40, processing: 2, equipment: '정상' },
    { dept: '내과', name: '기본 검사', room: '502호', floor: '5층', status: 'normal', waiting: 3, waitTime: 15, processing: 1, equipment: '정상' }
  ];

  useEffect(() => {
    fetchQueueData();
    
    // 30초마다 자동 갱신
    const dataInterval = setInterval(fetchQueueData, 30000);
    
    // 시간 업데이트 인터벌
    const timeInterval = setInterval(() => {
      const now = new Date();
      setLastUpdate(
        now.getHours().toString().padStart(2, '0') + ':' + 
        now.getMinutes().toString().padStart(2, '0') + ':' + 
        now.getSeconds().toString().padStart(2, '0')
      );
    }, 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const departments = ['전체', '영상의학과', '진단검사의학과', '순환기내과', '소화기내과', '내과', '정형외과'];
  
  // 선택된 부서에 따라 필터링
  const filteredRoomCards = selectedDept === '전체' || selectedDept === 'all' 
    ? roomCards 
    : roomCards.filter(room => {
        // 영어로 된 department와 한글 부서명 매핑
        const deptMap = {
          '영상의학과': ['radiology', 'Radiology', '영상의학과', 'ct실', 'mri실', 'x-ray실'],
          '진단검사의학과': ['laboratory', 'Laboratory', '진단검사의학과', 'lab'],
          '순환기내과': ['cardiology', 'Cardiology', '순환기내과', '심장내과'],
          '소화기내과': ['gastro', 'Gastroenterology', '소화기내과', 'gastroenterology'],
          '정형외과': ['orthopedics', 'Orthopedics', '정형외과'],
          '내과': ['internal', '내과', '가정의학과']
        };
        const deptList = deptMap[selectedDept] || [];
        return deptList.some(dept => 
          room.dept?.toLowerCase() === dept.toLowerCase()
        );
      });

  return (
    <div className="p-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
          <div className="text-xl">로딩 중...</div>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">대기열 모니터링</h1>
        <p className="text-sm text-gray-600">실시간 대기 현황 및 검사실 상태 모니터링</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="text-sm font-semibold text-gray-600 mb-3 block">부서 선택</label>
        <div className="flex gap-2 flex-wrap">
          {departments.map((dept, idx) => (
            <button 
              key={idx}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedDept === dept 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedDept(dept);
                // '전체' 선택 시 'all'로 전달, 그 외에는 부서명 그대로 전달
                const deptParam = dept === '전체' ? 'all' : dept;
                fetchQueueData(deptParam);
              }}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold text-gray-900">실시간 대기시간 변화 추이</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">마지막 업데이트: <span className="font-medium">{lastUpdate}</span></span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          </div>
        </div>
        <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">실시간 차트 영역</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-lg font-semibold text-gray-900 mb-5">환자 단계별 트래킹</div>
        <div className="flex justify-between items-center max-w-4xl mx-auto relative">
          {['접수', '대기', '검사', '결과대기', '완료'].map((step, idx) => {
            const counts = [
              patientFlow.reception,
              patientFlow.waiting,
              patientFlow.examining,
              patientFlow.results,
              patientFlow.completed
            ];
            return (
              <div key={idx} className="flex flex-col items-center flex-1">
                {idx < 4 && (
                  <div className="absolute top-7 -translate-y-1/2 text-gray-300 text-2xl" 
                       style={{left: `${(idx + 0.5) * 20}%`, width: `20%`, textAlign: 'center'}}>
                    →
                  </div>
                )}
                <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white font-bold
                  ${idx === 0 ? 'bg-blue-600' : 
                    idx === 1 ? 'bg-yellow-500' : 
                    idx === 2 ? 'bg-green-500' : 
                    idx === 3 ? 'bg-red-500' : 'bg-purple-600'}`}>
                  <span className="text-sm leading-tight mt-1.3">
                    {counts[idx]}
                  </span>
                  <span className="text-[12px] font-normal -mt-1">명</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">{step}</div>
                <div className="text-xs text-gray-400">
                  {idx === 0 ? '평균 5분' : idx === 1 ? '평균 25분' : idx === 2 ? '평균 15분' : idx === 3 ? '평균 30분' : '오늘 누적'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRoomCards.map((room, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 aspect-square flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 block truncate leading-tight">{room.name}</span>
                {room.room && (
                  <span className="text-xs text-gray-500 mt-1 block">{room.floor} {room.room}</span>
                )}
              </div>
              <span className={`w-3 h-3 rounded-full animate-pulse flex-shrink-0 ml-2
                ${room.status === 'warning' ? 'bg-yellow-500' : 
                  room.status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs flex-1">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{room.waiting}</div>
                <div className="text-gray-600 text-xs">대기인원</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{room.waitTime === '-' ? '-' : `${room.waitTime}`}</div>
                <div className="text-gray-600 text-xs">{room.waitTime === '-' ? '정지' : '분'}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{room.processing}</div>
                <div className="text-gray-600 text-xs">진행중</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  room.equipment === '정상' ? 'text-green-600' : 'text-red-600'
                }`}>{room.equipment}</div>
                <div className="text-gray-600 text-xs">장비상태</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Analytics Component
const AnalyticsContent = ({ 
  selectedDepartments, 
  setSelectedDepartments,
  showDeptDropdown, 
  setShowDeptDropdown,
  showExportDropdown,
  setShowExportDropdown,
  exportData,
  dateRange,
  setDateRange,
  chartData
}) => {
  const [analyticsData, setAnalyticsData] = useState({
    patientFlow: null,
    waitingTime: null,
    congestion: null,
    nfcUsage: null
  });
  const [loading, setLoading] = useState(false);

  // Analytics 데이터 가져오기
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        departments: Array.from(selectedDepartments).join(',')
      };

      // 병렬로 여러 분석 데이터 가져오기
      const [patientFlow, waitingTime, congestion, nfcUsage] = await Promise.all([
        apiService.analytics.getPatientFlow(params).catch(err => {
          console.warn('Patient flow fetch failed:', err);
          return null;
        }),
        apiService.analytics.getWaitingTime(params).catch(err => {
          console.warn('Waiting time fetch failed:', err);
          return null;
        }),
        apiService.analytics.getCongestionHeatmap(params).catch(err => {
          console.warn('Congestion fetch failed:', err);
          return null;
        }),
        apiService.analytics.getNfcUsage(params).catch(err => {
          console.warn('NFC usage fetch failed:', err);
          return null;
        })
      ]);

      setAnalyticsData({
        patientFlow,
        waitingTime,
        congestion,
        nfcUsage
      });
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 데이터 내보내기 함수 업데이트
  const handleExportData = async (format) => {
    try {
      const params = {
        format,
        start_date: dateRange.start,
        end_date: dateRange.end,
        departments: Array.from(selectedDepartments).join(',')
      };

      const response = await apiService.analytics.exportData(params);
      
      // Blob 데이터로 파일 다운로드
      const blob = new Blob([response], { 
        type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('데이터 내보내기에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedDepartments]);

  const allDepartments = [
    '영상의학과', '진단검사의학과', '내과', '외과', '정형외과',
    '신경과', '응급의학과', '소아청소년과', '산부인과', '재활의학과'
  ];

  const toggleDepartment = (dept) => {
    const newSet = new Set(selectedDepartments);
    if (newSet.has(dept)) {
      newSet.delete(dept);
    } else {
      newSet.add(dept);
    }
    setSelectedDepartments(newSet);
  };

  return (
    <div className="p-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
          <div className="text-xl">로딩 중...</div>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">통계 및 분석</h1>
        <p className="text-sm text-gray-600">데이터 기반 인사이트 및 성과 분석</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex justify-between items-center gap-5">
        <div className="flex gap-5 items-center flex-1">
          <div className="flex gap-3 items-center">
            <input 
              type="date" 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
            <span className="text-gray-600">~</span>
            <input 
              type="date" 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-full text-xs font-medium bg-blue-600 text-white whitespace-nowrap">
              1주일
            </button>
            <button className="px-4 py-2 rounded-full text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              1개월
            </button>
            <button className="px-4 py-2 rounded-full text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              3개월
            </button>
            <button className="px-4 py-2 rounded-full text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              1년
            </button>
          </div>
          
          <div className="relative z-10">
            <button 
              className="px-4 py-2 bg-white rounded-lg text-sm flex items-center gap-2 min-w-[220px] hover:bg-gray-50 transition-colors"
              style={{
                border: showDeptDropdown ? '2px solid #3b82f6' : '1px solid #d1d5db'
              }}
              onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            >
              <span>🏥</span>
              <span className="flex-1 text-left">
                {selectedDepartments.size === 0 ? '부서 선택' : 
                 selectedDepartments.size === allDepartments.length ? '전체 부서' :
                 `${selectedDepartments.size}개 부서`}
              </span>
              <span className="text-gray-400">▼</span>
            </button>
            {showDeptDropdown && (
              <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[280px] max-h-80 overflow-y-auto z-10">
                {allDepartments.map(dept => (
                  <div 
                    key={dept}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDepartment(dept)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedDepartments.has(dept)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{dept}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="relative">
          <button 
            className={`px-5 py-2 bg-green-600 text-white rounded-md text-sm font-medium flex items-center gap-2
              hover:bg-green-700`}
            onClick={() => setShowExportDropdown(!showExportDropdown)}
          >
            <span>📊</span>
            <span>데이터 추출</span>
            <span className="text-xs">▼</span>
          </button>
          {showExportDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-10">
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-left"
                onClick={() => handleExportData('excel')}
              >
                <span className="w-5 h-5 bg-green-700 text-white rounded text-xs flex items-center justify-center font-bold">
                  XLS
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">Excel 파일</div>
                  <div className="text-xs text-gray-500">데이터 분석용 (.xlsx)</div>
                </div>
              </button>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-left"
                onClick={() => handleExportData('csv')}
              >
                <span className="w-5 h-5 bg-blue-600 text-white rounded text-xs flex items-center justify-center font-bold">
                  CSV
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">CSV 파일</div>
                  <div className="text-xs text-gray-500">범용 데이터 형식 (.csv)</div>
                </div>
              </button>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-left"
                onClick={() => handleExportData('pdf')}
              >
                <span className="w-5 h-5 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">
                  PDF
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">PDF 보고서</div>
                  <div className="text-xs text-gray-500">인쇄 및 공유용 (.pdf)</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽 열 - 시간대별 환자 흐름 + 시간대별 구역 밀집도 */}
        <div className="flex flex-col gap-6">
          {/* 시간대별 환자 흐름 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-4">
              <div className="text-lg font-semibold text-gray-900">시간대별 환자 흐름</div>
              <div className="text-xs text-gray-500 mt-1">평균 대기 환자 수</div>
            </div>
            {/* TODO: [API] 실제 차트 데이터 연결 */}
            <div className="h-64 relative">
              <svg width="100%" height="100%" viewBox="0 0 400 240">
                {/* Y축 그리드 라인 */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="#e5e7eb" strokeDasharray="2,2"/>
                <line x1="40" y1="60" x2="380" y2="60" stroke="#e5e7eb" strokeDasharray="2,2"/>
                <line x1="40" y1="100" x2="380" y2="100" stroke="#e5e7eb" strokeDasharray="2,2"/>
                <line x1="40" y1="140" x2="380" y2="140" stroke="#e5e7eb" strokeDasharray="2,2"/>
                <line x1="40" y1="180" x2="380" y2="180" stroke="#e5e7eb" strokeDasharray="2,2"/>
                
                {/* Y축 라벨 */}
                <text x="30" y="25" fontSize="10" fill="#9ca3af" textAnchor="end">60</text>
                <text x="30" y="65" fontSize="10" fill="#9ca3af" textAnchor="end">48</text>
                <text x="30" y="105" fontSize="10" fill="#9ca3af" textAnchor="end">36</text>
                <text x="30" y="145" fontSize="10" fill="#9ca3af" textAnchor="end">24</text>
                <text x="30" y="185" fontSize="10" fill="#9ca3af" textAnchor="end">12</text>
                <text x="30" y="220" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>
                
                {/* 라인 차트 */}
                <polyline
                  points="40,180 80,160 120,140 160,100 200,80 240,70 280,75 320,90 360,95 380,110"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <polyline
                  points="40,190 80,175 120,160 160,135 200,115 240,105 280,110 320,120 360,125 380,130"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <polyline
                  points="40,200 80,190 120,180 160,165 200,150 240,140 280,143 320,148 360,150 380,155"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                />
                
                {/* X축 라벨 */}
                <text x="40" y="235" fontSize="10" fill="#9ca3af">08</text>
                <text x="80" y="235" fontSize="10" fill="#9ca3af">09</text>
                <text x="120" y="235" fontSize="10" fill="#9ca3af">10</text>
                <text x="160" y="235" fontSize="10" fill="#9ca3af">11</text>
                <text x="200" y="235" fontSize="10" fill="#9ca3af">12</text>
                <text x="240" y="235" fontSize="10" fill="#9ca3af">13</text>
                <text x="280" y="235" fontSize="10" fill="#9ca3af">14</text>
                <text x="320" y="235" fontSize="10" fill="#9ca3af">15</text>
                <text x="360" y="235" fontSize="10" fill="#9ca3af">16</text>
                <text x="380" y="235" fontSize="10" fill="#9ca3af">17</text>
              </svg>
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-xs text-gray-600">영상의학과</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-500"></div>
                  <span className="text-xs text-gray-600">진단검사의학과</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-yellow-500"></div>
                  <span className="text-xs text-gray-600">내과</span>
                </div>
              </div>
            </div>
          </div>

          {/* 시간대별 구역 밀집도 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-4">
              <div className="text-lg font-semibold text-gray-900">시간대별 구역 밀집도</div>
              <div className="text-xs text-gray-500 mt-1">NFC 태그 기반 실시간 위치 분석</div>
            </div>
            <div className="flex items-end justify-around h-64 px-4">
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">45%</span>
                <div className="w-14 bg-blue-500 rounded-t" style={{height: '45%'}}></div>
                <span className="text-xs text-gray-600 mt-2">응급실</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">78%</span>
                <div className="w-14 bg-red-500 rounded-t" style={{height: '78%'}}></div>
                <span className="text-xs text-gray-600 mt-2">영상의학</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">62%</span>
                <div className="w-14 bg-yellow-500 rounded-t" style={{height: '62%'}}></div>
                <span className="text-xs text-gray-600 mt-2">외래</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">35%</span>
                <div className="w-14 bg-green-500 rounded-t" style={{height: '35%'}}></div>
                <span className="text-xs text-gray-600 mt-2">검사실</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">52%</span>
                <div className="w-14 bg-purple-500 rounded-t" style={{height: '52%'}}></div>
                <span className="text-xs text-gray-600 mt-2">약국</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold mb-2">68%</span>
                <div className="w-14 bg-pink-500 rounded-t" style={{height: '68%'}}></div>
                <span className="text-xs text-gray-600 mt-2">접수/수납</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 열 - 검사실 가동률 (세로로 길게) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
          <div className="mb-4">
            <div className="text-lg font-semibold text-gray-900">검사실 가동률</div>
            <div className="text-xs text-gray-500 mt-1">실시간 검사실별 상태 분석</div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center">
              <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="30"/>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#22c55e" strokeWidth="30"
                         strokeDasharray="301.6 201.1" strokeDashoffset="0" transform="rotate(-90 100 100)"/>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#eab308" strokeWidth="30"
                         strokeDasharray="100.5 402.1" strokeDashoffset="-301.6" transform="rotate(-90 100 100)"/>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#ef4444" strokeWidth="30"
                         strokeDasharray="100.5 402.1" strokeDashoffset="-402.1" transform="rotate(-90 100 100)"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">78%</div>
                  <div className="text-xs text-gray-500">전체 가동률</div>
                </div>
              </div>
            </div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">60%</div>
                <div className="text-xs text-gray-600">정상 가동</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">20%</div>
                <div className="text-xs text-gray-600">대기</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">20%</div>
                <div className="text-xs text-gray-600">점검/오류</div>
              </div>
            </div>
            
            {/* 검사실별 성능 순위 */}
            <div className="border-t pt-4 flex-1 flex flex-col">
              <div className="text-sm font-semibold text-gray-700 mb-3">검사실별 성능 순위</div>
              <div className="flex-1 overflow-y-auto max-h-80">
                <div className="space-y-3 pr-2">
                  {[
                    { rank: 1, name: 'MRI 검사실 A', percent: 92, color: 'green' },
                    { rank: 2, name: 'CT 검사실 B', percent: 88, color: 'green' },
                    { rank: 3, name: '초음파실 1', percent: 85, color: 'green' },
                    { rank: 4, name: 'X-ray 검사실 C', percent: 78, color: 'green' },
                    { rank: 5, name: '내시경실 2', percent: 72, color: 'yellow' },
                    { rank: 6, name: '심전도실 A', percent: 68, color: 'yellow' },
                    { rank: 7, name: 'MRI 검사실 B', percent: 55, color: 'yellow' },
                    { rank: 8, name: 'CT 검사실 A', percent: 45, color: 'red' }
                  ].map(room => (
                    <div key={room.rank} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${room.rank <= 3 ? 
                          room.rank === 1 ? 'bg-yellow-400 text-gray-800' : 
                          room.rank === 2 ? 'bg-gray-300 text-gray-800' : 
                          'bg-orange-400 text-white' : 
                          'bg-gray-500 text-white'}`}>
                        {room.rank}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{room.name}</span>
                      <span className={`text-sm font-semibold
                        ${room.color === 'green' ? 'text-green-600' : 
                          room.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                        정상 {room.percent}%
                      </span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${
                          room.color === 'green' ? 'bg-green-500' : 
                          room.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} style={{width: `${room.percent}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomeScreen;