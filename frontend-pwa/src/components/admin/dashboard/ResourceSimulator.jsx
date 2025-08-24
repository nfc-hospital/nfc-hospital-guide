import React, { useState } from 'react';
import { Calculator, Users, Clock, TrendingDown, TrendingUp, Cpu } from 'lucide-react';

const ResourceSimulator = () => {
  const [scenarios, setScenarios] = useState([
    { id: 1, name: '인력 +1명', type: 'staff', value: 1, impact: null },
    { id: 2, name: '처리율 +10%', type: 'efficiency', value: 10, impact: null },
    { id: 3, name: '장비 추가', type: 'equipment', value: 1, impact: null }
  ]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateScenario = (scenario) => {
    setIsSimulating(true);
    setActiveScenario(scenario.id);

    setTimeout(() => {
      // 시나리오별 영향 계산
      let waitReduction, throughputIncrease;
      
      switch (scenario.type) {
        case 'staff':
          waitReduction = 15 + Math.random() * 10;
          throughputIncrease = 8 + Math.random() * 7;
          break;
        case 'efficiency':
          waitReduction = scenario.value * 1.5 + Math.random() * 5;
          throughputIncrease = scenario.value * 1.2 + Math.random() * 5;
          break;
        case 'equipment':
          waitReduction = 20 + Math.random() * 10;
          throughputIncrease = 12 + Math.random() * 8;
          break;
        default:
          waitReduction = 10;
          throughputIncrease = 10;
      }

      const impact = {
        waitTimeReduction: Math.round(waitReduction),
        throughputIncrease: Math.round(throughputIncrease),
        patientSatisfaction: Math.round(waitReduction * 0.8 + Math.random() * 5),
        costEfficiency: Math.round(100 - (waitReduction + throughputIncrease) / 2),
        implementationTime: scenario.type === 'staff' ? '1주' : scenario.type === 'equipment' ? '2주' : '즉시'
      };

      setScenarios(prev => prev.map(s => 
        s.id === scenario.id ? { ...s, impact } : s
      ));
      
      setIsSimulating(false);
      setActiveScenario(null);
    }, 1500);
  };

  const addCustomScenario = () => {
    const newScenario = {
      id: scenarios.length + 1,
      name: '커스텀 시나리오',
      type: 'custom',
      value: 5,
      impact: null
    };
    setScenarios([...scenarios, newScenario]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Calculator className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">자원 배치 시뮬레이터</h2>
            <p className="text-sm text-gray-500">가정 시나리오 기반 효과 예측</p>
          </div>
        </div>
        <button
          onClick={addCustomScenario}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + 시나리오 추가
        </button>
      </div>

      {/* 시나리오 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scenarios.map(scenario => (
          <div key={scenario.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  scenario.type === 'staff' ? 'bg-blue-100' :
                  scenario.type === 'efficiency' ? 'bg-green-100' :
                  scenario.type === 'equipment' ? 'bg-purple-100' :
                  'bg-gray-100'
                }`}>
                  {scenario.type === 'staff' ? <Users className="w-5 h-5 text-blue-600" /> :
                   scenario.type === 'efficiency' ? <TrendingUp className="w-5 h-5 text-green-600" /> :
                   scenario.type === 'equipment' ? <Cpu className="w-5 h-5 text-purple-600" /> :
                   <Calculator className="w-5 h-5 text-gray-600" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{scenario.name}</p>
                  <p className="text-xs text-gray-500">
                    {scenario.type === 'staff' ? '인력 증원' :
                     scenario.type === 'efficiency' ? '효율성 개선' :
                     scenario.type === 'equipment' ? '장비 추가' : '커스텀'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => simulateScenario(scenario)}
                disabled={isSimulating && activeScenario === scenario.id}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {isSimulating && activeScenario === scenario.id ? '분석 중...' : '시뮬레이션'}
              </button>
            </div>

            {/* 영향 결과 */}
            {scenario.impact && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">대기시간</span>
                    </div>
                    <p className="text-lg font-bold text-green-900">-{scenario.impact.waitTimeReduction}%</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-blue-600">처리량</span>
                    </div>
                    <p className="text-lg font-bold text-blue-900">+{scenario.impact.throughputIncrease}%</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">환자 만족도</span>
                    <span className="font-medium text-gray-900">+{scenario.impact.patientSatisfaction}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-gray-600">비용 효율성</span>
                    <span className="font-medium text-gray-900">{scenario.impact.costEfficiency}점</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-gray-600">구현 소요</span>
                    <span className="font-medium text-gray-900">{scenario.impact.implementationTime}</span>
                  </div>
                </div>

                {/* 효과 시각화 바 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16">대기감소</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${scenario.impact.waitTimeReduction * 2}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16">처리증가</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${scenario.impact.throughputIncrease * 2}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 최적 조합 제안 */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">AI 추천 최적 조합</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">인력 +1명 + 프로세스 개선 10%</p>
              <p className="text-xs text-gray-600">예상 효과: 대기 -32%, 처리량 +28%</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium">
            상세 분석
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceSimulator;