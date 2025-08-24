import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';

const RiskHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);

  const departments = ['영상의학과', '내과', '정형외과', '진단검사', '응급실'];
  const timeSlots = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  useEffect(() => {
    const generateHeatmap = () => {
      const currentHour = new Date().getHours();
      const data = [];

      departments.forEach((dept, deptIdx) => {
        timeSlots.forEach((time, timeIdx) => {
          const hour = parseInt(time.split(':')[0]);
          const timeFactor = Math.sin((hour - 9) / 8 * Math.PI);
          
          // 부서별 패턴
          let baseCongestion = 30;
          if (dept === '영상의학과') baseCongestion = 40;
          if (dept === '응급실') baseCongestion = 50;
          if (dept === '내과') baseCongestion = 35;
          
          // 시간대별 변동
          let congestion = baseCongestion + timeFactor * 25;
          
          // 점심시간 효과
          if (hour >= 12 && hour <= 13) {
            congestion += 15;
          }
          
          // 랜덤 변동
          congestion += Math.random() * 10 - 5;
          
          // 예측 대기시간
          const waitTime = Math.round(congestion * 0.8 + Math.random() * 5);
          const queueSize = Math.floor(congestion * 0.3 + Math.random() * 3);
          
          data.push({
            department: dept,
            time: time,
            congestion: Math.round(Math.max(0, Math.min(100, congestion))),
            waitTime: waitTime,
            queueSize: queueSize,
            risk: congestion > 70 ? 'high' : congestion > 50 ? 'medium' : 'low'
          });
        });
      });

      setHeatmapData(data);
    };

    generateHeatmap();
    const interval = setInterval(generateHeatmap, 8000);
    return () => clearInterval(interval);
  }, []);

  const getCellColor = (congestion) => {
    if (congestion > 70) return 'bg-red-500';
    if (congestion > 50) return 'bg-orange-400';
    if (congestion > 30) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getCellOpacity = (congestion) => {
    return `opacity-${Math.min(100, Math.max(30, congestion))}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">리스크 히트맵</h2>
            <p className="text-sm text-gray-500">향후 4시간 혼잡도 예측 (LSTM)</p>
          </div>
        </div>
        
        {/* 범례 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-xs text-gray-600">원활</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-xs text-gray-600">보통</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className="text-xs text-gray-600">혼잡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-gray-600">매우혼잡</span>
          </div>
        </div>
      </div>

      {/* 히트맵 그리드 */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* 시간 헤더 */}
          <div className="grid grid-cols-9 gap-1 mb-1">
            <div className="h-8"></div>
            {timeSlots.map(time => (
              <div key={time} className="text-xs text-center text-gray-600 font-medium flex items-center justify-center">
                {time}
              </div>
            ))}
          </div>

          {/* 히트맵 본체 */}
          {departments.map(dept => (
            <div key={dept} className="grid grid-cols-9 gap-1 mb-1">
              <div className="text-xs text-gray-700 font-medium pr-2 flex items-center justify-end h-12">
                {dept}
              </div>
              {timeSlots.map(time => {
                const cell = heatmapData.find(d => d.department === dept && d.time === time);
                if (!cell) return <div key={time} className="bg-gray-100 rounded"></div>;
                
                return (
                  <div
                    key={time}
                    className={`relative rounded cursor-pointer transition-all duration-300 hover:scale-105 ${getCellColor(cell.congestion)}`}
                    style={{ opacity: cell.congestion / 100 }}
                    onClick={() => setSelectedCell(cell)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {cell.congestion}%
                      </span>
                    </div>
                    {cell.risk === 'high' && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 선택된 셀 상세 정보 */}
      {selectedCell && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedCell.department} - {selectedCell.time}
            </h3>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">혼잡도</p>
              <p className="text-lg font-bold text-gray-900">{selectedCell.congestion}%</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">예상 대기</p>
              <p className="text-lg font-bold text-gray-900">{selectedCell.waitTime}분</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-500">대기 인원</p>
              <p className="text-lg font-bold text-gray-900">{selectedCell.queueSize}명</p>
            </div>
          </div>
        </div>
      )}

      {/* 위험 슬롯 알림 */}
      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">위험 시간대 감지</p>
            <p className="text-xs text-gray-600 mt-1">
              {heatmapData.filter(d => d.risk === 'high').length > 0 
                ? `${heatmapData.filter(d => d.risk === 'high').slice(0, 3).map(d => `${d.department} ${d.time}`).join(', ')} 시간대에 혼잡이 예상됩니다.`
                : '향후 4시간 동안 정상 운영 예상'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmap;