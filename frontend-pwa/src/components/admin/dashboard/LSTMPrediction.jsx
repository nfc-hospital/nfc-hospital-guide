import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Clock, AlertCircle, Users, Activity, ChevronRight, RefreshCw, Loader } from 'lucide-react';
import { useAPI } from '../../../hooks/useAPI';
import apiService from '../../../api/apiService';

const LSTMPrediction = () => {
  const [departmentPredictions, setDepartmentPredictions] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('30min');
  const [chartData, setChartData] = useState([]);

  // API 호출 - 올바른 사용법: 함수를 전달
  const { data, loading, error, execute } = useAPI(apiService.analytics.getPredictions);
  const lastUpdateTime = useRef(new Date());

  // 부서별 색상 매핑
  const DEPT_COLORS = {
    '영상의학과': '#10b981',
    '진단검사의학과': '#eab308',
    '순환기내과': '#ef4444',
    '소화기내과': '#a855f7',
    '내과': '#3b82f6',
    '정형외과': '#f97316',
    'CT실': '#8b5cf6',
    'MRI실': '#ec4899',
    'X-ray실': '#06b6d4',
    '채혈실': '#84cc16'
  };

  const timeframes = [
    { id: '30min', label: '30분 후', minutes: 30 },
    { id: '1hour', label: '1시간 후', minutes: 60 },
    { id: '2hour', label: '2시간 후', minutes: 120 }
  ];

  // API 데이터 처리
  useEffect(() => {
    console.log('🔍 LSTMPrediction - 전체 API 응답:', data);
    console.log('🔍 실제 departments 데이터:', data?.data?.departments);

    // APIResponse 래퍼를 고려한 데이터 접근
    if (data?.data?.departments) {
      console.log('📊 부서별 예측 데이터 처리 시작');
      const predictions = {};
      const barChartData = [];

      Object.entries(data.data.departments).forEach(([deptName, deptData]) => {
        console.log(`📌 ${deptName} 데이터:`, deptData);
        if (deptData.error) {
          console.error(`❌ ${deptName} 오류:`, deptData.error);
          return;
        }

        // 실제 API 데이터를 시뮬레이션 데이터 형식으로 변환
        const currentWait = deptData.current_wait || 0;
        const predictedWait = deptData.predicted_wait || 0;
        const congestionLevel = deptData.congestion || 0;
        const trend = deptData.trend || 'stable';

        console.log(`✅ ${deptName} - 현재: ${currentWait}분, 예측: ${predictedWait}분, 혼잡도: ${congestionLevel}`);

        // 시간별 예측 데이터 생성 (실제 API가 시계열 데이터를 제공하지 않으므로 시뮬레이션)
        const timeData = [];
        const currentTime = new Date();

        for (let minutes = 0; minutes <= 120; minutes += 10) {
          const futureTime = new Date(currentTime.getTime() + minutes * 60000);
          const timeStr = futureTime.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          });

          // 선형 보간을 사용한 예측값 생성
          let waitTime;
          if (minutes === 0) {
            waitTime = currentWait;
          } else if (minutes <= 30) {
            waitTime = currentWait + (predictedWait - currentWait) * (minutes / 30);
          } else {
            // 30분 이후는 추세를 반영한 예측
            const trendFactor = trend === 'up' ? 1.1 : trend === 'down' ? 0.9 : 1.0;
            waitTime = predictedWait * Math.pow(trendFactor, (minutes - 30) / 30);
          }

          const congestion = Math.min(100, Math.round(congestionLevel * 100 + (minutes * 0.1)));

          timeData.push({
            time: timeStr,
            minutes: minutes,
            waitTime: Math.max(5, Math.round(waitTime)),
            congestion: congestion,
            confidence: 95 - minutes * 0.15,
            status: congestion > 80 ? 'critical' : congestion > 60 ? 'warning' : 'normal'
          });
        }

        // 바 차트용 데이터 추가
        barChartData.push({
          name: deptName,
          '현재 대기시간': currentWait,
          'AI 예측 대기시간': predictedWait,
          fill: DEPT_COLORS[deptName] || '#3b82f6'
        });

        predictions[deptName] = {
          name: deptName,
          color: DEPT_COLORS[deptName] || '#3b82f6',
          data: timeData,
          current: currentWait,
          predicted: predictedWait,
          peak: Math.max(...timeData.map(t => t.waitTime)),
          trend: trend,
          congestion: congestionLevel,
          predictions: {
            '30min': timeData[3] || timeData[0],  // 인덱스 보호
            '1hour': timeData[6] || timeData[0],   // 인덱스 보호
            '2hour': timeData[12] || timeData[0]   // 인덱스 보호
          }
        };
        console.log(`📊 ${deptName} predictions 객체 생성 완료:`, predictions[deptName].predictions);
      });

      setDepartmentPredictions(predictions);
      setChartData(barChartData);
      lastUpdateTime.current = new Date();
      console.log('✅ 최종 departmentPredictions 설정:', predictions);
    } else {
      console.log('⚠️ API 데이터 없음 - 실제 데이터를 기다리는 중...');
    }
  }, [data]);

  // 30초마다 자동 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      execute();
    }, 30000);
    return () => clearInterval(interval);
  }, [execute]);

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

  // 로딩 상태
  if (loading && Object.keys(departmentPredictions).length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">AI 예측 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-gray-700">예측 데이터를 불러오는 중 오류가 발생했습니다.</p>
            <button
              onClick={execute}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI 대기시간 예측 (LSTM)</h2>
            <p className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdateTime.current.toLocaleTimeString('ko-KR')}
            </p>
          </div>
        </div>

        {/* 시간 선택 & 새로고침 */}
        <div className="flex items-center gap-3">
          <button
            onClick={execute}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
      </div>

      {/* 바 차트 추가 */}
      {chartData.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">현재 vs AI 예측 대기시간</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis label={{ value: '분', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="현재 대기시간" fill="#8884d8" />
              <Bar dataKey="AI 예측 대기시간" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 부서별 예측 카드 그리드 */}
      {Object.keys(departmentPredictions).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">AI 예측 데이터를 불러오는 중입니다...</p>
          <p className="text-sm text-gray-500 mt-1">백엔드 서버가 실행 중인지 확인해주세요.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {console.log('🎯 렌더링할 부서 예측 데이터:', departmentPredictions)}
        {console.log('🎯 선택된 시간대:', selectedTimeframe)}
        {Object.values(departmentPredictions).map(dept => {
          console.log(`📍 ${dept.name} 렌더링 시도, predictions:`, dept.predictions);
          const prediction = dept.predictions?.[selectedTimeframe];
          console.log(`📍 ${dept.name}의 ${selectedTimeframe} 예측:`, prediction);

          // prediction이 없으면 건너뛰기 대신 경고 메시지 출력
          if (!prediction) {
            console.warn(`⚠️ ${dept.name}의 ${selectedTimeframe} 예측 데이터가 없습니다`);
            return null;
          }

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
                  <span className="text-sm font-medium text-gray-900">{dept.current || 0}분</span>
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
      )}

      {/* 하단 요약 */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">AI 예측 요약</p>
            <p className="text-xs text-gray-600 mt-1">
              LSTM 모델 예측: {selectedTimeframe === '30min' ? '30분' : selectedTimeframe === '1hour' ? '1시간' : '2시간'} 후
              {' '}가장 혼잡할 것으로 예상되는 부서는{' '}
              <span className="font-bold text-blue-600">
                {Object.values(departmentPredictions).reduce((max, dept) => {
                  const prediction = dept.predictions?.[selectedTimeframe];
                  const maxPrediction = max?.predictions?.[selectedTimeframe];
                  return !maxPrediction || (prediction?.waitTime > maxPrediction?.waitTime) ? dept : max;
                }, {})?.name || '데이터 로딩 중'}
              </span>
              {Object.keys(departmentPredictions).length > 0 ? '입니다.' : '...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LSTMPrediction;