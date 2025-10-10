import React from 'react';
import { QueueDetailState } from '../../constants/states';

/**
 * ProgressBar - 환자의 전체 진료/검사 과정을 시각화하는 컴포넌트
 *
 * @param {Object|Array} props - 여정 데이터 또는 appointments 배열
 * @param {Object} props.journeyData - 여정 데이터 객체 (선택적)
 * @param {string} props.journeyData.patientState - 환자의 8단계 상태 (COMPLETED 제거됨)
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
  let patientState = props.patientState || null;

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
      console.warn('⚠️ [ProgressBar] No appointments data, showing default 3-step process');
    }

    // 기본 3단계 프로세스 표시 (데이터가 없을 때)
    // 환자 상태에 따라 현재 단계 결정
    const getCurrentStep = () => {
      const currentState = patientState?.current_state || patientState;

      if (currentState === 'PAYMENT' || currentState === 'FINISHED') {
        return 2; // 수납 단계
      } else if (currentState === 'UNREGISTERED' || currentState === 'ARRIVED') {
        return 0; // 접수 단계
      } else {
        return 1; // 검사 단계 (REGISTERED, WAITING, CALLED, IN_PROGRESS)
      }
    };

    const currentStepIndex = getCurrentStep();
    const defaultSteps = [
      { name: '접수', status: currentStepIndex >= 0 ? (currentStepIndex > 0 ? 'completed' : 'in_progress') : 'pending' },
      { name: '검사', status: currentStepIndex >= 1 ? (currentStepIndex > 1 ? 'completed' : 'in_progress') : 'pending' },
      { name: '수납', status: currentStepIndex >= 2 ? 'in_progress' : 'pending' }
    ];

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center flex-1">
          {defaultSteps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'in_progress';

            return (
              <div key={index} className="flex flex-col items-center relative" style={{ flex: '1 1 0%' }}>
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

                <div className="mt-1">
                  <div className={`text-[11px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap text-center ${
                    isCurrent ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'
                  }`}>
                    {step.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-end flex-shrink-0">
          <div className="text-white/70 text-xs sm:text-sm">진행</div>
          <div className="text-white flex items-baseline gap-0.5">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{currentStepIndex + 1}</span>
            <span className="text-sm sm:text-base lg:text-xl text-white/70">/3</span>
          </div>
        </div>
      </div>
    );
  }

  // 접수와 수납을 포함한 전체 단계 구성
  const buildCompleteJourney = () => {
    const steps = [];

    // 1. 접수 단계 추가
    const currentState = patientState?.current_state || patientState;

    // 접수 단계 상태 결정
    // UNREGISTERED: pending (아직 도착 안함)
    // ARRIVED: in_progress (도착해서 접수 진행 중)
    // REGISTERED 이상: completed (접수 완료)
    let registrationStatus = 'pending';
    if (currentState === 'ARRIVED') {
      registrationStatus = 'in_progress';
    } else if (currentState && currentState !== 'UNREGISTERED' && currentState !== 'ARRIVED') {
      registrationStatus = 'completed';
    }

    steps.push({
      name: '접수',
      type: 'registration',
      status: registrationStatus
    });

    // 2. 검사 단계들 추가 - Backend의 apt.status를 그대로 사용 (Single Source of Truth)

    // ✅✅ 중복 제거: exam_id 기준으로 고유한 검사만 필터링
    const uniqueAppointments = [];
    const seenExamIds = new Set();

    appointments.forEach(apt => {
      const examId = apt.exam?.exam_id || apt.exam_id;
      if (examId && !seenExamIds.has(examId)) {
        seenExamIds.add(examId);
        uniqueAppointments.push(apt);
      }
    });

    if (import.meta.env.DEV) {
      console.log('🔍 [ProgressBar] Original appointments:', appointments.length);
      console.log('🔍 [ProgressBar] Unique appointments:', uniqueAppointments.length);
      console.log('🔍 [ProgressBar] Seen exam IDs:', Array.from(seenExamIds));
    }

    // 현재 진행 중인 검사 찾기 (백엔드 상태 기반)
    const inProgressIndex = uniqueAppointments.findIndex(apt => apt.status === 'in_progress');

    uniqueAppointments.forEach((apt, index) => {
      const examName = getAppointmentName(apt);

      // ✅ Backend Queue 상태를 정확히 반영
      let examStatus = 'pending'; // 기본값

      if (apt.status === 'completed') {
        examStatus = 'completed';  // 완료된 검사
      } else if (apt.status === 'in_progress') {
        examStatus = 'in_progress';  // 현재 진행 중 (노란 원)
      } else if (inProgressIndex > -1 && index < inProgressIndex) {
        // in_progress 검사보다 앞에 있는 검사들은 완료된 것으로 표시
        examStatus = 'completed';
      } else {
        // 나머지는 pending (회색 원)
        examStatus = 'pending';
      }

      steps.push({
        name: examName,
        type: 'exam',
        status: examStatus,
        appointment: apt
      });
    });

    // 3. 수납 단계 추가
    const isPaymentStage = currentState === 'PAYMENT' || currentState === 'FINISHED';
    const isFinished = currentState === 'FINISHED';

    steps.push({
      name: '수납',
      type: 'payment',
      status: isFinished ? 'completed' : (isPaymentStage ? 'in_progress' : 'pending')
    });

    return steps;
  };

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

  // 전체 여정 단계 구성
  const journeySteps = buildCompleteJourney();

  // 진행률 계산 (완료된 단계 기준)
  const completedCount = journeySteps.filter(step => step.status === 'completed').length;
  const currentStepIndex = journeySteps.findIndex(step => step.status === 'in_progress');
  const progressPercentage = (completedCount / journeySteps.length) * 100;

  // Template의 파란색 배경에 맞는 스타일로 수정
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center flex-1">
        {/* 단계별 마커 - Template 스타일에 맞게 컴팩트하게 */}
        {journeySteps.map((step, index) => {
          const isCompleted = step.status === 'completed' || step.status === QueueDetailState.COMPLETED;
          const isInProgress = step.status === 'in_progress' || step.status === QueueDetailState.IN_PROGRESS;
          // isCurrent는 오직 in_progress 상태만 노란색으로 표시
          const isCurrent = isInProgress;

          // 단계별 색상 구분
          const getStepColor = () => {
            if (step.type === 'registration' || step.type === 'payment') {
              return isCompleted ? 'bg-white' : isCurrent ? 'bg-amber-400' : 'bg-white/15';
            }
            return isCompleted ? 'bg-white' : isCurrent ? 'bg-amber-400' : 'bg-white/15';
          };

          return (
            <div key={`${step.type}-${index}`} className="flex flex-col items-center relative" style={{ flex: '1 1 0%' }}>
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
                  ${getStepColor()} ${isCurrent ? 'shadow-lg ring-2 ring-white/30 scale-110' : 'shadow-md'}
                  ${!isCompleted && !isCurrent ? 'backdrop-blur-sm border border-white/25' : ''}
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
                } ${step.type === 'registration' || step.type === 'payment' ? 'font-bold' : ''}`}>
                  {step.name}
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
          <span className="text-sm sm:text-base lg:text-xl text-white/70">/{journeySteps.length}</span>
        </div>
      </div>
    </div>
  );
}