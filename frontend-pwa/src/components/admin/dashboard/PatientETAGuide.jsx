import React, { useState, useEffect } from 'react';
import { Search, User, Clock, MapPin, Activity, ChevronRight, RefreshCw } from 'lucide-react';

const PatientETAGuide = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 모의 환자 데이터 생성
  useEffect(() => {
    const generatePatients = () => {
      const names = ['김철수', '이영희', '박민수', '정지영', '최동훈', '한서연', '임재현', '윤미래'];
      const currentSteps = ['접수', '내과 진료', 'CT 촬영', '혈액검사', 'X-Ray', '결과 대기', '수납'];
      
      const mockPatients = names.map((name, idx) => {
        const totalSteps = 4 + Math.floor(Math.random() * 3);
        const currentStepIndex = Math.floor(Math.random() * totalSteps);
        const steps = [];
        
        // 검사 단계 생성
        for (let i = 0; i < totalSteps; i++) {
          const stepTypes = ['접수', '진료', 'CT', 'MRI', 'X-Ray', '혈액검사', '초음파', '결과확인', '수납'];
          steps.push({
            name: stepTypes[i] || `검사 ${i}`,
            status: i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'current' : 'pending',
            estimatedTime: 10 + Math.floor(Math.random() * 20),
            actualTime: i < currentStepIndex ? 8 + Math.floor(Math.random() * 15) : null
          });
        }

        const completedTime = steps
          .filter(s => s.status === 'completed')
          .reduce((sum, s) => sum + (s.actualTime || 0), 0);
        
        const remainingTime = steps
          .filter(s => s.status !== 'completed')
          .reduce((sum, s) => sum + s.estimatedTime, 0);

        return {
          id: `P${1000 + idx}`,
          name: name,
          patientId: `2025${String(idx + 1).padStart(4, '0')}`,
          currentLocation: currentSteps[Math.floor(Math.random() * currentSteps.length)],
          currentStep: currentStepIndex + 1,
          totalSteps: totalSteps,
          steps: steps,
          completedTime: completedTime,
          remainingTimeP50: remainingTime,
          remainingTimeP90: Math.round(remainingTime * 1.3),
          status: currentStepIndex === totalSteps - 1 ? 'finishing' : 'in_progress',
          startTime: new Date(Date.now() - completedTime * 60000).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };
      });

      setPatients(mockPatients);
    };

    generatePatients();
    const interval = setInterval(generatePatients, 20000); // 20초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      const found = patients.find(p => 
        p.name.includes(searchQuery) || 
        p.patientId.includes(searchQuery)
      );
      setSelectedPatient(found || null);
      setIsSearching(false);
    }, 500);
  };

  const getProgressPercentage = (patient) => {
    if (!patient) return 0;
    return Math.round((patient.currentStep / patient.totalSteps) * 100);
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'current': return 'bg-blue-500 text-white animate-pulse';
      default: return 'bg-gray-200 text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 rounded-xl">
            <User className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">개인 ETA 안내</h2>
            <p className="text-sm text-gray-500">환자별 예상 소요시간 조회</p>
          </div>
        </div>
      </div>

      {/* 검색 바 - 개선된 디자인 */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-blue-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="환자명 또는 환자번호로 검색..."
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all disabled:opacity-50 font-semibold shadow-lg"
          >
            {isSearching ? '검색 중...' : '검색'}
          </button>
        </div>
      </div>

      {/* 레이아웃 변경 - 선택된 환자와 목록을 나란히 표시 */}
      <div className={selectedPatient ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
        
        {/* 선택된 환자 정보 - 왼쪽 */}
        {selectedPatient && (
          <div className="space-y-4">
          {/* 환자 기본 정보 */}
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{selectedPatient.name}</p>
                  <p className="text-sm text-gray-600">환자번호: {selectedPatient.patientId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">현재 위치</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedPatient.currentLocation}</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">진행 단계</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedPatient.currentStep}/{selectedPatient.totalSteps}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">시작 시간</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedPatient.startTime}</p>
              </div>
            </div>
          </div>

          {/* 진행 상태 바 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">전체 진행률</span>
              <span className="font-medium text-gray-900">{getProgressPercentage(selectedPatient)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-teal-400 transition-all duration-500"
                style={{ width: `${getProgressPercentage(selectedPatient)}%` }}
              />
            </div>
          </div>

          {/* 단계별 상세 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">검사 진행 상황</h3>
            <div className="space-y-2">
              {selectedPatient.steps.map((step, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${
                  step.status === 'current' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getStepColor(step.status)}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{step.name}</p>
                    <p className="text-xs text-gray-500">
                      {step.status === 'completed' 
                        ? `완료 (${step.actualTime}분 소요)`
                        : step.status === 'current'
                        ? `진행 중 (예상 ${step.estimatedTime}분)`
                        : `대기 중 (예상 ${step.estimatedTime}분)`}
                    </p>
                  </div>
                  {step.status === 'current' && (
                    <div className="animate-pulse">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 예상 소요시간 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">예상 소요시간</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">남은 시간 (P50)</p>
                <p className="text-2xl font-bold text-green-700">
                  약 {selectedPatient.remainingTimeP50}분
                </p>
                <p className="text-xs text-gray-500 mt-1">일반적인 예상 시간</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">최대 소요 (P90)</p>
                <p className="text-2xl font-bold text-orange-700">
                  최대 {selectedPatient.remainingTimeP90}분
                </p>
                <p className="text-xs text-gray-500 mt-1">지연 시 예상 시간</p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">예상 완료 시각</span>
                <span className="font-medium text-gray-900">
                  {new Date(Date.now() + selectedPatient.remainingTimeP50 * 60000).toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>
          </div>
        )}
        
        {/* 실시간 대기 환자 목록 - 오른쪽 (항상 표시) */}
        <div className={selectedPatient ? "" : "mb-6"}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">실시간 대기 환자</h3>
          <div className={`grid ${selectedPatient ? 'grid-cols-1 gap-2' : 'grid-cols-2 xl:grid-cols-4 gap-3'}`}>
            {patients.slice(0, selectedPatient ? 12 : 8).map(patient => {
              const progressPercent = (patient.currentStep / patient.totalSteps * 100).toFixed(0);
              const isSelected = selectedPatient && selectedPatient.id === patient.id;
              
              return (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`text-left p-3 bg-white border rounded-xl hover:shadow-lg transition-all group ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-bold ${isSelected ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                        {patient.name}
                      </p>
                      <p className="text-xs text-gray-500">{patient.patientId}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-colors ${
                      isSelected ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                    }`} />
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">진행률</span>
                      <span className="font-semibold text-blue-600">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-teal-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">현재: {patient.currentLocation}</p>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* 선택된 환자가 있을 때 스크롤 안내 */}
          {selectedPatient && patients.length > 12 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              더 많은 환자를 보려면 스크롤하세요
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientETAGuide;