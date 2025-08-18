import React from 'react';
import useJourneyStore from '../../store/journeyStore';

export default function UnifiedHeader({ currentState }) {
  const { user, todaysAppointments } = useJourneyStore();
  const patientState = currentState || user?.state || 'UNREGISTERED';
  
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
  if (todaysAppointments && todaysAppointments.length > 0 && 
      ['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
    
    const completedAppointments = todaysAppointments.filter(apt => apt.status === 'completed').length;
    const totalAppointments = todaysAppointments.length;
    
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

  // 현재 해야 할 일 메시지 - 더 직관적으로
  const getActionMessage = () => {
    switch (patientState) {
      case 'UNREGISTERED':
        return { prefix: '다음', action: '병원 도착 후 접수처 방문' };
      case 'ARRIVED':
        return { prefix: '다음', action: '1층 접수처에서 접수하기' };
      case 'REGISTERED':
        return { prefix: '다음', action: '검사실로 이동하기' };
      case 'WAITING':
        return { prefix: '현재', action: '대기실에서 호출 대기 중' };
      case 'CALLED':
        return { prefix: '지금', action: '검사실로 들어가기', urgent: true };
      case 'ONGOING':
        return { prefix: '현재', action: '검사 진행 중' };
      case 'COMPLETED':
        return { prefix: '다음', action: '1층 원무과에서 수납하기' };
      case 'PAYMENT':
        return { prefix: '현재', action: '수납 진행 중' };
      case 'FINISHED':
        return { prefix: '완료', action: '안전하게 귀가하세요', complete: true };
      default:
        return { prefix: '다음', action: '안내에 따라 진행' };
    }
  };

  // 현재 상태 설명
  const getStatusDescription = () => {
    const stateTexts = {
      'UNREGISTERED': '병원 도착 전',
      'ARRIVED': '병원 도착',
      'REGISTERED': '접수 완료',
      'WAITING': '검사 대기',
      'CALLED': '호출됨',
      'ONGOING': '검사 중',
      'COMPLETED': '검사 완료',
      'PAYMENT': '수납 대기',
      'FINISHED': '모든 일정 완료'
    };
    
    return stateTexts[patientState] || '진행 중';
  };

  // 진행률 텍스트
  const getProgressText = () => {
    if (patientState === 'FINISHED') return '100%';
    if (todaysAppointments && ['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
      const completed = todaysAppointments.filter(apt => apt.status === 'completed').length;
      return `${completed}/${todaysAppointments.length} 검사`;
    }
    return `${Math.round(progressPercentage)}%`;
  };

  const actionInfo = getActionMessage();
  
  return (
    <div className="bg-white rounded-3xl shadow-2xl mb-8 -mx-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* 메인 액션 영역 - 더 크고 명확하게 */}
        <div className={`px-8 py-6 ${
          actionInfo.urgent ? 'bg-gradient-to-r from-red-50 to-orange-50' : 
          actionInfo.complete ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
          'bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-baseline gap-4">
              <span className={`text-2xl font-medium ${
                actionInfo.urgent ? 'text-red-600' :
                actionInfo.complete ? 'text-green-600' :
                'text-blue-600'
              }`}>
                {actionInfo.prefix}:
              </span>
              <h2 className={`text-3xl sm:text-4xl font-bold ${
                actionInfo.urgent ? 'text-red-900 animate-pulse' :
                actionInfo.complete ? 'text-green-900' :
                'text-gray-900'
              }`}>
                {actionInfo.action}
              </h2>
            </div>
            <div className="text-right ml-6">
              <p className="text-sm text-gray-500 mb-1">진행률</p>
              <span className={`text-4xl font-black bg-gradient-to-r ${getProgressColor()} 
                             bg-clip-text text-transparent`}>
                {getProgressText()}
              </span>
            </div>
          </div>
        </div>
        
        {/* 프로세스 바 - 더 세련되고 명확하게 */}
        <div className="px-8 py-5 bg-white border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* 현재 상태 표시 */}
            <div className="flex-shrink-0">
              <p className="text-sm text-gray-500 mb-1">현재 단계</p>
              <p className="text-lg font-bold text-gray-900">{getStatusDescription()}</p>
            </div>
            
            {/* 진행 바 */}
            <div className="flex-1">
              <div className="relative">
                <div className="w-full h-10 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full 
                               transition-all duration-1000 ease-out relative overflow-hidden`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  >
                    {/* 윤기나는 효과 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                    {/* 움직이는 광택 효과 */}
                    <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                                 -skew-x-12 animate-shimmer"></div>
                  </div>
                </div>
                
                {/* 주요 단계 표시 (점) */}
                <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-1">
                  {[0, 2, 6, 8].map((stepIndex) => (
                    <div
                      key={stepIndex}
                      className={`transition-all duration-500 ${
                        currentStateIndex >= stepIndex 
                          ? 'w-6 h-6 bg-white shadow-lg border-2 border-white' 
                          : 'w-4 h-4 bg-white/70 shadow-sm'
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
              
              {/* 단계 라벨 - 더 크고 명확하게 */}
              <div className="mt-3 flex justify-between text-sm font-medium px-1">
                <span className={`${currentStateIndex === 0 || currentStateIndex === 1 
                  ? 'text-indigo-600 font-bold text-base' 
                  : 'text-gray-400'} transition-all duration-300`}>
                  도착
                </span>
                <span className={`${currentStateIndex === 2 || currentStateIndex === 3 
                  ? 'text-indigo-600 font-bold text-base' 
                  : 'text-gray-400'} transition-all duration-300`}>
                  접수
                </span>
                <span className={`${currentStateIndex >= 4 && currentStateIndex <= 6 
                  ? 'text-indigo-600 font-bold text-base' 
                  : 'text-gray-400'} transition-all duration-300`}>
                  검사
                </span>
                <span className={`${currentStateIndex === 7 
                  ? 'text-orange-500 font-bold text-base' 
                  : 'text-gray-400'} transition-all duration-300`}>
                  수납
                </span>
                <span className={`${currentStateIndex === 8 
                  ? 'text-emerald-500 font-bold text-base' 
                  : 'text-gray-400'} transition-all duration-300`}>
                  완료
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}