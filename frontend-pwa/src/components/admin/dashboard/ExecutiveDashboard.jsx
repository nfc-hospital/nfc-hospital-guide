import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertCircle, Activity, 
  Users, Clock, DollarSign, Target, Award, 
  CheckCircle, XCircle, AlertTriangle 
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ExecutiveDashboard = () => {
  const [metrics, setMetrics] = useState({
    efficiency: { value: 0, trend: 0, status: 'normal' },
    satisfaction: { value: 0, trend: 0, status: 'normal' },
    revenue: { value: 0, trend: 0, status: 'normal' },
    utilization: { value: 0, trend: 0, status: 'normal' }
  });

  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    const updateMetrics = () => {
      const hour = new Date().getHours();
      const dayFactor = Math.sin((hour - 6) / 12 * Math.PI);
      
      // 핵심 지표 계산
      const efficiency = 75 + dayFactor * 10 + Math.random() * 5;
      const satisfaction = 82 + Math.random() * 8 - dayFactor * 5;
      const revenue = 92 + Math.random() * 10;
      const utilization = 68 + dayFactor * 15 + Math.random() * 7;

      setMetrics(prev => ({
        efficiency: {
          value: Math.round(efficiency),
          trend: prev.efficiency.value ? ((efficiency - prev.efficiency.value) / prev.efficiency.value * 100).toFixed(1) : 0,
          status: efficiency > 80 ? 'excellent' : efficiency > 70 ? 'good' : efficiency > 60 ? 'warning' : 'critical'
        },
        satisfaction: {
          value: Math.round(satisfaction),
          trend: prev.satisfaction.value ? ((satisfaction - prev.satisfaction.value) / prev.satisfaction.value * 100).toFixed(1) : 0,
          status: satisfaction > 85 ? 'excellent' : satisfaction > 75 ? 'good' : satisfaction > 65 ? 'warning' : 'critical'
        },
        revenue: {
          value: Math.round(revenue),
          trend: prev.revenue.value ? ((revenue - prev.revenue.value) / prev.revenue.value * 100).toFixed(1) : 0,
          status: revenue > 95 ? 'excellent' : revenue > 85 ? 'good' : revenue > 75 ? 'warning' : 'critical'
        },
        utilization: {
          value: Math.round(utilization),
          trend: prev.utilization.value ? ((utilization - prev.utilization.value) / prev.utilization.value * 100).toFixed(1) : 0,
          status: utilization > 75 ? 'excellent' : utilization > 65 ? 'good' : utilization > 55 ? 'warning' : 'critical'
        }
      }));

      // 중요 알림 생성
      const alerts = [];
      if (efficiency < 70) alerts.push({ type: 'efficiency', message: '운영 효율성 저하 감지', severity: 'high' });
      if (satisfaction < 75) alerts.push({ type: 'satisfaction', message: '환자 만족도 주의 필요', severity: 'medium' });
      if (utilization > 85) alerts.push({ type: 'utilization', message: '과부하 상태 경고', severity: 'high' });
      setCriticalAlerts(alerts);

      // 성과 데이터 업데이트
      const newDataPoint = {
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        efficiency,
        satisfaction,
        utilization
      };

      setPerformanceData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-12);
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 6000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'excellent': return 'bg-gradient-to-r from-emerald-500 to-green-600';
      case 'good': return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'warning': return 'bg-gradient-to-r from-amber-500 to-orange-600';
      case 'critical': return 'bg-gradient-to-r from-red-500 to-rose-600';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-white" />;
      case 'good': return <Activity className="w-5 h-5 text-white" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-white" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-white" />;
      default: return <Activity className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Executive Dashboard</h1>
        <p className="text-gray-600">실시간 병원 운영 현황 및 핵심 성과 지표</p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 운영 효율성 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`h-2 ${getStatusColor(metrics.efficiency.status)}`} />
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">운영 효율성</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.efficiency.value}%</p>
              </div>
              <div className={`p-2 rounded-xl ${getStatusColor(metrics.efficiency.status)}`}>
                {getStatusIcon(metrics.efficiency.status)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Number(metrics.efficiency.trend) > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${Number(metrics.efficiency.trend) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.efficiency.trend)}%
              </span>
              <span className="text-xs text-gray-500">vs 이전</span>
            </div>
          </div>
        </div>

        {/* 환자 만족도 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`h-2 ${getStatusColor(metrics.satisfaction.status)}`} />
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">환자 만족도</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.satisfaction.value}%</p>
              </div>
              <div className={`p-2 rounded-xl ${getStatusColor(metrics.satisfaction.status)}`}>
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Number(metrics.satisfaction.trend) > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${Number(metrics.satisfaction.trend) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.satisfaction.trend)}%
              </span>
              <span className="text-xs text-gray-500">vs 이전</span>
            </div>
          </div>
        </div>

        {/* 수익 달성률 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`h-2 ${getStatusColor(metrics.revenue.status)}`} />
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">목표 달성률</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.revenue.value}%</p>
              </div>
              <div className={`p-2 rounded-xl ${getStatusColor(metrics.revenue.status)}`}>
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Number(metrics.revenue.trend) > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${Number(metrics.revenue.trend) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.revenue.trend)}%
              </span>
              <span className="text-xs text-gray-500">vs 이전</span>
            </div>
          </div>
        </div>

        {/* 자원 활용률 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`h-2 ${getStatusColor(metrics.utilization.status)}`} />
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">자원 활용률</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.utilization.value}%</p>
              </div>
              <div className={`p-2 rounded-xl ${getStatusColor(metrics.utilization.status)}`}>
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Number(metrics.utilization.trend) > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${Number(metrics.utilization.trend) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.utilization.trend)}%
              </span>
              <span className="text-xs text-gray-500">vs 이전</span>
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 성과 차트 */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">실시간 성과 추이</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorSatisfaction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="efficiency" 
              stroke="#3b82f6" 
              fill="url(#colorEfficiency)"
              strokeWidth={2}
              name="운영 효율성"
            />
            <Area 
              type="monotone" 
              dataKey="satisfaction" 
              stroke="#10b981" 
              fill="url(#colorSatisfaction)"
              strokeWidth={2}
              name="환자 만족도"
            />
            <Area 
              type="monotone" 
              dataKey="utilization" 
              stroke="#f59e0b" 
              fill="url(#colorUtilization)"
              strokeWidth={2}
              name="자원 활용률"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 중요 알림 */}
      {criticalAlerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            즉시 조치 필요 사항
          </h2>
          <div className="space-y-3">
            {criticalAlerts.map((alert, idx) => (
              <div key={idx} className={`p-4 rounded-xl flex items-center gap-4 ${
                alert.severity === 'high' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{alert.message}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {alert.type === 'efficiency' && '프로세스 최적화 검토 필요'}
                    {alert.type === 'satisfaction' && '환자 대기시간 단축 방안 마련 필요'}
                    {alert.type === 'utilization' && '추가 자원 투입 또는 부하 분산 필요'}
                  </p>
                </div>
                <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  alert.severity === 'high' 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}>
                  조치하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;