import React, { useState, useEffect } from 'react';
import { Activity, Users, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const KPIDashboard = () => {
  const [operationalKPI, setOperationalKPI] = useState({
    score: 0,
    trend: 0,
    components: {}
  });
  const [patientKPI, setPatientKPI] = useState({
    score: 0,
    trend: 0,
    components: {}
  });
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    const generateKPIs = () => {
      const currentHour = new Date().getHours();
      const timeModifier = Math.sin((currentHour - 6) / 12 * Math.PI);
      
      // 운영 효율 지수 계산
      const utilization = 70 + timeModifier * 15 + Math.random() * 10;
      const avgWaitTime = 25 - timeModifier * 10 + Math.random() * 5;
      const bottleneckRate = 15 + Math.random() * 10;
      
      const operationalScore = Math.round(
        (utilization * 0.4) + 
        ((100 - avgWaitTime) * 0.4) + 
        ((100 - bottleneckRate) * 0.2)
      );

      // 환자 경험 지수 계산
      const p50Wait = 20 + Math.random() * 10;
      const p90Wait = 35 + Math.random() * 15;
      const excessiveWaitRate = 12 + Math.random() * 8;
      const density = 25 + timeModifier * 10 + Math.random() * 5;
      
      const patientScore = Math.round(
        ((60 - p50Wait) * 0.3) + 
        ((90 - p90Wait) * 0.3) + 
        ((100 - excessiveWaitRate * 2) * 0.2) +
        ((50 - density) * 0.2)
      );

      // 이전 값과 비교하여 트렌드 계산
      setOperationalKPI(prev => ({
        score: operationalScore,
        trend: prev.score ? ((operationalScore - prev.score) / prev.score * 100).toFixed(1) : '0',
        components: {
          utilization: Math.round(utilization),
          avgWaitTime: Math.round(avgWaitTime),
          bottleneckRate: Math.round(bottleneckRate)
        }
      }));

      setPatientKPI(prev => ({
        score: patientScore,
        trend: prev.score ? ((patientScore - prev.score) / prev.score * 100).toFixed(1) : '0',
        components: {
          p50Wait: Math.round(p50Wait),
          p90Wait: Math.round(p90Wait),
          excessiveWaitRate: Math.round(excessiveWaitRate),
          density: Math.round(density)
        }
      }));

      // 히스토리 데이터 업데이트
      const newDataPoint = {
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        operational: operationalScore,
        patient: patientScore
      };

      setHistoricalData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-10); // 최근 10개만 유지
      });
    };

    generateKPIs();
    const interval = setInterval(generateKPIs, 5000);
    return () => clearInterval(interval);
  }, []); // 의존성 배열을 빈 배열로 변경

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevel = (score) => {
    if (score >= 80) return { text: '우수', color: 'text-green-600 bg-green-50' };
    if (score >= 60) return { text: '양호', color: 'text-blue-600 bg-blue-50' };
    if (score >= 40) return { text: '주의', color: 'text-yellow-600 bg-yellow-50' };
    return { text: '위험', color: 'text-red-600 bg-red-50' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">핵심 성과 지표 (KPI)</h2>
            <p className="text-sm text-gray-500">실시간 운영 및 환자 경험 지수</p>
          </div>
        </div>
      </div>

      {/* 메인 KPI 카드 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 운영 효율 지수 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">운영 효율 지수</h3>
            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getRiskLevel(operationalKPI.score).color}`}>
              {getRiskLevel(operationalKPI.score).text}
            </div>
          </div>
          
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className={`text-4xl font-bold ${getScoreTextColor(operationalKPI.score)}`}>
                {operationalKPI.score}
              </p>
              <p className="text-sm text-gray-500 mt-1">/ 100</p>
            </div>
            <div className="flex items-center gap-1">
              {operationalKPI.trend > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${operationalKPI.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {operationalKPI.trend > 0 ? '+' : ''}{operationalKPI.trend}%
              </span>
            </div>
          </div>

          {/* 구성 요소 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">가동률</span>
              <span className="font-medium">{operationalKPI.components.utilization}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">평균 대기시간</span>
              <span className="font-medium">{operationalKPI.components.avgWaitTime}분</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">병목률</span>
              <span className="font-medium">{operationalKPI.components.bottleneckRate}%</span>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getScoreColor(operationalKPI.score)}`}
                style={{ width: `${operationalKPI.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* 환자 경험 지수 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">환자 경험 지수</h3>
            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getRiskLevel(patientKPI.score).color}`}>
              {getRiskLevel(patientKPI.score).text}
            </div>
          </div>
          
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className={`text-4xl font-bold ${getScoreTextColor(patientKPI.score)}`}>
                {patientKPI.score}
              </p>
              <p className="text-sm text-gray-500 mt-1">/ 100</p>
            </div>
            <div className="flex items-center gap-1">
              {patientKPI.trend > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${patientKPI.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {patientKPI.trend > 0 ? '+' : ''}{patientKPI.trend}%
              </span>
            </div>
          </div>

          {/* 구성 요소 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">P50 대기시간</span>
              <span className="font-medium">{patientKPI.components.p50Wait}분</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">P90 대기시간</span>
              <span className="font-medium">{patientKPI.components.p90Wait}분</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">과도 대기 비율</span>
              <span className="font-medium">{patientKPI.components.excessiveWaitRate}%</span>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getScoreColor(patientKPI.score)}`}
                style={{ width: `${patientKPI.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 트렌드 차트 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">실시간 KPI 추이</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="operational" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="운영 효율"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="patient" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="환자 경험"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 위험 구간 알림 */}
      {(operationalKPI.score < 60 || patientKPI.score < 60) && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">주의 필요 구간</p>
              <p className="text-xs text-gray-600 mt-1">
                {operationalKPI.score < 60 && '운영 효율이 낮습니다. 자원 재배치를 검토하세요. '}
                {patientKPI.score < 60 && '환자 경험 지수가 낮습니다. 대기시간 관리가 필요합니다.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIDashboard;