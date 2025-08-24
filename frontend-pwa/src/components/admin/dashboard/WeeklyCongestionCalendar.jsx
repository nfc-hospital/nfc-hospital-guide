import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const WeeklyCongestionCalendar = () => {
  const [calendarData, setCalendarData] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const days = ['월', '화', '수', '목', '금', '토'];
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const departments = [
    { id: 'all', name: '전체', color: 'blue' },
    { id: 'radiology', name: '영상의학과', color: 'green' },
    { id: 'lab', name: '진단검사의학과', color: 'yellow' },
    { id: 'cardiology', name: '순환기내과', color: 'red' },
    { id: 'gastro', name: '소화기내과', color: 'purple' },
    { id: 'internal', name: '내과', color: 'indigo' },
    { id: 'orthopedics', name: '정형외과', color: 'orange' }
  ];

  useEffect(() => {
    const generateCalendarData = () => {
      const data = [];
      const baseDate = new Date('2025-08-25'); // 월요일 기준
      
      // 부서별 기본 패턴 설정
      const deptPatterns = {
        all: { base: 15, peakHour: 14, lunchFactor: 1.3 },
        radiology: { base: 12, peakHour: 10, lunchFactor: 1.1 },
        lab: { base: 20, peakHour: 9, lunchFactor: 1.0 },
        cardiology: { base: 10, peakHour: 11, lunchFactor: 1.2 },
        gastro: { base: 14, peakHour: 13, lunchFactor: 1.4 },
        internal: { base: 18, peakHour: 14, lunchFactor: 1.3 },
        orthopedics: { base: 16, peakHour: 15, lunchFactor: 1.2 }
      };

      const pattern = deptPatterns[selectedDepartment] || deptPatterns.all;
      
      days.forEach((day, dayIdx) => {
        timeSlots.forEach((time, timeIdx) => {
          const hour = parseInt(time.split(':')[0]);
          const minute = parseInt(time.split(':')[1]);
          
          // 요일별 패턴
          let dayModifier = 1;
          if (dayIdx === 5) dayModifier = 0.6; // 토요일은 덜 혼잡
          if (dayIdx === 0) dayModifier = 1.2; // 월요일은 더 혼잡
          
          // 부서별 피크 시간 계산
          const peakDistance = Math.abs(hour - pattern.peakHour);
          const timeFactor = Math.max(0.5, 1 - peakDistance * 0.15);
          
          // 점심시간 효과
          const lunchEffect = (hour === 12 || hour === 13) ? pattern.lunchFactor : 1;
          
          // 예약 수량 시뮬레이션
          const bookings = Math.floor(
            pattern.base * dayModifier * timeFactor * lunchEffect + 
            Math.random() * 5
          );
          
          // 예상 대기시간
          const waitTime = Math.round(bookings * 2.5 + Math.random() * 5);
          
          // 혼잡도 계산
          const congestion = Math.min(100, Math.round(bookings / 20 * 100));
          
          data.push({
            day: day,
            dayIndex: dayIdx,
            time: time,
            bookings: bookings,
            waitTime: waitTime,
            congestion: congestion,
            risk: congestion > 80 ? 'high' : congestion > 60 ? 'medium' : 'low',
            available: dayIdx !== 5 || hour < 13 // 토요일 오후는 휴진
          });
        });
      });

      setCalendarData(data);
    };

    generateCalendarData();
    const interval = setInterval(generateCalendarData, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, [currentWeek, selectedDepartment]);

  const getCellColor = (congestion, available) => {
    if (!available) return 'bg-gray-200';
    if (congestion > 80) return 'bg-red-400';
    if (congestion > 60) return 'bg-orange-300';
    if (congestion > 40) return 'bg-yellow-300';
    return 'bg-green-300';
  };

  const getWeekDates = () => {
    const baseDate = new Date('2025-08-25');
    baseDate.setDate(baseDate.getDate() + currentWeek * 7);
    
    return days.map((day, idx) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + idx);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  };

  const weekDates = getWeekDates();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">주간 혼잡 캘린더</h2>
            <p className="text-sm text-gray-500">예약 기반 LSTM 혼잡도 예측</p>
          </div>
        </div>
        
        {/* 주간 네비게이션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
            {currentWeek === 0 ? '이번 주' : currentWeek === 1 ? '다음 주' : `${currentWeek}주 후`}
          </span>
          <button
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 부서 선택 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {departments.map(dept => (
          <button
            key={dept.id}
            onClick={() => setSelectedDepartment(dept.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              selectedDepartment === dept.id
                ? `bg-${dept.color}-600 text-white shadow-lg`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={selectedDepartment === dept.id ? {
              backgroundColor: dept.color === 'blue' ? '#2563eb' :
                             dept.color === 'green' ? '#16a34a' :
                             dept.color === 'yellow' ? '#ca8a04' :
                             dept.color === 'red' ? '#dc2626' :
                             dept.color === 'purple' ? '#9333ea' :
                             dept.color === 'indigo' ? '#4f46e5' :
                             '#ea580c'
            } : {}}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* 캘린더 그리드 - 개선된 디자인 */}
      <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left">
                  <span className="text-xs font-semibold text-gray-600">시간</span>
                </th>
                {days.map((day, idx) => (
                  <th key={day} className="px-2 py-2 text-center bg-white">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{day}요일</p>
                      <p className="text-xs text-gray-500">{weekDates[idx]}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="border-t border-gray-100">
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-gray-200">
                    <span className="text-sm font-medium text-gray-700">{time}</span>
                  </td>
                  {days.map((day, dayIdx) => {
                    const slot = calendarData.find(d => d.day === day && d.time === time);
                    if (!slot) return <td key={`${day}-${time}`} className="p-1"><div className="h-12 bg-gray-100 rounded"></div></td>;

                    return (
                      <td key={`${day}-${time}`} className="p-1">
                        <div
                          className={`h-12 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 relative flex flex-col items-center justify-center ${
                            slot.available 
                              ? slot.congestion > 80 ? 'bg-gradient-to-br from-red-400 to-red-500 text-white' 
                              : slot.congestion > 60 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'
                              : slot.congestion > 40 ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 text-gray-800'
                              : 'bg-gradient-to-br from-green-300 to-green-400 text-white'
                              : 'bg-gray-200'
                          }`}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                        >
                          {slot.available ? (
                            <>
                              <span className="text-lg font-bold">{slot.bookings}</span>
                              <span className="text-[10px] opacity-80">명</span>
                              {slot.risk === 'high' && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">휴진</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-300 rounded"></div>
          <span className="text-xs text-gray-600">여유 (0-15명)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300 rounded"></div>
          <span className="text-xs text-gray-600">보통 (16-20명)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-300 rounded"></div>
          <span className="text-xs text-gray-600">혼잡 (21-25명)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <span className="text-xs text-gray-600">매우혼잡 (26명+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span className="text-xs text-gray-600">휴진</span>
        </div>
      </div>

      {/* 선택된 슬롯 정보 */}
      {selectedSlot && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedSlot.day}요일 {selectedSlot.time} 예약 현황
            </h3>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">예약 수</p>
              <p className="text-lg font-bold text-gray-900">{selectedSlot.bookings}명</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">예상 대기</p>
              <p className="text-lg font-bold text-gray-900">{selectedSlot.waitTime}분</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">혼잡도</p>
              <p className="text-lg font-bold text-gray-900">{selectedSlot.congestion}%</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">위험도</p>
              <p className={`text-lg font-bold ${
                selectedSlot.risk === 'high' ? 'text-red-600' :
                selectedSlot.risk === 'medium' ? 'text-orange-600' : 'text-green-600'
              }`}>
                {selectedSlot.risk === 'high' ? '높음' :
                 selectedSlot.risk === 'medium' ? '중간' : '낮음'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 위험 슬롯 하이라이트 */}
      <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">주의 필요 시간대</p>
            <p className="text-xs text-gray-600 mt-1">
              {calendarData.filter(d => d.risk === 'high' && d.available).length > 0
                ? `이번 주 ${calendarData.filter(d => d.risk === 'high' && d.available)
                    .slice(0, 3)
                    .map(d => `${d.day} ${d.time}`)
                    .join(', ')} 시간대 예약 조정 권장`
                : '이번 주는 전체적으로 원활한 운영이 예상됩니다'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCongestionCalendar;