import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState({
    patientFlow: null,
    waitingTime: null,
    nfcUsage: null,
    bottlenecks: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const [patientFlow, waitingTime, nfcUsage, bottlenecks] = await Promise.all([
        adminAPI.analytics.getPatientFlow(params).catch(() => ({ success: false })),
        adminAPI.analytics.getWaitingTimeStats(params).catch(() => ({ success: false })),
        adminAPI.analytics.getNFCUsage(params).catch(() => ({ success: false })),
        adminAPI.analytics.getBottlenecks().catch(() => ({ success: false }))
      ]);

      setAnalyticsData({
        patientFlow: patientFlow.success ? patientFlow.data : null,
        waitingTime: waitingTime.success ? waitingTime.data : null,
        nfcUsage: nfcUsage.success ? nfcUsage.data : null,
        bottlenecks: bottlenecks.success ? bottlenecks.data : null
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Analytics data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (type, format) => {
    try {
      const response = await adminAPI.analytics.exportData({
        type: format, // csv, excel, pdf
        dataType: type, // queue, nfc, analytics
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      // 파일 다운로드 처리
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('내보내기 중 오류가 발생했습니다: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">통계 및 분석</h1>
          <p className="text-gray-600 mt-1">환자 동선, 대기시간, 시스템 사용률 분석</p>
        </div>
        
        {/* 날짜 선택 및 내보내기 */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ExportDropdown onExport={handleExportData} />
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '개요', icon: '📊' },
            { id: 'patient-flow', name: '환자 동선', icon: '🚶' },
            { id: 'waiting-time', name: '대기시간', icon: '⏱️' },
            { id: 'nfc-usage', name: 'NFC 사용률', icon: '🏷️' },
            { id: 'bottlenecks', name: '병목 구간', icon: '⚠️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 내용 */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab data={analyticsData} />}
        {activeTab === 'patient-flow' && <PatientFlowTab data={analyticsData.patientFlow} />}
        {activeTab === 'waiting-time' && <WaitingTimeTab data={analyticsData.waitingTime} />}
        {activeTab === 'nfc-usage' && <NFCUsageTab data={analyticsData.nfcUsage} />}
        {activeTab === 'bottlenecks' && <BottlenecksTab data={analyticsData.bottlenecks} />}
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

// 개요 탭
const OverviewTab = ({ data }) => {
  const waitingStats = data.waitingTime?.summary || {};
  const nfcStats = data.nfcUsage?.summary || {};
  const bottleneckCount = data.bottlenecks?.summary?.totalBottlenecks || 0;

  return (
    <div className="space-y-6">
      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="총 환자 수"
          value={waitingStats.total_patients || 0}
          color="blue"
          icon="👥"
        />
        <MetricCard
          title="평균 대기시간"
          value={`${Math.round(waitingStats.avg_wait_time || 0)}분`}
          color="orange"
          icon="⏱️"
        />
        <MetricCard
          title="NFC 스캔 수"
          value={nfcStats.totalScans || 0}
          color="green"
          icon="📱"
        />
        <MetricCard
          title="병목 구간"
          value={bottleneckCount}
          color="red"
          icon="⚠️"
        />
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 대기시간 분포 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">대기시간 분포</h3>
          <WaitTimeDistributionChart data={data.waitingTime?.distribution} />
        </div>

        {/* 인기 위치 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 위치 TOP 5</h3>
          <PopularLocationsList data={data.patientFlow?.popularLocations} />
        </div>
      </div>
    </div>
  );
};

// 환자 동선 탭
const PatientFlowTab = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8 text-gray-500">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 인기 위치 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            인기 위치 ({data.summary?.totalScans || 0}회 스캔)
          </h3>
          <div className="space-y-3">
            {data.popularLocations?.slice(0, 10).map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-800">{location.tag__location}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{location.visit_count}회</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(location.visit_count / data.popularLocations[0]?.visit_count) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 시간대별 트래픽 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시간대별 트래픽</h3>
          <HourlyTrafficChart data={data.hourlyTraffic} />
        </div>
      </div>

      {/* 병목 구간 */}
      {data.bottlenecks?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">병목 구간</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-800">{bottleneck.location}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    bottleneck.congestionLevel === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {bottleneck.congestionLevel}
                  </span>
                </div>
                <p className="text-sm text-red-600">
                  사용자당 평균 {bottleneck.avgScansPerUser}회 스캔
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 대기시간 탭
const WaitingTimeTab = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8 text-gray-500">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 기본 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="평균 대기시간"
          value={`${Math.round(data.summary?.avg_wait_time || 0)}분`}
          color="blue"
        />
        <MetricCard
          title="최대 대기시간"
          value={`${Math.round(data.summary?.max_wait_time || 0)}분`}
          color="red"
        />
        <MetricCard
          title="예측 정확도"
          value={`${Math.round(data.waitTimeComparison?.avgAccuracy || 0)}%`}
          color="green"
        />
      </div>

      {/* 차트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시간대별 트렌드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시간대별 대기시간 트렌드</h3>
          <WaitTimeTrendChart data={data.trends} />
        </div>

        {/* 우선순위별 통계 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">우선순위별 대기시간</h3>
          <PriorityStatsChart data={data.priorityBreakdown} />
        </div>
      </div>
    </div>
  );
};

// NFC 사용률 탭
const NFCUsageTab = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8 text-gray-500">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 기본 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="전체 태그"
          value={data.summary?.totalTags || 0}
          color="blue"
        />
        <MetricCard
          title="활성 태그"
          value={data.summary?.activeTags || 0}
          color="green"
        />
        <MetricCard
          title="총 스캔 수"
          value={data.summary?.totalScans || 0}
          color="purple"
        />
        <MetricCard
          title="태그당 평균 스캔"
          value={Math.round(data.summary?.averageScansPerTag || 0)}
          color="orange"
        />
      </div>

      {/* TOP 10 태그 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">가장 많이 사용된 태그 TOP 10</h3>
        <div className="space-y-3">
          {data.tagUsage?.top10?.map((tag, index) => (
            <div key={tag.tagId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <div>
                  <div className="font-medium text-gray-900">{tag.code}</div>
                  <div className="text-sm text-gray-600">{tag.location}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{tag.totalScans}회</div>
                <div className="text-sm text-gray-600">일평균 {tag.dailyAverage}회</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 미사용 태그 */}
      {data.unusedTags?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            미사용 태그 ({data.unusedTags.length}개)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.unusedTags.map((tag) => (
              <div key={tag.tagId} className="p-3 bg-white rounded border">
                <div className="font-medium text-gray-900">{tag.code}</div>
                <div className="text-sm text-gray-600">{tag.location}</div>
                <div className="text-xs text-yellow-700 mt-1">
                  마지막 스캔: {tag.lastScanTime ? new Date(tag.lastScanTime).toLocaleDateString() : '없음'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 병목 구간 탭
const BottlenecksTab = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8 text-gray-500">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="총 병목 구간"
          value={data.summary?.totalBottlenecks || 0}
          color="red"
        />
        <MetricCard
          title="높은 심각도"
          value={data.summary?.highSeverity || 0}
          color="red"
        />
        <MetricCard
          title="중간 심각도"
          value={data.summary?.mediumSeverity || 0}
          color="yellow"
        />
      </div>

      {/* 병목 구간별 분석 */}
      <div className="space-y-6">
        {/* 대기시간 병목 */}
        {data.waitTimeBottlenecks?.length > 0 && (
          <BottleneckSection
            title="대기시간 병목 구간"
            icon="⏱️"
            data={data.waitTimeBottlenecks}
            type="waitTime"
          />
        )}

        {/* 동선 병목 */}
        {data.navigationBottlenecks?.length > 0 && (
          <BottleneckSection
            title="동선 병목 구간"
            icon="🚶"
            data={data.navigationBottlenecks}
            type="navigation"
          />
        )}

        {/* 시간대별 병목 */}
        {data.hourlyBottlenecks?.length > 0 && (
          <BottleneckSection
            title="시간대별 병목"
            icon="🕐"
            data={data.hourlyBottlenecks}
            type="hourly"
          />
        )}
      </div>

      {/* 개선 제안 */}
      {data.recommendations?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <span className="mr-2">💡</span>
            개선 제안
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-white rounded border">
                <div className="font-medium text-blue-900">{rec.area}</div>
                <div className="text-sm text-blue-700 mt-1">{rec.issue}</div>
                <div className="text-sm text-blue-600 mt-2 pl-4 border-l-2 border-blue-300">
                  💡 {rec.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 공통 컴포넌트들
const MetricCard = ({ title, value, color, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        {icon && (
          <div className={`p-3 rounded-full bg-${color}-50 mr-4`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold text-${color}-600`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

const BottleneckSection = ({ title, icon, data, type }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">{icon}</span>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div key={index} className={`p-4 rounded-lg border ${
            item.severity === 'high' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                {item.examName || item.location || `${item.hour}시`}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                item.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {item.severity}
              </span>
            </div>
            {type === 'waitTime' && (
              <p className="text-sm text-gray-600">평균 대기: {item.avgWaitTime}분</p>
            )}
            {type === 'navigation' && (
              <p className="text-sm text-gray-600">평균 스캔: {item.avgScansPerUser}회</p>
            )}
            {type === 'hourly' && (
              <p className="text-sm text-gray-600">환자 수: {item.patientCount}명</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 차트 컴포넌트들 (간단한 형태)
const WaitTimeDistributionChart = ({ data }) => {
  if (!data) return <div className="text-gray-500">데이터 없음</div>;
  
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([range, count]) => (
        <div key={range} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{range}</span>
          <span className="font-medium">{count}명</span>
        </div>
      ))}
    </div>
  );
};

const PopularLocationsList = ({ data }) => {
  if (!data) return <div className="text-gray-500">데이터 없음</div>;
  
  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((location, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-800">{location.tag__location}</span>
          <span className="font-medium">{location.visit_count}회</span>
        </div>
      ))}
    </div>
  );
};

const HourlyTrafficChart = ({ data }) => {
  if (!data) return <div className="text-gray-500">데이터 없음</div>;
  
  const maxCount = Math.max(...data.map(d => d.scan_count));
  
  return (
    <div className="space-y-2">
      {data.map((hour) => (
        <div key={hour.hour} className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 w-8">{hour.hour}시</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(hour.scan_count / maxCount) * 100}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium w-12">{hour.scan_count}</span>
        </div>
      ))}
    </div>
  );
};

const WaitTimeTrendChart = ({ data }) => {
  if (!data) return <div className="text-gray-500">데이터 없음</div>;
  
  return (
    <div className="space-y-2">
      {data.map((trend, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{trend.period}</span>
          <span className="font-medium">{Math.round(trend.avg_wait || 0)}분</span>
        </div>
      ))}
    </div>
  );
};

const PriorityStatsChart = ({ data }) => {
  if (!data) return <div className="text-gray-500">데이터 없음</div>;
  
  return (
    <div className="space-y-3">
      {data.map((priority) => (
        <div key={priority.priority} className="p-3 border rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{priority.priority}</span>
            <span className="text-sm text-gray-600">{priority.count}명</span>
          </div>
          <div className="text-sm text-gray-600">
            평균 대기: {Math.round(priority.avg_wait || 0)}분
          </div>
        </div>
      ))}
    </div>
  );
};

// 내보내기 드롭다운
const ExportDropdown = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
      >
        <span>📊</span>
        <span>내보내기</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => { onExport('analytics', 'csv'); setIsOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              CSV로 내보내기
            </button>
            <button
              onClick={() => { onExport('analytics', 'excel'); setIsOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Excel로 내보내기
            </button>
            <button
              onClick={() => { onExport('analytics', 'pdf'); setIsOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              PDF로 내보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;