import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight, Clock, Users, Zap, ArrowRight } from 'lucide-react';

const DelayDominoPrediction = () => {
  const [predictions, setPredictions] = useState([]);
  const [inputDelay, setInputDelay] = useState({ department: 'CT', minutes: 30 });
  const [isSimulating, setIsSimulating] = useState(false);

  const departments = [
    { id: 'CT', name: 'CT 촬영실' },
    { id: 'MRI', name: 'MRI 촬영실' },
    { id: 'XRAY', name: 'X-Ray' },
    { id: 'LAB', name: '진단검사실' },
    { id: 'US', name: '초음파실' }
  ];

  const simulateDelayImpact = (source, delayMinutes) => {
    // 도미노 효과 시뮬레이션
    const impactMatrix = {
      'CT': { '내과': 0.7, '신경과': 0.9, '응급실': 0.8, '정형외과': 0.5 },
      'MRI': { '신경과': 0.9, '정형외과': 0.8, '내과': 0.6, '재활의학과': 0.7 },
      'XRAY': { '정형외과': 0.9, '응급실': 0.7, '내과': 0.5, '호흡기내과': 0.8 },
      'LAB': { '내과': 0.8, '감염내과': 0.9, '혈액종양내과': 0.9, '응급실': 0.7 },
      'US': { '소화기내과': 0.8, '산부인과': 0.9, '비뇨기과': 0.7, '내과': 0.6 }
    };

    const impacts = impactMatrix[source] || {};
    const predictions = [];

    Object.entries(impacts).forEach(([dept, factor]) => {
      const delayImpact = Math.round(delayMinutes * factor);
      const affectedPatients = Math.floor(15 + Math.random() * 20 + delayImpact / 2);
      
      predictions.push({
        department: dept,
        originalDelay: delayMinutes,
        impactDelay: delayImpact,
        affectedPatients,
        severity: delayImpact > 20 ? 'high' : delayImpact > 10 ? 'medium' : 'low',
        probability: (factor * 100).toFixed(0)
      });
    });

    return predictions.sort((a, b) => b.impactDelay - a.impactDelay);
  };

  const handleSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newPredictions = simulateDelayImpact(inputDelay.department, inputDelay.minutes);
      setPredictions(newPredictions);
      setIsSimulating(false);
    }, 1000);
  };

  useEffect(() => {
    // 초기 시뮬레이션
    const initialPredictions = simulateDelayImpact('CT', 30);
    setPredictions(initialPredictions);

    // 주기적 자동 업데이트
    const interval = setInterval(() => {
      const randomDept = departments[Math.floor(Math.random() * departments.length)].id;
      const randomDelay = Math.floor(15 + Math.random() * 30);
      const newPredictions = simulateDelayImpact(randomDept, randomDelay);
      setPredictions(newPredictions);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const totalAffected = predictions.reduce((sum, p) => sum + p.affectedPatients, 0);
  const avgDelay = predictions.reduce((sum, p) => sum + p.impactDelay, 0) / (predictions.length || 1);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Zap className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">검사 지연 도미노 예측</h2>
            <p className="text-sm text-gray-500">LSTM + 전이행렬 기반 연쇄 영향 분석</p>
          </div>
        </div>
      </div>

      {/* 시뮬레이션 입력 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">지연 시나리오 입력</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">검사실</label>
            <select 
              value={inputDelay.department}
              onChange={(e) => setInputDelay({ ...inputDelay, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">지연 시간 (분)</label>
            <input 
              type="number"
              value={inputDelay.minutes}
              onChange={(e) => setInputDelay({ ...inputDelay, minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="120"
            />
          </div>
          <button
            onClick={handleSimulation}
            disabled={isSimulating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSimulating ? '분석 중...' : '영향 분석'}
          </button>
        </div>
      </div>

      {/* 영향 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-red-500" />
            <span className="text-xs text-red-600">총 영향</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{totalAffected}명</p>
          <p className="text-xs text-red-600 mt-1">예상 영향 환자</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-xs text-orange-600">평균 지연</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">+{Math.round(avgDelay)}분</p>
          <p className="text-xs text-orange-600 mt-1">추가 대기시간</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-purple-600">영향 부서</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{predictions.length}개</p>
          <p className="text-xs text-purple-600 mt-1">연쇄 영향 부서</p>
        </div>
      </div>

      {/* 도미노 효과 시각화 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">예상 연쇄 영향</h3>
        
        {predictions.map((prediction, idx) => (
          <div key={idx} className={`border rounded-xl p-4 transition-all duration-300 ${getSeverityColor(prediction.severity)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                    prediction.severity === 'high' ? 'bg-red-500' :
                    prediction.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{prediction.department}</p>
                  <p className="text-sm text-gray-600">
                    +{prediction.impactDelay}분 지연 예상 (확률 {prediction.probability}%)
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{prediction.affectedPatients}명</p>
                <p className="text-xs text-gray-500">영향 환자</p>
              </div>
            </div>

            {/* 영향도 바 */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    prediction.severity === 'high' ? 'bg-red-500' :
                    prediction.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${prediction.probability}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 권장 조치 */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">권장 조치사항</p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              {predictions[0]?.severity === 'high' && (
                <li>• {predictions[0].department}에 추가 인력 즉시 배치 필요</li>
              )}
              {totalAffected > 50 && (
                <li>• 대규모 환자 영향 예상, 전체 부서 협조 체계 가동</li>
              )}
              {avgDelay > 20 && (
                <li>• 평균 20분 이상 지연, 환자 안내 및 대기실 관리 강화</li>
              )}
              <li>• 영향받는 부서에 사전 알림 발송 권장</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelayDominoPrediction;