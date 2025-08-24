import React, { useState, useEffect } from 'react';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, TrendingUp, Award, Target } from 'lucide-react';

const ResourceEfficiencyScore = () => {
  const [scores, setScores] = useState([]);
  const [overallScore, setOverallScore] = useState(0);
  const [radarData, setRadarData] = useState([]);

  useEffect(() => {
    const generateScores = () => {
      const currentHour = new Date().getHours();
      const timeModifier = Math.sin((currentHour - 6) / 12 * Math.PI) * 0.2;
      
      const departments = [
        { name: '영상의학과', baseUtilization: 0.75, baseSatisfaction: 0.80 },
        { name: '진단검사의학과', baseUtilization: 0.85, baseSatisfaction: 0.75 },
        { name: '내과', baseUtilization: 0.70, baseSatisfaction: 0.85 },
        { name: '정형외과', baseUtilization: 0.80, baseSatisfaction: 0.70 },
        { name: '응급실', baseUtilization: 0.90, baseSatisfaction: 0.65 }
      ];

      const newScores = departments.map(dept => {
        const utilization = Math.min(1, Math.max(0, 
          dept.baseUtilization + timeModifier + (Math.random() - 0.5) * 0.1
        ));
        const satisfaction = Math.min(1, Math.max(0,
          dept.baseSatisfaction - (utilization > 0.85 ? 0.1 : 0) + (Math.random() - 0.5) * 0.1
        ));
        const score = Math.round((utilization * 0.6 + satisfaction * 0.4) * 100);

        return {
          department: dept.name,
          utilization: Math.round(utilization * 100),
          satisfaction: Math.round(satisfaction * 100),
          score,
          trend: Math.random() > 0.5 ? 'up' : 'down',
          trendValue: (Math.random() * 5).toFixed(1)
        };
      });

      // Radar chart data
      const newRadarData = [
        { metric: '가동률', value: newScores.reduce((sum, s) => sum + s.utilization, 0) / newScores.length },
        { metric: '환자만족도', value: newScores.reduce((sum, s) => sum + s.satisfaction, 0) / newScores.length },
        { metric: '대기시간', value: 85 - Math.random() * 10 },
        { metric: '처리량', value: 75 + Math.random() * 15 },
        { metric: '자원활용', value: 80 + Math.random() * 10 },
        { metric: '효율성', value: newScores.reduce((sum, s) => sum + s.score, 0) / newScores.length }
      ];

      const overall = Math.round(newScores.reduce((sum, s) => sum + s.score, 0) / newScores.length);

      setScores(newScores);
      setRadarData(newRadarData);
      setOverallScore(overall);
    };

    generateScores();
    const interval = setInterval(generateScores, 6000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-xl">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">자원 효율성 스코어</h2>
            <p className="text-sm text-gray-500">가동률 × 환자 경험 기반 종합 평가</p>
          </div>
        </div>
        
        {/* 전체 점수 */}
        <div className={`px-6 py-3 rounded-xl ${getScoreColor(overallScore)}`}>
          <div className="text-center">
            <p className="text-3xl font-bold">{overallScore}</p>
            <p className="text-xs font-medium">종합 점수</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 부서별 점수 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">부서별 효율성 점수</h3>
          <div className="space-y-3">
            {scores.map((score, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{score.department}</span>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.score)}`}>
                      {getScoreGrade(score.score)}
                    </div>
                    <span className="text-lg font-bold text-gray-900">{score.score}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">가동률:</span>
                    <span className="font-medium text-gray-700">{score.utilization}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">만족도:</span>
                    <span className="font-medium text-gray-700">{score.satisfaction}%</span>
                  </div>
                </div>

                {/* 진행 바 */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      score.score >= 85 ? 'bg-green-500' :
                      score.score >= 70 ? 'bg-blue-500' :
                      score.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 레이더 차트 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">종합 성과 지표</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar 
                name="효율성" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.5}
                strokeWidth={2}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 부서 비교 차트 */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">부서별 비교</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={scores}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ResourceEfficiencyScore;