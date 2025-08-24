import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Clock, AlertCircle, Users, Activity, ChevronRight } from 'lucide-react';

const LSTMPrediction = () => {
  const [departmentPredictions, setDepartmentPredictions] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('30min');

  const departments = [
    { id: 'radiology', name: '영상의학과', baseline: 25, peak: 45, color: '#10b981' },
    { id: 'lab', name: '진단검사의학과', baseline: 15, peak: 30, color: '#eab308' },
    { id: 'cardiology', name: '순환기내과', baseline: 20, peak: 35, color: '#ef4444' },
    { id: 'gastro', name: '소화기내과', baseline: 22, peak: 38, color: '#a855f7' },
    { id: 'internal', name: '내과', baseline: 30, peak: 50, color: '#3b82f6' },
    { id: 'orthopedics', name: '정형외과', baseline: 28, peak: 42, color: '#f97316' }
  ];

  const timeframes = [
    { id: '30min', label: '30분 후', minutes: 30 },
    { id: '1hour', label: '1시간 후', minutes: 60 },
    { id: '2hour', label: '2시간 후', minutes: 120 }
  ];

  useEffect(() => {
    const generatePredictions = () => {
      const currentTime = new Date('2025-08-25T14:00:00');
      const predictions = {};
      
      departments.forEach(dept => {
        const timeData = [];
        
        // 현재부터 2시간까지 10분 간격으로 예측
        for (let minutes = 0; minutes <= 120; minutes += 10) {
          const futureTime = new Date(currentTime.getTime() + minutes * 60000);
          const hour = futureTime.getHours();
          const timeStr = futureTime.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          // 부서별 패턴
          const peakFactor = Math.sin((hour - 9) * Math.PI / 8);
          const randomVariation = Math.random() * 5 - 2.5;
          
          const waitTime = Math.round(
            dept.baseline + (dept.peak - dept.baseline) * peakFactor * 0.7 + randomVariation
          );
          
          const congestion = Math.min(100, Math.round((waitTime / dept.peak) * 100));
          
          timeData.push({
            time: timeStr,
            minutes: minutes,
            waitTime: Math.max(5, waitTime),
            congestion: congestion,
            confidence: 95 - minutes * 0.15, // 신뢰도는 시간이 지날수록 감소
            status: congestion > 80 ? 'critical' : congestion > 60 ? 'warning' : 'normal'
          });
        }
        
        predictions[dept.id] = {
          name: dept.name,
          color: dept.color,
          data: timeData,
          current: timeData[0].waitTime,
          peak: Math.max(...timeData.map(t => t.waitTime)),
          trend: timeData[6].waitTime > timeData[0].waitTime ? 'up' : 'down',
          predictions: {
            '30min': timeData[3],
            '1hour': timeData[6],
            '2hour': timeData[12]
          }
        };
      });

      setDepartmentPredictions(predictions);
    };

    generatePredictions();
    const interval = setInterval(generatePredictions, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'critical': return '매우 혼잡';
      case 'warning': return '혼잡';
      default: return '원활';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">LSTM 혼잡도 예측</h2>
            <p className="text-sm text-gray-500">부서별 대기시간 예측 분석</p>
          </div>
        </div>
        
        {/* 시간 선택 */}
        <div className="flex gap-2">
          {timeframes.map(tf => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTimeframe === tf.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 부서별 예측 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(departmentPredictions).map(dept => {
          const prediction = dept.predictions?.[selectedTimeframe];
          if (!prediction) return null;
          
          return (
            <div 
              key={dept.name}
              className={`border-2 rounded-xl p-4 transition-all hover:shadow-lg ${
                getStatusColor(prediction.status)
              }`}
            >
              {/* 부서명과 상태 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{dept.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full font-medium ${
                    prediction.status === 'critical' ? 'bg-red-600 text-white' :
                    prediction.status === 'warning' ? 'bg-yellow-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {getStatusLabel(prediction.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {dept.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* 예측 데이터 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">예상 대기시간</span>
                  <span className="text-2xl font-bold" style={{ color: dept.color }}>
                    {prediction.waitTime}분
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">현재 대기시간</span>
                  <span className="text-sm font-medium text-gray-900">{dept.current}분</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">혼잡도</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          prediction.congestion > 80 ? 'bg-red-500' :
                          prediction.congestion > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${prediction.congestion}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{prediction.congestion}%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">예측 신뢰도</span>
                  <span className="text-sm font-medium text-blue-600">{prediction.confidence.toFixed(1)}%</span>
                </div>
              </div>

              {/* 미니 차트 */}
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dept.data.slice(0, selectedTimeframe === '30min' ? 4 : selectedTimeframe === '1hour' ? 7 : 13)}>
                    <defs>
                      <linearGradient id={`gradient-${dept.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={dept.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={dept.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="waitTime" 
                      stroke={dept.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${dept.name})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 상세 보기 */}
              <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-all text-sm font-medium text-gray-700">
                상세 분석 보기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 하단 요약 */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">예측 요약</p>
            <p className="text-xs text-gray-600 mt-1">
              {selectedTimeframe === '30min' ? '30분' : selectedTimeframe === '1hour' ? '1시간' : '2시간'} 후 
              {' '}가장 혼잡할 것으로 예상되는 부서는{' '}
              <span className="font-bold text-blue-600">
                {Object.values(departmentPredictions).reduce((max, dept) => {
                  const prediction = dept.predictions?.[selectedTimeframe];
                  const maxPrediction = max?.predictions?.[selectedTimeframe];
                  return !maxPrediction || (prediction?.waitTime > maxPrediction?.waitTime) ? dept : max;
                }, {})?.name || '내과'}
              </span>
              입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LSTMPrediction;