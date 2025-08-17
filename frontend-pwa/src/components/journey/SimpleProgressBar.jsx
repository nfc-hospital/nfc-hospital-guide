import React from 'react';

/**
 * SimpleProgressBar - 환자의 전체 여정 진행도를 보여주는 단순한 진행률 바
 * 
 * @param {string} patientState - 환자의 9단계 상태
 * @param {Array} appointments - 오늘의 예약 목록 (선택적)
 * @param {boolean} showLabel - 라벨 표시 여부 (기본값: true)
 * @param {string} className - 추가 CSS 클래스
 */
export default function SimpleProgressBar({ patientState, appointments, showLabel = true, className = '' }) {
  // 9단계 여정 정의
  const PATIENT_JOURNEY_STATES = [
    'UNREGISTERED',  // 1. 병원 도착 전
    'ARRIVED',       // 2. 병원 도착
    'REGISTERED',    // 3. 접수 완료
    'WAITING',       // 4. 대기 중
    'CALLED',        // 5. 호출됨
    'ONGOING',       // 6. 진행 중
    'COMPLETED',     // 7. 완료
    'PAYMENT',       // 8. 수납
    'FINISHED'       // 9. 귀가
  ];

  // 현재 상태의 인덱스 찾기
  const currentStateIndex = PATIENT_JOURNEY_STATES.indexOf(patientState);
  const totalSteps = PATIENT_JOURNEY_STATES.length;
  
  // 기본 진행률 계산 (9단계 기준)
  let progressPercentage = ((currentStateIndex + 1) / totalSteps) * 100;
  
  // appointments가 있고 WAITING~COMPLETED 상태인 경우 더 세밀한 진행률 계산
  if (appointments && appointments.length > 0 && 
      ['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
    
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const totalAppointments = appointments.length;
    
    // 검사 진행 단계는 전체의 3/9 ~ 7/9를 차지 (WAITING부터 COMPLETED까지)
    const examProgressStart = 3 / totalSteps; // WAITING 시작점
    const examProgressEnd = 7 / totalSteps;   // COMPLETED 끝점
    const examProgressRange = examProgressEnd - examProgressStart;
    
    // 검사 진행률을 반영한 전체 진행률
    const examProgress = completedAppointments / totalAppointments;
    progressPercentage = (examProgressStart + (examProgress * examProgressRange)) * 100;
  }

  // 상태별 색상 결정
  const getProgressColor = () => {
    if (patientState === 'FINISHED') return 'from-green-500 to-green-600';
    if (patientState === 'PAYMENT') return 'from-amber-500 to-amber-600';
    if (['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
      return 'from-blue-500 to-blue-600';
    }
    return 'from-gray-400 to-gray-500';
  };

  // 현재 상태 텍스트
  const getStatusText = () => {
    const stateTexts = {
      'UNREGISTERED': '병원 도착 전',
      'ARRIVED': '병원 도착',
      'REGISTERED': '접수 완료',
      'WAITING': '검사 대기 중',
      'CALLED': '호출됨',
      'ONGOING': '검사 진행 중',
      'COMPLETED': '검사 완료',
      'PAYMENT': '수납 중',
      'FINISHED': '모든 일정 완료'
    };
    
    return stateTexts[patientState] || '진행 중';
  };

  // 진행률 텍스트
  const getProgressText = () => {
    if (patientState === 'FINISHED') return '100%';
    if (appointments && ['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
      const completed = appointments.filter(apt => apt.status === 'completed').length;
      return `${completed}/${appointments.length} 검사`;
    }
    return `${Math.round(progressPercentage)}%`;
  };

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border-2 border-gray-200 p-8 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{getStatusText()}</h3>
          <span className={`text-3xl font-extrabold bg-gradient-to-r ${getProgressColor()} 
                         bg-clip-text text-transparent`}>
            {getProgressText()}
          </span>
        </div>
      )}
      
      <div className="relative">
        {/* 배경 바 */}
        <div className="w-full h-12 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          {/* 진행 바 */}
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full 
                       transition-all duration-1000 ease-out shadow-lg
                       relative overflow-hidden`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {/* 글로우 효과 */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-transparent"></div>
            {/* 움직이는 빛 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent 
                         animate-pulse"></div>
          </div>
        </div>
        
        {/* 주요 단계 표시 (점) - 더 크게 */}
        <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-2">
          {[0, 2, 6, 8].map((stepIndex) => (
            <div
              key={stepIndex}
              className={`transition-all duration-500 ${
                currentStateIndex >= stepIndex 
                  ? 'w-6 h-6 bg-white shadow-lg scale-125 ring-4 ring-white/50' 
                  : 'w-4 h-4 bg-gray-300 shadow-sm'
              } rounded-full`}
              style={{
                position: 'absolute',
                left: `${(stepIndex / (totalSteps - 1)) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
          ))}
        </div>
        
      </div>
      
      {/* 단계 라벨 (선택적) - 현재 단계만 색상 강조 */}
      {showLabel && (
        <div className="mt-6 flex justify-between text-lg font-medium">
          <span className={`${currentStateIndex === 0 || currentStateIndex === 1 ? 'text-blue-600 font-bold text-xl' : 'text-gray-600'} 
                         transition-all duration-300`}>
            도착
          </span>
          <span className={`${currentStateIndex === 2 || currentStateIndex === 3 ? 'text-blue-600 font-bold text-xl' : 'text-gray-600'} 
                         transition-all duration-300`}>
            접수
          </span>
          <span className={`${currentStateIndex >= 4 && currentStateIndex <= 6 ? 'text-blue-600 font-bold text-xl' : 'text-gray-600'} 
                         transition-all duration-300`}>
            검사
          </span>
          <span className={`${currentStateIndex === 7 ? 'text-amber-600 font-bold text-xl' : 'text-gray-600'} 
                         transition-all duration-300`}>
            수납
          </span>
          <span className={`${currentStateIndex === 8 ? 'text-green-600 font-bold text-xl' : 'text-gray-600'} 
                         transition-all duration-300`}>
            완료
          </span>
        </div>
      )}
    </div>
  );
}