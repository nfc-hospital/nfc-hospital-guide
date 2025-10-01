import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import apiService from '../../../api/apiService';

const WeeklyCongestionCalendar = () => {
  const [calendarData, setCalendarData] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const days = ['월', '화', '수', '목', '금', '토'];
  const timeSlots = [
    '9:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];  // Backend와 일치하는 형식 (선행 0 제거)

  const departments = [
    { id: 'all', name: '전체', color: 'blue' },
    { id: '영상의학과', name: '영상의학과', color: 'green' },
    { id: '진단검사의학과', name: '진단검사의학과', color: 'yellow' },
    { id: '내과', name: '내과', color: 'indigo' },
    { id: '정형외과', name: '정형외과', color: 'orange' },
    { id: '응급실', name: '응급실', color: 'red' }
  ];

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Calendar Heatmap API 호출 시작');

      // 히트맵 데이터를 가져와서 주별 캘린더 데이터로 변환
      const response = await apiService.analytics.getHeatmapPredictions();

      console.log('✅ Calendar Heatmap API 응답:', response);
      console.log('응답 타입:', typeof response);
      console.log('response.success:', response?.success);
      console.log('response.data:', response?.data);
      console.log('response.data 타입:', typeof response?.data);
      console.log('response.data keys:', response?.data ? Object.keys(response.data) : 'null');
      console.log('Array.isArray(response.data):', Array.isArray(response?.data));
      console.log('response.data?.length:', response?.data?.length);

      // Backend 응답 구조 확인
      // Case 1: { success: true, data: [...] } - 배열 직접
      // Case 2: { success: true, data: { heatmap: [...] } } - 객체로 감싸짐
      const actualData = Array.isArray(response.data)
        ? response.data
        : (response.data?.heatmap || response.data?.data || []);

      console.log('📊 actualData 추출:', actualData);
      console.log('📊 actualData 타입:', typeof actualData);
      console.log('📊 Array.isArray(actualData):', Array.isArray(actualData));
      console.log('📊 actualData?.length:', actualData?.length);
      console.log('📊 actualData 첫 항목:', actualData?.[0]);

      if (response?.success && Array.isArray(actualData) && actualData.length > 0) {
        console.log('✅ 조건 통과! 데이터 처리 시작');
        const data = [];

        // 현재 주의 날짜 계산
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        // API 데이터를 캘린더 형식으로 변환
        days.forEach((day, dayIdx) => {
          timeSlots.forEach((time) => {
            // 선택된 부서의 데이터만 필터링
            const relevantData = actualData.filter(item => {
              const timeMatch = item.time === time;
              const deptMatch = selectedDepartment === 'all' ||
                               item.department === selectedDepartment;
              return timeMatch && deptMatch;
            });

            // 평균값 계산
            let avgCongestion = 0;
            let avgWaitTime = 0;
            let avgQueueSize = 0;

            if (relevantData.length > 0) {
              avgCongestion = Math.round(
                relevantData.reduce((sum, item) => sum + item.congestion, 0) / relevantData.length
              );
              avgWaitTime = Math.round(
                relevantData.reduce((sum, item) => sum + item.wait_time, 0) / relevantData.length
              );
              avgQueueSize = Math.round(
                relevantData.reduce((sum, item) => sum + item.queue_size, 0) / relevantData.length
              );
            }

            // 요일별 가중치 적용 (월요일은 더 붐빔, 토요일은 덜 붐빔)
            let dayModifier = 1;
            if (dayIdx === 0) dayModifier = 1.2; // 월요일
            if (dayIdx === 5) dayModifier = 0.6; // 토요일

            const adjustedCongestion = Math.round(avgCongestion * dayModifier);
            const adjustedWaitTime = Math.round(avgWaitTime * dayModifier);
            const adjustedQueueSize = Math.round(avgQueueSize * dayModifier);

            data.push({
              day: day,
              dayIndex: dayIdx,
              time: time,
              bookings: adjustedQueueSize,
              waitTime: adjustedWaitTime,
              congestion: Math.min(100, adjustedCongestion),
              risk: adjustedCongestion > 80 ? 'high' : adjustedCongestion > 60 ? 'medium' : 'low',
              department: selectedDepartment,
              date: new Date(startOfWeek.getTime() + dayIdx * 24 * 60 * 60 * 1000)
            });
          });
        });

        console.log(`✅ 캘린더 데이터 생성 완료: ${data.length}개 슬롯`);
        setCalendarData(data);
        setLastUpdate(new Date());
      } else {
        console.error('❌ 조건 실패:', {
          hasResponse: !!response,
          success: response?.success,
          isArray: Array.isArray(actualData),
          length: actualData?.length,
          actualData: actualData
        });
        throw new Error(`Invalid response format. actualData length: ${actualData?.length}, type: ${typeof actualData}`);
      }
    } catch (err) {
      console.error('❌ Calendar 데이터 로드 실패:', err);
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

      setError(`캘린더 데이터 로드 실패: ${err?.message || 'Unknown error'}`);
      setCalendarData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDepartment, currentWeek]);

  useEffect(() => {
    // 주기적 업데이트 (30초마다)
    const interval = setInterval(fetchCalendarData, 30000);
    return () => clearInterval(interval);
  }, [selectedDepartment]);

  const getCellColor = (congestion) => {
    if (congestion > 80) return 'bg-red-500 text-white';
    if (congestion > 60) return 'bg-orange-400 text-white';
    if (congestion > 40) return 'bg-yellow-400 text-gray-700';
    if (congestion > 20) return 'bg-green-400 text-gray-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getSlotData = (day, time) => {
    return calendarData.find(d => d.day === day && d.time === time) ||
           { bookings: 0, waitTime: 0, congestion: 0 };
  };

  const getWeekDateRange = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (currentWeek * 7));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 - ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
  };

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    setSelectedSlot(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">주간 혼잡도 캘린더</h2>
            <p className="text-sm text-gray-500">부서별 주간 예약 및 혼잡도 예측</p>
          </div>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-500">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 부서 선택 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {departments.map(dept => (
          <button
            key={dept.id}
            onClick={() => handleDepartmentChange(dept.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
              ${selectedDepartment === dept.id
                ? `bg-${dept.color}-100 text-${dept.color}-700 border-2 border-${dept.color}-300`
                : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100'}`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentWeek(currentWeek - 1)}
          disabled={currentWeek <= -2}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {getWeekDateRange()}
        </span>
        <button
          onClick={() => setCurrentWeek(currentWeek + 1)}
          disabled={currentWeek >= 2}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 캘린더 그리드 */}
      {error ? (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-2">데이터를 불러오는 중...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-600 py-2 pr-2 sticky left-0 bg-white">
                    시간
                  </th>
                  {days.map(day => (
                    <th key={day} className="text-center text-xs font-medium text-gray-600 py-2 px-1 min-w-[80px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(time => (
                  <tr key={time}>
                    <td className="text-xs font-medium text-gray-700 py-1 pr-2 sticky left-0 bg-white">
                      {time}
                    </td>
                    {days.map(day => {
                      const slotData = getSlotData(day, time);
                      return (
                        <td key={`${day}-${time}`} className="p-1">
                          <div
                            className={`rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-105 ${getCellColor(slotData.congestion)}`}
                            onClick={() => setSelectedSlot(slotData)}
                          >
                            <div className="text-xs font-bold">{slotData.bookings}건</div>
                            <div className="text-[10px] opacity-90">{slotData.waitTime}분</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 범례 */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <span className="text-gray-600">여유 (0-20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span className="text-gray-600">원활 (21-40%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span className="text-gray-600">보통 (41-60%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-400 rounded"></div>
              <span className="text-gray-600">혼잡 (61-80%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">매우혼잡 (81%+)</span>
            </div>
          </div>

          {/* 상세 정보 */}
          {selectedSlot && (
            <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedSlot.day}요일 {selectedSlot.time} - {selectedDepartment === 'all' ? '전체 부서' : selectedDepartment}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">예약 건수</p>
                      <p className="text-lg font-bold text-gray-900">{selectedSlot.bookings}건</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">예상 대기시간</p>
                      <p className="text-lg font-bold text-orange-600">{selectedSlot.waitTime}분</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">혼잡도</p>
                      <p className="text-lg font-bold text-red-600">{selectedSlot.congestion}%</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600">
                      💡 추천: {selectedSlot.congestion > 60 ? '이 시간대는 혼잡이 예상됩니다. 가능하면 다른 시간대 예약을 권장합니다.' :
                               selectedSlot.congestion > 40 ? '적당한 혼잡도가 예상됩니다. 여유를 두고 방문하세요.' :
                               '원활한 진료가 가능한 시간대입니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeeklyCongestionCalendar;