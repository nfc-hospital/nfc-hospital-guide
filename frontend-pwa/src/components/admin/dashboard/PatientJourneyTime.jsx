import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Clock, TrendingUp, TrendingDown, Users } from 'lucide-react';

const PatientJourneyTime = () => {
  const [data, setData] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [stats, setStats] = useState({
    average: 0,
    min: 0,
    max: 0,
    trend: 0
  });

  // 실시간 데이터 시뮬레이션
  useEffect(() => {
    const generateData = () => {
      const currentHour = new Date().getHours();
      const baseTime = 45 + Math.sin(currentHour / 24 * Math.PI * 2) * 15;
      
      // 부서별 평균 소요시간
      const departments = ['내과', '정형외과', '영상의학과', '진단검사의학과', '응급실'];
      const newData = departments.map(dept => ({
        department: dept,
        average: baseTime + Math.random() * 20 - 10,
        min: baseTime - 15 + Math.random() * 5,
        max: baseTime + 25 + Math.random() * 10,
        patients: Math.floor(20 + Math.random() * 30)
      }));

      // 시간대별 분포
      const newDistribution = Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        duration: 40 + Math.sin(i / 24 * Math.PI * 2) * 20 + Math.random() * 5,
        count: Math.floor(10 + Math.sin(i / 24 * Math.PI * 2) * 8 + Math.random() * 3)
      }));

      const avgTime = newData.reduce((sum, d) => sum + d.average, 0) / newData.length;
      
      setData(newData);
      setDistribution(newDistribution);
      setStats(prev => ({
        average: Math.round(avgTime),
        min: Math.round(Math.min(...newData.map(d => d.min))),
        max: Math.round(Math.max(...newData.map(d => d.max))),
        trend: prev.average ? ((avgTime - prev.average) / prev.average * 100).toFixed(1) : '0'
      }));
    };

    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">환자 여정 평균 소요시간</h2>
            <p className="text-sm text-gray-500">EMR 기준 전체 소요시간 분석</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.trend > 0 ? (
            <TrendingUp className="w-5 h-5 text-red-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-green-500" />
          )}
          <span className={`text-sm font-medium ${stats.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.trend > 0 ? '+' : ''}{stats.trend}%
          </span>
        </div>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-600 mb-1">평균 소요시간</p>
          <p className="text-2xl font-bold text-blue-900">{stats.average}분</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
          <p className="text-sm text-green-600 mb-1">최소 소요시간</p>
          <p className="text-2xl font-bold text-green-900">{stats.min}분</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
          <p className="text-sm text-orange-600 mb-1">최대 소요시간</p>
          <p className="text-2xl font-bold text-orange-900">{stats.max}분</p>
        </div>
      </div>

      {/* 부서별 소요시간 바 차트 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">부서별 평균 소요시간</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="department" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Bar dataKey="average" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="min" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="max" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 시간대별 분포 그래프 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">시간대별 소요시간 분포</h3>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="duration" 
              stroke="#8b5cf6" 
              fill="url(#colorDuration)" 
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientJourneyTime;