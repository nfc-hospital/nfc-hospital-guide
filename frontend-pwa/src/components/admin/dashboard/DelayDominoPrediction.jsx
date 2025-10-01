import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight, Clock, Users, Zap, ArrowRight, Loader } from 'lucide-react';
import apiService from '../../../api/apiService';

const DelayDominoPrediction = () => {
  const [predictions, setPredictions] = useState([]);
  const [inputDelay, setInputDelay] = useState({ department: 'CT실', minutes: 30 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const departments = [
    { id: 'CT실', name: 'CT 촬영실' },
    { id: 'MRI실', name: 'MRI 촬영실' },
    { id: 'X-ray실', name: 'X-Ray' },
    { id: '진단검사의학과', name: '진단검사실' },
    { id: '초음파실', name: '초음파실' }
  ];

  const fetchDominoPredictions = async (sourceDept, delayMinutes) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Domino API 호출 시작:', { sourceDept, delayMinutes });

      const response = await apiService.analytics.getDominoPredictions({
        source_department: sourceDept,
        delay_minutes: delayMinutes
      });

      console.log('✅ Domino API 응답 받음:', response);
      console.log('응답 타입:', typeof response);
      console.log('응답 키:', response ? Object.keys(response) : 'null');
      console.log('response.success:', response?.success);
      console.log('response.data:', response?.data);
      console.log('data 타입:', Array.isArray(response?.data));

      // Backend 응답 구조 확인
      // Case 1: { success: true, data: [...] } - 배열 직접
      // Case 2: { success: true, data: { impacts: [...] } } - 객체로 감싸짐
      const actualData = Array.isArray(response.data)
        ? response.data
        : response.data?.impacts || response.data?.data || [];

      if (response && response.success && Array.isArray(actualData) && actualData.length > 0) {
        // API 응답 데이터를 컴포넌트의 형식에 맞게 변환
        console.log('📊 데이터 변환 시작, 배열 길이:', actualData.length);
        const formattedPredictions = actualData.map(pred => ({
          department: pred.department,
          originalDelay: pred.original_delay,
          impactDelay: pred.impact_delay,
          affectedPatients: pred.affected_patients,
          severity: pred.severity,
          probability: String(pred.probability)
        }));

        console.log('✅ 변환 완료:', formattedPredictions);
        setPredictions(formattedPredictions);
        setLastUpdate(new Date());
      } else {
        console.error('❌ 응답 형식 오류:', response);
        throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      }
    } catch (err) {
      console.error('❌ Domino predictions 실패:', err);
      console.error('에러 타입:', typeof err);
      console.error('에러 상세:', {
        message: err?.message || 'No message',
        response: err?.response?.data || 'No response data',
        status: err?.response?.status || 'No status',
        isAxiosError: err?.isAxiosError,
        fullError: err
      });

      if (err?.response) {
        console.error('전체 응답:', err.response);
      }

      setError(`예측 데이터 로드 실패: ${err?.message || 'Unknown error'}`);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulation = () => {
    fetchDominoPredictions(inputDelay.department, inputDelay.minutes);
  };

  useEffect(() => {
    // 초기 데이터 로드
    fetchDominoPredictions('CT실', 30);

    // 주기적 업데이트 (실제 데이터 기반, 30초마다)
    const interval = setInterval(() => {
      // 현재 입력값 기준으로 재조회
      fetchDominoPredictions(inputDelay.department, inputDelay.minutes);
    }, 30000);

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
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '분석 중...' : '영향 분석'}
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">예상 연쇄 영향</h3>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              마지막 업데이트: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {error ? (
          <div className="text-center py-4 text-red-600">
            {error}
          </div>
        ) : isLoading ? (
          <div className="text-center py-4">
            <Loader className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">데이터를 불러오는 중...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            예측 데이터가 없습니다.
          </div>
        ) : (
          predictions.map((prediction, idx) => (
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
          ))
        )}
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