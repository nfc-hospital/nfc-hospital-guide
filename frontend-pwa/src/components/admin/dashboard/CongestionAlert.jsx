import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const CongestionAlert = () => {
  const [alerts, setAlerts] = useState([]);
  const [overallStatus, setOverallStatus] = useState('normal');

  useEffect(() => {
    const generateAlerts = () => {
      // 8월 25일 오후 2시 기준 (14:00)
      const baseTime = new Date('2025-08-25T14:00:00');
      const currentTime = Date.now();
      const hour = 14; // 오후 2시 고정
      
      // 오후 시간대 혼잡도 패턴
      const congestionMultiplier = 1.3; // 오후 2시는 보통 혼잡
      
      const departments = [
        { id: 'radiology', name: '영상의학과', baseline: 15 },
        { id: 'lab', name: '진단검사의학과', baseline: 10 },
        { id: 'internal', name: '내과', baseline: 20 },
        { id: 'orthopedics', name: '정형외과', baseline: 25 },
        { id: 'emergency', name: '응급실', baseline: 30 }
      ];

      const newAlerts = departments.map(dept => {
        const baseline = dept.baseline;
        const current = baseline * congestionMultiplier + Math.random() * 10 - 5;
        const ratio = (current / baseline) * 100;
        const density = Math.floor(20 + Math.sin(currentTime / 10000) * 10 + Math.random() * 5);
        
        let status = 'normal';
        let level = 'info';
        
        if (ratio >= 200) {
          status = 'critical';
          level = 'danger';
        } else if (ratio >= 150) {
          status = 'warning';
          level = 'warning';
        } else if (ratio >= 120) {
          status = 'caution';
          level = 'caution';
        }

        return {
          id: dept.id,
          name: dept.name,
          status,
          level,
          ratio: Math.round(ratio),
          currentWaitTime: Math.round(current),
          baselineWaitTime: baseline,
          density,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
      });

      const criticalCount = newAlerts.filter(a => a.status === 'critical').length;
      const warningCount = newAlerts.filter(a => a.status === 'warning').length;
      
      if (criticalCount > 0) {
        setOverallStatus('critical');
      } else if (warningCount > 1) {
        setOverallStatus('warning');
      } else if (warningCount === 1) {
        setOverallStatus('caution');
      } else {
        setOverallStatus('normal');
      }

      setAlerts(newAlerts);
    };

    generateAlerts();
    const interval = setInterval(generateAlerts, 20000); // 20초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      case 'caution': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'caution': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'caution': return <Activity className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${
            overallStatus === 'critical' ? 'bg-red-100' :
            overallStatus === 'warning' ? 'bg-orange-100' :
            overallStatus === 'caution' ? 'bg-yellow-100' :
            'bg-green-100'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              overallStatus === 'critical' ? 'text-red-600' :
              overallStatus === 'warning' ? 'text-orange-600' :
              overallStatus === 'caution' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">혼잡도 경보 시스템</h2>
            <p className="text-sm text-gray-500">평균 대비 실시간 혼잡도 모니터링</p>
          </div>
        </div>
        
        {/* 전체 상태 표시 */}
        <div className={`px-4 py-2 rounded-lg ${getStatusColor(overallStatus)}`}>
          <span className="text-white font-semibold">
            {overallStatus === 'critical' ? '위험' :
             overallStatus === 'warning' ? '경고' :
             overallStatus === 'caution' ? '주의' : '정상'}
          </span>
        </div>
      </div>

      {/* 경보 지표 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-600 font-medium">평균 대기시간</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {Math.round(alerts.reduce((sum, a) => sum + a.currentWaitTime, 0) / alerts.length || 0)}분
          </p>
          <p className="text-xs text-blue-600 mt-1">
            기준: {Math.round(alerts.reduce((sum, a) => sum + a.baselineWaitTime, 0) / alerts.length || 0)}분
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-600 font-medium">평균 밀집도</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {Math.round(alerts.reduce((sum, a) => sum + a.density, 0) / alerts.length || 0)}명/구역
          </p>
          <p className="text-xs text-purple-600 mt-1">
            최대: {Math.max(...alerts.map(a => a.density))}명
          </p>
        </div>
      </div>

      {/* 부서별 경보 상태 - 통일된 레이아웃 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">부서별 혼잡도 상태</h3>
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`border-2 rounded-lg transition-all duration-300 ${getStatusBg(alert.status)}`}>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  {/* 좌측: 부서명과 상태 */}
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(alert.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{alert.name}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === 'critical' ? 'bg-red-600 text-white' :
                          alert.status === 'warning' ? 'bg-orange-600 text-white' :
                          alert.status === 'caution' ? 'bg-yellow-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {alert.ratio >= 200 ? '매우 혼잡' :
                           alert.ratio >= 150 ? '혼잡' :
                           alert.ratio >= 120 ? '약간 혼잡' : '원활'}
                        </div>
                      </div>
                      
                      {/* 진행 바 */}
                      <div className="mt-2">
                        <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${getStatusColor(alert.status)}`}
                            style={{ width: `${Math.min(alert.ratio, 200) / 2}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 우측: 수치 정보 */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{alert.currentWaitTime}분</p>
                      <p className="text-xs text-gray-500">대기시간</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{alert.ratio}%</p>
                      <p className="text-xs text-gray-500">혼잡도</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{alert.density}명</p>
                      <p className="text-xs text-gray-500">밀집도</p>
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CongestionAlert;