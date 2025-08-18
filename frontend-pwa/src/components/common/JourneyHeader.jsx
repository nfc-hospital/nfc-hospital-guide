import React from 'react';
import { useLocation } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';

export default function JourneyHeader() {
  const { user, todaysAppointments } = useJourneyStore();
  const location = useLocation();
  
  // 페이지 경로에서 상태를 추론
  const getStateFromPath = (pathname) => {
    if (pathname.includes('waiting')) return 'WAITING';
    if (pathname.includes('called')) return 'CALLED';
    if (pathname.includes('payment')) return 'PAYMENT';
    if (pathname.includes('finished')) return 'FINISHED';
    if (pathname.includes('registered')) return 'REGISTERED';
    if (pathname.includes('arrived')) return 'ARRIVED';
    if (pathname.includes('exam')) return 'ONGOING';
    return 'UNREGISTERED';
  };
  
  const patientState = user?.state || getStateFromPath(location.pathname);
  
  console.log('🔍 JourneyHeader Debug:', {
    user,
    pathname: location.pathname,
    patientState,
    inferredState: getStateFromPath(location.pathname)
  });
  
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

  // 현재 해야 할 일 메시지
  const getActionMessage = () => {
    switch (patientState) {
      case 'UNREGISTERED':
        return '병원에 도착하시면 접수처에서 도착 확인을 해주세요';
      case 'ARRIVED':
        return '1층 접수처에서 접수를 진행해주세요';
      case 'REGISTERED':
        return '검사실로 이동해주세요';
      case 'WAITING':
        return '대기실에서 잠시 기다려주세요. 순서가 되면 호출해드립니다';
      case 'CALLED':
        return '지금 검사실로 들어가주세요!';
      case 'ONGOING':
        return '검사가 진행 중입니다. 안내에 따라주세요';
      case 'COMPLETED':
        return '모든 검사가 완료되었습니다. 수납처로 이동해주세요';
      case 'PAYMENT':
        return '1층 수납처에서 수납을 진행해주세요';
      case 'FINISHED':
        return '오늘 일정이 모두 끝났습니다. 안전하게 귀가하세요';
      default:
        return '안내에 따라 진행해주세요';
    }
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

  // 특정 페이지에서는 표시하지 않음
  const hiddenPaths = ['/', '/login', '/oauth/kakao/callback', '/map-test', '/chatbot-test'];
  const adminPaths = ['/dashboard', '/admin'];
  
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }
  
  // 관리자 페이지에서는 표시하지 않음
  if (adminPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }
  
  // 개발용 임시 - 모든 페이지에서 표시 (나중에 수정 필요)
  // TODO: 실제로는 로그인된 사용자가 있고 patient journey 페이지일 때만 표시
  const isTestMode = true; // 개발/테스트용
  
  if (!isTestMode && !user) {
    console.log('❌ JourneyHeader: No user in production mode');
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 bg-white shadow-md z-30"> {/* Header 아래에 위치 */}
      <div className="max-w-7xl mx-auto">
        {/* 액션 메시지 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {getActionMessage()}
              </h2>
            </div>
            <div className="text-right ml-4">
              <span className={`text-3xl font-black bg-gradient-to-r ${getProgressColor()} 
                             bg-clip-text text-transparent`}>
                {getProgressText()}
              </span>
            </div>
          </div>
        </div>
        
        {/* 프로세스 바 */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center gap-4">
            {/* 현재 상태 */}
            <div className="flex-shrink-0">
              <span className="text-sm font-medium text-gray-500">현재 상태</span>
              <p className="text-lg font-bold text-gray-900">{getStatusText()}</p>
            </div>
            
            {/* 진행 바 */}
            <div className="flex-1">
              <div className="relative">
                <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
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
                <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-1">
                  {[0, 2, 6, 8].map((stepIndex) => (
                    <div
                      key={stepIndex}
                      className={`transition-all duration-500 ${
                        currentStateIndex >= stepIndex 
                          ? 'w-5 h-5 bg-white shadow-lg border border-white' 
                          : 'w-3 h-3 bg-white/70 shadow-sm'
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
              
              {/* 단계 라벨 */}
              <div className="mt-2 flex justify-between text-xs font-medium">
                <span className={`${currentStateIndex === 0 || currentStateIndex === 1 
                  ? 'text-indigo-600 font-bold' 
                  : 'text-gray-400'}`}>
                  도착
                </span>
                <span className={`${currentStateIndex === 2 || currentStateIndex === 3 
                  ? 'text-indigo-600 font-bold' 
                  : 'text-gray-400'}`}>
                  접수
                </span>
                <span className={`${currentStateIndex >= 4 && currentStateIndex <= 6 
                  ? 'text-indigo-600 font-bold' 
                  : 'text-gray-400'}`}>
                  검사
                </span>
                <span className={`${currentStateIndex === 7 
                  ? 'text-orange-500 font-bold' 
                  : 'text-gray-400'}`}>
                  수납
                </span>
                <span className={`${currentStateIndex === 8 
                  ? 'text-emerald-500 font-bold' 
                  : 'text-gray-400'}`}>
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