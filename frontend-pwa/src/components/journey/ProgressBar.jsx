import React from 'react';
import { QueueDetailState } from '../../constants/states';

/**
 * ProgressBar - 환자의 전체 진료/검사 과정을 시각화하는 컴포넌트
 * 
 * @param {Object|Array} props - 여정 데이터 또는 appointments 배열
 * @param {Object} props.journeyData - 여정 데이터 객체 (선택적)
 * @param {string} props.journeyData.patientState - 환자의 9단계 상태
 * @param {Array} props.journeyData.appointments - 오늘의 전체 일정 목록
 * @param {Array} props.appointments - appointments 배열 (레거시 지원)
 */
export default function ProgressBar(props) {
  // 레거시 지원: appointments 배열만 전달된 경우
  let appointments = props.appointments;
  let patientState = null;
  
  // 새로운 방식: journeyData 객체가 전달된 경우
  if (props.journeyData) {
    appointments = props.journeyData.appointments;
    patientState = props.journeyData.patientState;
  }

  if (!appointments || appointments.length === 0) {
    return null;
  }

  // 현재 진행 중인 단계 찾기
  const currentStepIndex = appointments.findIndex(apt => apt.status === QueueDetailState.IN_PROGRESS);
  const nextStepIndex = currentStepIndex === -1 
    ? appointments.findIndex(apt => apt.status === 'pending' || apt.status === QueueDetailState.WAITING)
    : -1;

  // 완료된 마지막 단계 인덱스
  const lastCompletedIndex = appointments.reduce((lastIndex, apt, index) => {
    return apt.status === QueueDetailState.COMPLETED ? index : lastIndex;
  }, -1);

  // appointment에서 이름 가져오기 (exam.title 또는 name 사용)
  const getAppointmentName = (appointment) => {
    return appointment.name || appointment.exam?.title || '검사';
  };

  // 현재 상태에 따른 헤더 텍스트
  const getStatusText = () => {
    if (currentStepIndex !== -1) {
      return `${getAppointmentName(appointments[currentStepIndex])} 진행 중`;
    } else if (nextStepIndex !== -1) {
      return `다음: ${getAppointmentName(appointments[nextStepIndex])}`;
    } else if (lastCompletedIndex === appointments.length - 1) {
      return '모든 검사가 완료되었습니다';
    }
    return '오늘의 검사 일정';
  };

  // 진행률 계산 (완료된 단계 기준)
  const completedCount = appointments.filter(apt => apt.status === QueueDetailState.COMPLETED).length;
  const progressPercentage = (completedCount / appointments.length) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      {/* 헤더 영역 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">오늘의 여정</h2>
        <p className="text-xl text-blue-600 font-medium">{getStatusText()}</p>
      </div>

      {/* 프로그레스 바 영역 */}
      <div className="relative">
        {/* 배경 트랙 */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        
        {/* 진행 바 */}
        <div 
          className="absolute top-8 left-0 h-1 bg-blue-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />

        {/* 단계별 마커 */}
        <div className="relative flex justify-between">
          {appointments.map((appointment, index) => {
            const isCompleted = appointment.status === QueueDetailState.COMPLETED;
            const isInProgress = appointment.status === QueueDetailState.IN_PROGRESS;
            const isCurrent = index === currentStepIndex || index === nextStepIndex;
            const isPending = appointment.status === 'pending' || appointment.status === QueueDetailState.WAITING;

            return (
              <div 
                key={appointment.id || appointment.appointment_id || index} 
                className="flex flex-col items-center"
                style={{ flex: 1 }}
              >
                {/* 원형 마커 */}
                <div className="relative">
                  <div
                    className={`
                      w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center
                      text-base sm:text-lg font-bold transition-all duration-300 
                      ${isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isInProgress
                        ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                        : isCurrent && isPending
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" 
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                              clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  {/* 진행 중 표시 애니메이션 */}
                  {isInProgress && (
                    <div className="absolute inset-0 rounded-full bg-blue-400 opacity-50 animate-ping" />
                  )}
                </div>

                {/* 단계 이름 */}
                <div className="mt-3 text-center max-w-[80px] sm:max-w-none">
                  <p className={`
                    text-sm sm:text-lg font-medium transition-colors duration-300
                    ${isCompleted || isInProgress || isCurrent 
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                    }
                    ${appointments.length > 4 ? 'break-words' : ''}
                  `}>
                    {getAppointmentName(appointment)}
                  </p>
                  
                  {/* 상태 텍스트 */}
                  {isInProgress && (
                    <p className="text-sm text-blue-600 font-medium mt-1">진행 중</p>
                  )}
                  {isCurrent && isPending && (
                    <p className="text-sm text-amber-600 font-medium mt-1">대기 중</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 요약 정보 */}
      <div className="mt-8 flex items-center justify-between text-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">완료:</span>
          <span className="font-bold text-green-600">{completedCount}개</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">남은 검사:</span>
          <span className="font-bold text-blue-600">
            {appointments.length - completedCount}개
          </span>
        </div>
      </div>
    </div>
  );
}