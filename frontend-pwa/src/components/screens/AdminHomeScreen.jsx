import React, { useState, useEffect, useRef } from 'react';

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

  // TODO: [API] 실제 데이터로 교체 필요
  const [stats, setStats] = useState({
    todayPatients: 0, // API: GET /api/admin/stats/today-patients
    avgTreatmentTime: 0, // API: GET /api/admin/stats/avg-treatment-time
    systemStatus: '', // API: GET /api/admin/system/status
    utilization: 0 // API: GET /api/admin/stats/utilization
  });

  const [nfcTags, setNfcTags] = useState([]); // API: GET /api/admin/nfc-tags
  const [queueData, setQueueData] = useState([]); // API: GET /api/admin/queue/realtime
  const [chartData, setChartData] = useState({}); // API: GET /api/admin/analytics/charts

  // Navigation tabs configuration
  const navItems = [
    { id: 'dashboard', icon: '📊', label: '대시보드' },
    { id: 'nfc', icon: '📱', label: 'NFC 태그 관리' },
    { id: 'queue', icon: '👥', label: '대기열 모니터링' },
    { id: 'analytics', icon: '📈', label: '통계 및 분석' }
  ];

  useEffect(() => {
    // TODO: [API] 초기 데이터 로드
    // fetchDashboardData();
    // fetchNFCTags();
    // fetchQueueData();
  }, []);

  // TODO: [API] 대시보드 데이터 가져오기
  const fetchDashboardData = async () => {
    // const response = await fetch('/api/admin/dashboard');
    // const data = await response.json();
    // setStats(data);
  };

  // TODO: [API] NFC 태그 목록 가져오기
  const fetchNFCTags = async () => {
    // const response = await fetch('/api/admin/nfc-tags');
    // const data = await response.json();
    // setNfcTags(data);
  };

  // TODO: [API] 실시간 대기열 데이터 가져오기
  const fetchQueueData = async () => {
    // const response = await fetch('/api/admin/queue/realtime');
    // const data = await response.json();
    // setQueueData(data);
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
        return <DashboardContent stats={stats} />;
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
const DashboardContent = ({ stats }) => {
  return (
    <div className="p-8">
      {/* Stats Cards - 반응형 그리드 */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex-1 min-w-[250px] bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {/* TODO: [API] 실제 데이터 연결 */}
                {stats.todayPatients || '246'}명
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
                {/* TODO: [API] 실제 데이터 연결 */}
                {stats.avgTreatmentTime || '18'}분
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
                {/* TODO: [API] 실제 데이터 연결 */}
                {stats.systemStatus || '정상'}
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
                {/* TODO: [API] 실제 데이터 연결 */}
                {stats.utilization || '78'}%
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
            <div className="text-lg font-semibold text-gray-900">검사별 평균 대기 시간</div>
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
          {/* TODO: [API] 실제 차트 데이터 연결 */}
          <div className="h-80 bg-gray-50 rounded-lg flex items-end justify-around p-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">35분</span>
              <div className="w-12 bg-blue-500 rounded-t" style={{height: '70%'}}></div>
              <span className="text-xs text-gray-600 mt-2">혈액검사</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">14분</span>
              <div className="w-12 bg-blue-500 rounded-t" style={{height: '35%'}}></div>
              <span className="text-xs text-gray-600 mt-2">X-Ray</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">42분</span>
              <div className="w-12 bg-red-500 rounded-t" style={{height: '85%'}}></div>
              <span className="text-xs text-gray-600 mt-2">MRI</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">25분</span>
              <div className="w-12 bg-blue-500 rounded-t" style={{height: '50%'}}></div>
              <span className="text-xs text-gray-600 mt-2">CT</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">28분</span>
              <div className="w-12 bg-blue-500 rounded-t" style={{height: '56%'}}></div>
              <span className="text-xs text-gray-600 mt-2">심전도</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold mb-2">43분</span>
              <div className="w-12 bg-red-500 rounded-t" style={{height: '86%'}}></div>
              <span className="text-xs text-gray-600 mt-2">초음파</span>
            </div>
          </div>
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
const NFCManagementContent = ({ tags }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showScanFilter, setShowScanFilter] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedScan, setSelectedScan] = useState('');
  
  // TODO: [API] 실제 NFC 태그 데이터 사용
  const mockTags = [
    { id: 'nfc-internal-medicine-001', code: '44aecdeabf123456789012345', location: '본관 4층 401호', status: 'active', lastScan: '없음' },
    { id: 'nfc-ultrasound-001', code: '9d6d7d1eac234567890abcdef', location: '본관 3층 305호', status: 'active', lastScan: '없음' },
    { id: 'nfc-blood-test-001', code: '89e8ea59cd345678901234567', location: '본관 1층 105호', status: 'active', lastScan: '없음' },
    { id: 'nfc-xray-001', code: '8021a413de456789012345678', location: '본관 2층 201호', status: 'active', lastScan: '2025. 8. 18. 오후 7:38:27' },
  ];

  const displayTags = tags.length > 0 ? tags : mockTags;
  
  const locations = ['전체', '본관', '응급실', '외래', '검사실', '약국', '수납'];
  const statuses = ['전체', '활성', '비활성'];

  return (
    <div className="p-8">
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
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
          초기화
        </button>
        <button className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
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
                    {locations.map(loc => (
                      <div 
                        key={loc}
                        className={`px-3 py-2 text-sm font-normal hover:bg-gray-100 cursor-pointer normal-case ${selectedLocation === loc ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation(loc);
                          setShowLocationFilter(false);
                        }}
                      >
                        {loc}
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
                      }}
                    >
                      오래된순
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
                  <select className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    tag.status === 'active' 
                      ? 'bg-green-100 text-green-700 border-green-300' 
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
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
            총 {displayTags.length}개 중 1-{displayTags.length} 표시
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50" disabled>
              이전
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
              1
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600">
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

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastUpdate(
        now.getHours().toString().padStart(2, '0') + ':' + 
        now.getMinutes().toString().padStart(2, '0') + ':' + 
        now.getSeconds().toString().padStart(2, '0')
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const departments = ['전체', '영상의학과', '진단검사의학과', '순환기내과', '소화기내과', '정형외과'];
  
  // TODO: [API] 실제 대기열 데이터 사용
  const mockRoomCards = [
    { dept: 'radiology', name: 'MRI', status: 'warning', waiting: 12, waitTime: 45, processing: 1, equipment: '정상' },
    { dept: 'radiology', name: 'CT', status: 'normal', waiting: 5, waitTime: 20, processing: 1, equipment: '정상' },
    { dept: 'radiology', name: 'X-Ray', status: 'normal', waiting: 3, waitTime: 10, processing: 2, equipment: '정상' },
    { dept: 'radiology', name: '초음파', status: 'normal', waiting: 8, waitTime: 35, processing: 1, equipment: '정상' },
    { dept: 'laboratory', name: '혈액검사', status: 'normal', waiting: 15, waitTime: 25, processing: 3, equipment: '정상' },
    { dept: 'laboratory', name: '소변검사', status: 'normal', waiting: 7, waitTime: 15, processing: 2, equipment: '정상' },
    { dept: 'cardiology', name: '심전도', status: 'error', waiting: 0, waitTime: '-', processing: 0, equipment: '점검중' },
    { dept: 'cardiology', name: '심장초음파', status: 'normal', waiting: 6, waitTime: 40, processing: 1, equipment: '정상' },
    { dept: 'gastro', name: '위내시경', status: 'warning', waiting: 10, waitTime: 60, processing: 1, equipment: '정상' },
    { dept: 'gastro', name: '대장내시경', status: 'normal', waiting: 8, waitTime: 75, processing: 1, equipment: '정상' },
    { dept: 'orthopedics', name: '골밀도검사', status: 'normal', waiting: 4, waitTime: 20, processing: 1, equipment: '정상' },
    { dept: 'orthopedics', name: 'MRI(정형)', status: 'normal', waiting: 9, waitTime: 50, processing: 1, equipment: '정상' }
  ];

  const roomCards = queueData.length > 0 ? queueData : mockRoomCards;

  return (
    <div className="p-8">
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
              onClick={() => setSelectedDept(dept)}
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
        {/* TODO: [API] 실시간 차트 데이터 연결 */}
        <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">실시간 차트 영역</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-lg font-semibold text-gray-900 mb-5">환자 단계별 트래킹</div>
        <div className="flex justify-between items-center max-w-4xl mx-auto relative">
          {['접수', '대기', '검사', '결과대기', '완료'].map((step, idx) => (
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
                  {idx === 0 ? '12' : idx === 1 ? '45' : idx === 2 ? '8' : idx === 3 ? '23' : '89'}
                </span>
                <span className="text-[12px] font-normal -mt-1">명</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">{step}</div>
              <div className="text-xs text-gray-400">
                {idx === 0 ? '평균 5분' : idx === 1 ? '평균 25분' : idx === 2 ? '평균 15분' : idx === 3 ? '평균 30분' : '오늘 누적'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {roomCards.map((room, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-900">{room.name}</span>
              <span className={`w-2 h-2 rounded-full animate-pulse
                ${room.status === 'warning' ? 'bg-yellow-500' : 
                  room.status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-lg font-semibold text-gray-900">{room.waiting}명</div>
                <div className="text-gray-600">대기 인원</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{room.waitTime === '-' ? '-' : `${room.waitTime}분`}</div>
                <div className="text-gray-600">예상 대기</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{room.processing}명</div>
                <div className="text-gray-600">처리 중</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{room.equipment}</div>
                <div className="text-gray-600">장비 상태</div>
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
    <div className="p-8">
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
                onClick={() => exportData('excel')}
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
                onClick={() => exportData('csv')}
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
                onClick={() => exportData('pdf')}
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