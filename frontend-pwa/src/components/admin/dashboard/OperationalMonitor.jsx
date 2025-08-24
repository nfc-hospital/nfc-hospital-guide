import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Users, Clock, AlertCircle, 
  TrendingUp, CheckCircle, XCircle, Pause,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import './OperationalMonitor.css';

const OperationalMonitor = () => {
  const [departments, setDepartments] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'operational',
    uptime: 99.9,
    responseTime: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const updateData = () => {
      // 부서별 실시간 상태 - 8월 25일 오후 2시 기준
      const baseTime = new Date('2025-08-25T14:00:00');
      const currentTime = Date.now();
      const cyclePosition = (currentTime / 60000) % 1; // 60초 주기로 변경
      
      const deptData = [
        { 
          id: 'emergency',
          name: '응급실',
          waitingPatients: Math.floor(15 + Math.random() * 20),
          avgWaitTime: Math.floor(25 + Math.random() * 15),
          staffOnDuty: Math.floor(8 + Math.random() * 4),
          bedOccupancy: Math.floor(70 + Math.random() * 25),
          status: cyclePosition < 0.3 ? 'critical' : Math.random() > 0.5 ? 'busy' : 'normal',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          priority: 1
        },
        {
          id: 'radiology',
          name: '영상의학과',
          waitingPatients: Math.floor(8 + Math.random() * 12),
          avgWaitTime: Math.floor(30 + Math.random() * 20),
          staffOnDuty: Math.floor(5 + Math.random() * 3),
          equipmentUtilization: Math.floor(60 + Math.random() * 30),
          status: cyclePosition > 0.3 && cyclePosition < 0.5 ? 'critical' : Math.random() > 0.5 ? 'busy' : 'normal',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          priority: 2
        },
        {
          id: 'laboratory',
          name: '진단검사의학과',
          waitingPatients: Math.floor(10 + Math.random() * 15),
          avgWaitTime: Math.floor(20 + Math.random() * 10),
          staffOnDuty: Math.floor(6 + Math.random() * 2),
          pendingTests: Math.floor(30 + Math.random() * 20),
          status: cyclePosition > 0.5 && cyclePosition < 0.7 ? 'critical' : Math.random() > 0.6 ? 'busy' : 'normal',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          priority: 3
        },
        {
          id: 'outpatient',
          name: '외래진료',
          waitingPatients: Math.floor(20 + Math.random() * 30),
          avgWaitTime: Math.floor(15 + Math.random() * 15),
          staffOnDuty: Math.floor(12 + Math.random() * 5),
          roomUtilization: Math.floor(75 + Math.random() * 20),
          status: cyclePosition > 0.7 && cyclePosition < 0.9 ? 'critical' : Math.random() > 0.5 ? 'busy' : 'normal',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          priority: 4
        }
      ];

      setDepartments(deptData);

      // 시스템 건강도
      setSystemHealth({
        status: Math.random() > 0.95 ? 'degraded' : 'operational',
        uptime: (99.5 + Math.random() * 0.5).toFixed(2),
        responseTime: Math.floor(80 + Math.random() * 40),
        activeUsers: Math.floor(150 + Math.random() * 50)
      });
    };

    updateData();
    const interval = setInterval(updateData, 15000); // 15초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  // Status colors are now handled by CSS classes

  const getStatusBadge = (status) => {
    switch(status) {
      case 'critical': 
        return (
          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
            <XCircle className="w-2.5 h-2.5" />
            위험
          </span>
        );
      case 'busy': 
        return (
          <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" />
            혼잡
          </span>
        );
      case 'normal': 
        return (
          <span className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
            <CheckCircle className="w-2.5 h-2.5" />
            정상
          </span>
        );
      default: return null;
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3 text-red-500" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3 text-green-500" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  // 긴급도에 따라 정렬된 부서 목록
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      const statusOrder = { 'critical': 0, 'busy': 1, 'normal': 2 };
      // 먼저 상태로 정렬, 같은 상태면 priority로 정렬
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return (a.priority || 999) - (b.priority || 999);
    });
  }, [departments]);

  return (
    <div>
      {/* 부서별 실시간 현황 - 2열 그리드 */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">부서별 실시간 현황</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-gray-500">긴급</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-gray-500">혼잡</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-500">원활</span>
            </div>
          </div>
        </div>
        
        <div className="departments-grid grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedDepartments.map((dept, index) => (
            <div 
              key={dept.id} 
              className={`department-card border rounded-lg p-3 ${
                dept.status === 'critical' ? 'department-card-critical status-critical' : 
                dept.status === 'busy' ? 'status-busy' : 'status-normal'
              }`}
              style={{
                order: dept.status === 'critical' ? -1 : 
                       dept.status === 'busy' ? index : index + 10
              }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{dept.name}</h3>
                  {getStatusBadge(dept.status)}
                  {getTrendIcon(dept.trend)}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{dept.waitingPatients}명</p>
                  <p className="text-[10px] text-gray-600">대기중</p>
                </div>
              </div>

              {/* 지표 그리드 - 2x2 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-gray-600" />
                    <span className="text-[10px] text-gray-600">평균대기</span>
                  </div>
                  <p className="text-sm font-semibold">{dept.avgWaitTime}분</p>
                </div>
                
                <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-gray-600" />
                    <span className="text-[10px] text-gray-600">직원</span>
                  </div>
                  <p className="text-sm font-semibold">{dept.staffOnDuty}명</p>
                </div>

                {dept.bedOccupancy !== undefined && (
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-gray-600" />
                      <span className="text-[10px] text-gray-600">병상</span>
                    </div>
                    <p className="text-sm font-semibold">{dept.bedOccupancy}%</p>
                  </div>
                )}

                {dept.equipmentUtilization !== undefined && (
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-gray-600" />
                      <span className="text-[10px] text-gray-600">장비</span>
                    </div>
                    <p className="text-sm font-semibold">{dept.equipmentUtilization}%</p>
                  </div>
                )}

                {dept.pendingTests !== undefined && (
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-gray-600" />
                      <span className="text-[10px] text-gray-600">검사</span>
                    </div>
                    <p className="text-sm font-semibold">{dept.pendingTests}건</p>
                  </div>
                )}

                {dept.roomUtilization !== undefined && (
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-gray-600" />
                      <span className="text-[10px] text-gray-600">진료실</span>
                    </div>
                    <p className="text-sm font-semibold">{dept.roomUtilization}%</p>
                  </div>
                )}
              </div>

              {/* 액션 버튼 - 더 작게 */}
              {dept.status === 'critical' && (
                <div className="mt-2 flex gap-1">
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors">
                    인력요청
                  </button>
                  <button className="px-2 py-1 bg-white text-red-600 border border-red-300 rounded text-xs font-medium hover:bg-red-50 transition-colors">
                    환자분산
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperationalMonitor;