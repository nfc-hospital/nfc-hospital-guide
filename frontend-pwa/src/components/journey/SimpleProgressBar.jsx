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
    if (patientState === 'FINISHED') return 'from-emerald-400 to-green-500';
    if (patientState === 'PAYMENT') return 'from-amber-400 to-orange-500';
    if (['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
      return 'from-blue-400 to-indigo-500';
    }
    return 'from-gray-300 to-gray-400';
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
    <div className={`bg-white rounded-2xl shadow-2xl p-10 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-gray-900">{getStatusText()}</h3>
          <div className="text-right">
            <span className={`text-4xl font-black bg-gradient-to-r ${getProgressColor()} 
                           bg-clip-text text-transparent`}>
              {getProgressText()}
            </span>
            <p className="text-sm text-gray-500 mt-1 font-medium">진행률</p>
          </div>
        </div>
      )}
      
      <div className="relative">
        {/* 배경 바 - 더 부드럽게 */}
        <div className="w-full h-14 bg-gray-100 rounded-full overflow-hidden">
          {/* 진행 바 */}
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full 
                       transition-all duration-1000 ease-out
                       relative overflow-hidden`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {/* 윤기나는 효과 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
            {/* 움직이는 광택 효과 */}
            <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                         -skew-x-12 animate-shimmer"></div>
          </div>
        </div>
        
        {/* 주요 단계 표시 (점) - 더 세련되게 */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-3">
          {[0, 2, 6, 8].map((stepIndex) => (
            <div
              key={stepIndex}
              className={`transition-all duration-500 ${
                currentStateIndex >= stepIndex 
                  ? 'w-8 h-8 bg-white shadow-xl scale-110 border-2 border-white' 
                  : 'w-6 h-6 bg-white/70 shadow-md'
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
        <div className="mt-8 flex justify-between px-2">
          <span className={`${currentStateIndex === 0 || currentStateIndex === 1 
            ? 'text-indigo-600 font-bold text-xl scale-110' 
            : 'text-gray-400 font-medium text-lg'} 
            transition-all duration-500 transform`}>
            도착
          </span>
          <span className={`${currentStateIndex === 2 || currentStateIndex === 3 
            ? 'text-indigo-600 font-bold text-xl scale-110' 
            : 'text-gray-400 font-medium text-lg'} 
            transition-all duration-500 transform`}>
            접수
          </span>
          <span className={`${currentStateIndex >= 4 && currentStateIndex <= 6 
            ? 'text-indigo-600 font-bold text-xl scale-110' 
            : 'text-gray-400 font-medium text-lg'} 
            transition-all duration-500 transform`}>
            검사
          </span>
          <span className={`${currentStateIndex === 7 
            ? 'text-orange-500 font-bold text-xl scale-110' 
            : 'text-gray-400 font-medium text-lg'} 
            transition-all duration-500 transform`}>
            수납
          </span>
          <span className={`${currentStateIndex === 8 
            ? 'text-emerald-500 font-bold text-xl scale-110' 
            : 'text-gray-400 font-medium text-lg'} 
            transition-all duration-500 transform`}>
            완료
          </span>
        </div>
      )}
    </div>
  );
}