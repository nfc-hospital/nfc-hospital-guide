import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, 
  Brain, Zap, Clock, Users, Activity, ArrowRight,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

const AIInsights = () => {
  const [insights, setInsights] = useState([]);
  const [animatedIndex, setAnimatedIndex] = useState(-1);
  const [criticalAlert, setCriticalAlert] = useState(null);

  useEffect(() => {
    // 실시간 AI 인사이트 생성
    const generateInsights = () => {
      const currentTime = new Date('2025-08-25T14:00:00');
      const hour = currentTime.getHours();
      
      const newInsights = [
        {
          id: 1,
          type: 'congestion',
          severity: 'high',
          title: '영상의학과 대기 증가 감지',
          description: '현재 대기 환자 수가 평균 대비 45% 증가했습니다.',
          currentWait: 32,
          averageWait: 22,
          impact: '대기시간 약 15분 추가 예상',
          recommendation: 'CT-2번실 추가 운영 검토',
          icon: <AlertTriangle className="w-5 h-5" />,
          trend: 'up'
        },
        {
          id: 2,
          type: 'pattern',
          severity: 'medium',
          title: '내과 오후 시간대 패턴 감지',
          description: '매주 월요일 14:00-16:00 대기 환자 증가 패턴',
          patternStrength: 78,
          impact: '평균 대기시간 20분 증가',
          recommendation: '해당 시간대 의료진 1명 추가 배치 권장',
          icon: <Activity className="w-5 h-5" />,
          trend: 'neutral'
        },
        {
          id: 3,
          type: 'efficiency',
          severity: 'low',
          title: '진단검사의학과 처리 시간 개선',
          description: '채혈실 평균 처리 시간이 5분에서 3분으로 단축',
          improvement: 40,
          impact: '대기 환자 3명 감소',
          recommendation: '현재 프로세스 유지',
          icon: <TrendingUp className="w-5 h-5" />,
          trend: 'down'
        },
        {
          id: 4,
          type: 'queue',
          severity: 'medium',
          title: '정형외과 순번 대기 초과',
          description: '현재 대기 순번이 20번을 초과했습니다.',
          currentQueue: 23,
          averageQueue: 12,
          impact: '예상 대기시간 60분',
          recommendation: '대기 환자 안내 강화',
          icon: <Users className="w-5 h-5" />,
          trend: 'up'
        }
      ];

      setInsights(newInsights);
      
      // 중요 알림 설정
      const critical = newInsights.find(i => i.severity === 'high');
      if (critical) {
        setCriticalAlert(critical);
      }
    };

    generateInsights();
    const interval = setInterval(() => {
      generateInsights();
      // 순차적 애니메이션
      setAnimatedIndex(prev => (prev + 1) % 4);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'high': return <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full font-bold">긴급</span>;
      case 'medium': return <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full font-bold">주의</span>;
      case 'low': return <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-bold">정보</span>;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI 실시간 인사이트</h2>
            <p className="text-sm text-gray-500">머신러닝 기반 운영 최적화 제안</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">실시간 분석 중</span>
          </div>
        </div>
      </div>

      {/* 중요 알림 배너 */}
      {criticalAlert && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{criticalAlert.title}</p>
              <p className="text-sm opacity-90 mt-1">{criticalAlert.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                  정확도: {criticalAlert.accuracy}%
                </span>
                <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                  발생까지: {criticalAlert.timeToEvent}
                </span>
              </div>
            </div>
            <button className="px-3 py-1 bg-white text-red-600 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
              대응
            </button>
          </div>
        </div>
      )}

      {/* 인사이트 카드 */}
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div 
            key={insight.id}
            className={`border-2 rounded-xl p-4 transition-all duration-500 ${
              getSeverityColor(insight.severity)
            } ${animatedIndex === index ? 'scale-[1.02] shadow-lg' : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* 아이콘 */}
              <div className={`p-2 rounded-lg ${
                insight.severity === 'high' ? 'bg-red-200' :
                insight.severity === 'medium' ? 'bg-yellow-200' :
                'bg-green-200'
              }`}>
                {insight.icon}
              </div>

              {/* 내용 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{insight.title}</h3>
                      {getSeverityBadge(insight.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                  {/* 트렌드 표시 */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                    insight.trend === 'up' ? 'bg-red-100 text-red-600' :
                    insight.trend === 'down' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {insight.trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
                     insight.trend === 'down' ? <TrendingDown className="w-4 h-4" /> :
                     <Activity className="w-4 h-4" />}
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {insight.currentWait && (
                    <span className="text-gray-600">
                      현재: <span className="font-bold text-gray-900">{insight.currentWait}명</span>
                    </span>
                  )}
                  {insight.averageWait && (
                    <span className="text-gray-600">
                      평균: <span className="font-bold text-gray-900">{insight.averageWait}명</span>
                    </span>
                  )}
                  {insight.currentQueue && (
                    <span className="text-gray-600">
                      대기번호: <span className="font-bold text-gray-900">{insight.currentQueue}번</span>
                    </span>
                  )}
                  {insight.patternStrength && (
                    <span className="text-gray-600">
                      패턴 강도: <span className="font-bold text-gray-900">{insight.patternStrength}%</span>
                    </span>
                  )}
                  {insight.improvement && (
                    <span className="text-gray-600">
                      개선율: <span className="font-bold text-green-600">{insight.improvement}%</span>
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-600">{insight.impact}</p>
                </div>

                {/* 권장사항 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">권장 조치</p>
                      <p className="text-xs text-blue-700 mt-1">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* 추가 메트릭 */}
                {(insight.affectedPatients || insight.reason) && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {insight.affectedPatients && (
                      <span>영향받는 환자: {insight.affectedPatients}명</span>
                    )}
                    {insight.reason && (
                      <span>원인: {insight.reason}</span>
                    )}
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <button className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors group">
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 통계 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">12</p>
            <p className="text-xs text-gray-500">오늘 감지된 패턴</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">8</p>
            <p className="text-xs text-gray-500">개선 제안</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">23분</p>
            <p className="text-xs text-gray-500">평균 대기시간</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">156명</p>
            <p className="text-xs text-gray-500">현재 대기 환자</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;