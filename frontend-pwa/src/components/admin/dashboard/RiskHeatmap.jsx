import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingUp, Loader } from 'lucide-react';
import apiService from '../../../api/apiService';

const RiskHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const departments = ['영상의학과', '내과', '정형외과', '진단검사의학과', '응급실'];
  const timeSlots = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];  // Backend와 일치하는 형식

  const fetchHeatmapData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Heatmap API 호출 시작');

      const response = await apiService.analytics.getHeatmapPredictions();

      console.log('✅ Heatmap API 응답 받음:', response);
      console.log('응답 타입:', typeof response);
      console.log('응답 키:', response ? Object.keys(response) : 'null');
      console.log('response.success:', response?.success);
      console.log('response.data:', response?.data);
      console.log('data 타입:', Array.isArray(response?.data));

      // Backend 응답 구조 확인
      // Case 1: { success: true, data: [...] } - 배열 직접
      // Case 2: { success: true, data: { heatmap: [...] } } - 객체로 감싸짐
      const actualData = Array.isArray(response.data)
        ? response.data
        : response.data?.heatmap || response.data?.data || [];

      if (response && response.success && Array.isArray(actualData) && actualData.length > 0) {
        // API 데이터를 컴포넌트 형식에 맞게 변환
        console.log('📊 데이터 변환 시작, 배열 길이:', actualData.length);
        const formattedData = actualData.map(item => ({
          department: item.department,
          time: item.time,
          congestion: item.congestion,
          waitTime: item.wait_time,
          queueSize: item.queue_size,
          risk: item.risk
        }));

        console.log('✅ 변환 완료:', formattedData.length, '개 데이터');
        setHeatmapData(formattedData);
        setLastUpdate(new Date());
      } else {
        console.error('❌ 응답 형식 오류:', response);
        throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      }
    } catch (err) {
      console.error('❌ Heatmap 데이터 로드 실패:', err);
      console.error('에러 타입:', typeof err);
      console.error('에러 상세:', {
        message: err?.message || 'No message',
        response: err?.response?.data || 'No response data',
        status: err?.response?.status || 'No status',
        isAxiosError: err?.isAxiosError,
        fullError: err
      });

      if (err?.response) {
        console.error('전체 응답:', err.response);
      }

      setError(`히트맵 데이터 로드 실패: ${err?.message || 'Unknown error'}`);
      setHeatmapData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 초기 데이터 로드
    fetchHeatmapData();

    // 주기적 업데이트 (30초마다 실제 데이터 조회)
    const interval = setInterval(fetchHeatmapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCellColor = (congestion) => {
    if (congestion > 70) return 'bg-red-500';
    if (congestion > 50) return 'bg-orange-400';
    if (congestion > 30) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getCellTextColor = (congestion) => {
    if (congestion > 50) return 'text-white';
    return 'text-gray-700';
  };

  const getHeatmapValue = (dept, time) => {
    const cell = heatmapData.find(d => d.department === dept && d.time === time);
    return cell || { congestion: 0, waitTime: 0, queueSize: 0, risk: 'low' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">혼잡도 위험 히트맵</h2>
            <p className="text-sm text-gray-500">시간대별 부서별 혼잡 예측</p>
          </div>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-500">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error ? (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-2">데이터를 불러오는 중...</p>
        </div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          히트맵 데이터가 없습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-600 py-2 pr-2">부서</th>
                  {timeSlots.map(time => (
                    <th key={time} className="text-center text-xs font-medium text-gray-600 py-2 px-1 min-w-[60px]">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept}>
                    <td className="text-sm font-medium text-gray-700 py-2 pr-2 whitespace-nowrap">
                      {dept}
                    </td>
                    {timeSlots.map(time => {
                      const cellData = getHeatmapValue(dept, time);
                      return (
                        <td key={`${dept}-${time}`} className="p-1">
                          <div
                            className={`rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-105 ${getCellColor(cellData.congestion)} ${getCellTextColor(cellData.congestion)}`}
                            onClick={() => setSelectedCell(cellData)}
                          >
                            <div className="text-xs font-bold">{cellData.congestion}%</div>
                            <div className="text-[10px] opacity-90">{cellData.waitTime}분</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span className="text-xs text-gray-600">원활 (0-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span className="text-xs text-gray-600">보통 (31-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span className="text-xs text-gray-600">혼잡 (51-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-xs text-gray-600">매우혼잡 (71%+)</span>
            </div>
          </div>

          {selectedCell && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCell.department} - {selectedCell.time}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    혼잡도: {selectedCell.congestion}% |
                    대기시간: {selectedCell.waitTime}분 |
                    대기인원: {selectedCell.queueSize}명
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskHeatmap;