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

    // ✅ Backend 상태를 그대로 신뢰 - 추론 로직 완전 제거
    // Single Source of Truth 원칙: Backend가 보낸 상태를 Frontend가 변경하지 않음

    // 🔧 방어 로직: 현재 진행 중인 검사는 한 개만 허용
    // 여러 개가 waiting/called/in_progress 상태로 내려와도 첫 번째 것만 유지
    let foundInProgress = false;

    uniqueAppointments.forEach((apt, index) => {
      const examName = getAppointmentName(apt);

      // Backend에서 받은 상태를 그대로 사용 (추론 없음)
      let examStatus = apt.status || 'pending';

      // 🛡️ 방어: 이미 진행 중인 검사가 있으면 나머지는 pending 처리
      const isActiveStatus = examStatus === 'waiting' || examStatus === 'called' || examStatus === 'in_progress';

      // 🚨 특수 케이스: ARRIVED 상태일 때는 모든 검사 단계를 pending으로 강제
      // ARRIVED 상태 = 환자가 병원 도착 후 접수 진행 중인 상태
      // 이때는 접수만 in_progress이고, 모든 검사는 pending이어야 함
      if (currentState === 'ARRIVED') {
        if (isActiveStatus) {
          examStatus = 'pending';
          if (import.meta.env.DEV) {
            console.log(`🔒 [ProgressBar] ARRIVED 상태: "${examName}"을 pending으로 강제 변경 (접수 단계만 활성화)`);
          }
        }
      } else if (isActiveStatus) {
        // ARRIVED가 아닐 때만 기존 로직 적용: 첫 번째 진행 중 검사만 허용
        if (foundInProgress) {
          // 두 번째 이후 진행 중 상태는 pending으로 변경
          examStatus = 'pending';
          if (import.meta.env.DEV) {
            console.warn(`⚠️ [ProgressBar] 여러 개의 진행 중 검사 감지: "${examName}"을 pending으로 변경`);
          }
        } else {
          // 첫 번째 진행 중 검사만 허용
          foundInProgress = true;
          if (import.meta.env.DEV) {
            console.log(`✅ [ProgressBar] 현재 진행 중: "${examName}" (${examStatus})`);
          }
        }
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

  // 슬라이딩 윈도우: 현재 단계 기준으로 이전-현재-다음 3개만 추출
  const getVisibleSteps = () => {
    if (currentStepIndex === -1) {
      // 진행 중인 단계가 없으면 첫 3개 표시
      return journeySteps.slice(0, 3).map((step, idx) => ({ step, originalIndex: idx }));
    }

    const result = [];

    // 이전 단계
    if (currentStepIndex > 0) {
      result.push({
        step: journeySteps[currentStepIndex - 1],
        originalIndex: currentStepIndex - 1
      });
    }

    // 현재 단계
    result.push({
      step: journeySteps[currentStepIndex],
      originalIndex: currentStepIndex,
      isCurrent: true
    });

    // 다음 단계
    if (currentStepIndex < journeySteps.length - 1) {
      result.push({
        step: journeySteps[currentStepIndex + 1],
        originalIndex: currentStepIndex + 1
      });
    }

    return result;
  };

  const visibleSteps = getVisibleSteps();

  // 세로 방식으로 변경 - 스크롤 없이 정확히 3개만
  return (
    <div className="flex items-center gap-4">
      {/* 좌측: 진행률 카드 - 세로 진행바와 같은 높이 */}
      <div className="flex-shrink-0">
        <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg px-6 py-8 min-w-[90px]">
          <div className="flex flex-col items-center justify-center">
            <div className="text-white/90 text-sm font-medium mb-2">진행</div>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-4xl sm:text-5xl font-black leading-none">{completedCount}</span>
              <span className="text-white/70 text-2xl sm:text-3xl font-bold leading-none">/{journeySteps.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 세로 진행바 - 스크롤 없이 3개만 */}
      <div className="flex-1">
        <div className="flex flex-col gap-3">
          {visibleSteps.map(({ step, originalIndex, isCurrent: isCurrentStep }, index) => {
            const status = step.status?.toLowerCase() || '';
            const isCompleted = status === 'completed' || status === 'examined';
            const isInProgress = status === 'waiting' || status === 'called' || status === 'in_progress';

            // 현재 단계는 큰 박스, 나머지는 작은 원
            if (isInProgress) {
              return (
                <div
                  key={`${step.type}-${originalIndex}`}
                  className="relative"
                >
                  {/* 연결선 (위) */}
                  {index > 0 && (
                    <div className="absolute left-6 -top-3 w-0.5 h-3 bg-white/70" />
                  )}

                  {/* 현재 단계 박스 */}
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 border-2 border-amber-400 shadow-lg">
                    <div className="flex items-start gap-4">
                      {/* 큰 노란 원 */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/30 animate-pulse">
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* 상세 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-base sm:text-lg font-bold mb-1">
                          {step.name}
                        </div>
                        <div className="text-white/80 text-sm">
                          {status === 'waiting' && '순서 대기 중'}
                          {status === 'called' && '호출됨'}
                          {status === 'in_progress' && '진행 중'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 연결선 (아래) */}
                  {index < visibleSteps.length - 1 && (
                    <div className="absolute left-6 -bottom-3 w-0.5 h-3 bg-white/70" />
                  )}
                </div>
              );
            } else {
              // 이전/다음 단계는 작은 원만
              return (
                <div key={`${step.type}-${originalIndex}`} className="relative">
                  {/* 연결선 (위) */}
                  {index > 0 && (
                    <div className="absolute left-4 -top-3 w-0.5 h-3 bg-white/30" />
                  )}

                  <div className="flex items-center gap-3 pl-2">
                    {/* 작은 원 */}
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${isCompleted
                        ? 'bg-white shadow-md'
                        : 'bg-white/15 backdrop-blur-sm border border-white/25'}
                    `}>
                      {isCompleted ? (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-white/50 rounded-full" />
                      )}
                    </div>

                    {/* 작은 텍스트 */}
                    <div className={`text-sm ${
                      isCompleted ? 'text-white/90' : 'text-white/60'
                    }`}>
                      {step.name}
                    </div>
                  </div>

                  {/* 연결선 (아래) */}
                  {index < visibleSteps.length - 1 && (
                    <div className="absolute left-4 -bottom-3 w-0.5 h-3 bg-white/30" />
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}