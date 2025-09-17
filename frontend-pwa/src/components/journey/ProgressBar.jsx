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
  // 디버깅용 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('🎯 [ProgressBar] Props received:', props);
  }

  // 레거시 지원: appointments 배열만 전달된 경우
  let appointments = props.appointments;
  let patientState = null;

  // 새로운 방식: journeyData 객체가 전달된 경우
  if (props.journeyData) {
    appointments = props.journeyData.appointments;
    patientState = props.journeyData.patientState;
  }

  if (import.meta.env.DEV) {
    console.log('📋 [ProgressBar] Final appointments:', appointments);
    console.log('📊 [ProgressBar] Appointments length:', appointments?.length);
  }

  if (!appointments || appointments.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ [ProgressBar] No appointments data, returning null');
    }
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

  // appointment에서 이름 가져오기 (여러 경로에서 찾기)
  const getAppointmentName = (appointment) => {
    // 디버깅용 로그 (개발 환경에서만)
    if (import.meta.env.DEV) {
      console.log('🔍 [ProgressBar] Appointment data:', appointment);
    }

    // 다양한 경로에서 이름을 찾기
    const name = appointment?.name ||
                 appointment?.exam?.title ||
                 appointment?.examName ||
                 appointment?.title ||
                 '검사';

    if (import.meta.env.DEV) {
      console.log('🏷️ [ProgressBar] Resolved name:', name);
    }

    return name;
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

  // Template의 파란색 배경에 맞는 스타일로 수정
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center flex-1">
        {/* 단계별 마커 - Template 스타일에 맞게 컴팩트하게 */}
        {appointments.map((appointment, index) => {
          const isCompleted = appointment.status === QueueDetailState.COMPLETED;
          const isInProgress = appointment.status === QueueDetailState.IN_PROGRESS;
          const isCurrent = index === currentStepIndex || index === nextStepIndex;
          const isPending = appointment.status === 'pending' || appointment.status === QueueDetailState.WAITING;

          return (
            <div key={appointment.id || appointment.appointment_id || index} className="flex flex-col items-center relative" style={{ flex: '1 1 0%' }}>
              {/* 연결선 */}
              {index > 0 && (
                <div className="absolute top-3 sm:top-4 h-0.5" style={{
                  left: '-50%',
                  right: '50%',
                  background: isCompleted || isCurrent
                    ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.7) 80%, transparent)'
                    : 'linear-gradient(to right, transparent, rgba(255,255,255,0.25) 20%, rgba(255,255,255,0.25) 80%, transparent)'
                }} />
              )}

              {/* 단계 원 */}
              <div className="relative">
                <div className={`
                  relative w-5 h-5 sm:w-6 sm:h-6 rounded-full
                  flex items-center justify-center transition-all duration-500
                  ${isCompleted
                    ? 'bg-white shadow-md'
                    : isCurrent
                    ? 'bg-amber-400 shadow-lg ring-2 ring-white/30 scale-110'
                    : 'bg-white/15 backdrop-blur-sm border border-white/25'
                  }
                `}>
                  {isCompleted ? (
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  ) : (
                    <div className="w-1 h-1 bg-white/50 rounded-full" />
                  )}
                </div>
              </div>

              {/* 단계 라벨 */}
              <div className="mt-1">
                <div className={`text-[11px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap text-center ${
                  isCurrent ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'
                }`}>
                  {getAppointmentName(appointment)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 진행률 숫자 표시 */}
      <div className="flex flex-col items-end flex-shrink-0">
        <div className="text-white/70 text-xs sm:text-sm">진행</div>
        <div className="text-white flex items-baseline gap-0.5">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{completedCount}</span>
          <span className="text-sm sm:text-base lg:text-xl text-white/70">/{appointments.length}</span>
        </div>
      </div>
    </div>
  );
}