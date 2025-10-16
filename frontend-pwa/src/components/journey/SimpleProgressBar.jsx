import React from 'react';
import { PatientJourneyState, QueueDetailState } from '../../constants/states';

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
    PatientJourneyState.UNREGISTERED,  // 1. 병원 도착 전
    PatientJourneyState.ARRIVED,       // 2. 병원 도착
    PatientJourneyState.REGISTERED,    // 3. 접수 완료
    PatientJourneyState.WAITING,       // 4. 대기 중
    PatientJourneyState.CALLED,        // 5. 호출됨
    PatientJourneyState.IN_PROGRESS,   // 6. 진행 중
    PatientJourneyState.PAYMENT,       // 8. 수납
    PatientJourneyState.FINISHED       // 9. 귀가
  ];

  // 현재 상태의 인덱스 찾기
  const currentStateIndex = PATIENT_JOURNEY_STATES.indexOf(patientState);
  const totalSteps = PATIENT_JOURNEY_STATES.length;
  
  // 기본 진행률 계산 (9단계 기준)
  let progressPercentage = ((currentStateIndex + 1) / totalSteps) * 100;
  
  // appointments가 있고 WAITING~COMPLETED 상태인 경우 더 세밀한 진행률 계산 (검사/진료 큐만)
  if (appointments && appointments.length > 0 && 
      [PatientJourneyState.WAITING, PatientJourneyState.CALLED, PatientJourneyState.IN_PROGRESS, PatientJourneyState.COMPLETED].includes(patientState)) {
    
    // 검사/진료 큐만 필터링
    const examAppointments = appointments.filter(apt => 
      apt.exam_id && apt.status && 
      ['scheduled', 'confirmed', QueueDetailState.IN_PROGRESS, 'completed'].includes(apt.status)
    );
    
    const completedExams = examAppointments.filter(apt => apt.status === 'completed').length;
    const totalExams = examAppointments.length;
    
    if (totalExams > 0) {
      // 검사 진행 단계는 전체의 3/9 ~ 7/9를 차지 (WAITING부터 COMPLETED까지)
      const examProgressStart = 3 / totalSteps; // WAITING 시작점
      const examProgressEnd = 7 / totalSteps;   // COMPLETED 끝점
      const examProgressRange = examProgressEnd - examProgressStart;
      
      // 검사 진행률을 반영한 전체 진행률
      const examProgress = completedExams / totalExams;
      progressPercentage = (examProgressStart + (examProgress * examProgressRange)) * 100;
    }
  }

  // 상태별 색상 결정 - primary-blue 기반
  const getProgressColor = () => {
    if (patientState === PatientJourneyState.FINISHED) return 'from-emerald-500 to-green-600';
    if (patientState === PatientJourneyState.PAYMENT) return 'from-amber-500 to-orange-600';
    if ([PatientJourneyState.WAITING, PatientJourneyState.CALLED, PatientJourneyState.IN_PROGRESS, PatientJourneyState.COMPLETED].includes(patientState)) {
      return 'from-primary-blue to-primary-blue-dark';
    }
    return 'from-gray-400 to-gray-500';
  };

  // 현재 상태 텍스트 - 고령자 친화적으로 수정
  const getStatusText = () => {
    const stateTexts = {
      [PatientJourneyState.UNREGISTERED]: '병원 도착 전',
      [PatientJourneyState.ARRIVED]: '병원 도착',
      [PatientJourneyState.REGISTERED]: '접수 완료',
      [PatientJourneyState.WAITING]: '검사 대기 중',
      [PatientJourneyState.CALLED]: '호출됨',
      [PatientJourneyState.IN_PROGRESS]: '검사 진행 중',
      [PatientJourneyState.COMPLETED]: '검사 완료',
      [PatientJourneyState.PAYMENT]: '수납 중',
      [PatientJourneyState.FINISHED]: '모든 일정\n완료'
    };
    
    return stateTexts[patientState] || '진행 중';
  };

  // 진행률 텍스트 - 검사/진료 큐만 카운트
  const getProgressText = () => {
    if (patientState === PatientJourneyState.FINISHED) return '100%';
    if (appointments && [PatientJourneyState.WAITING, PatientJourneyState.CALLED, PatientJourneyState.IN_PROGRESS, PatientJourneyState.COMPLETED].includes(patientState)) {
      // 검사/진료 큐만 필터링 (대기, 결제 등 제외)
      const examAppointments = appointments.filter(apt => 
        apt.exam_id && apt.status && 
        ['scheduled', 'confirmed', QueueDetailState.IN_PROGRESS, 'completed'].includes(apt.status)
      );
      const completedExams = examAppointments.filter(apt => apt.status === 'completed').length;
      return `${completedExams}/${examAppointments.length}`;
    }
    return `${Math.round(progressPercentage)}%`;
  };

  return (
    <div className={`bg-white rounded-3xl shadow-soft p-12 border border-gray-100 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-3xl font-bold text-text-primary whitespace-pre-line leading-relaxed">
            {getStatusText()}
          </h3>
          <div className="text-right">
            <span className="text-5xl font-black text-primary-blue">
              {getProgressText()}
            </span>
            <p className="text-lg text-text-secondary mt-2 font-semibold">진행률</p>
          </div>
        </div>
      )}
      
      <div className="relative">
        {/* 배경 바 - 더 굵고 부드럽게 */}
        <div className="w-full h-20 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          {/* 진행 바 */}
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full 
                       transition-all duration-1500 ease-out
                       relative overflow-hidden shadow-lg`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {/* 윤기나는 효과 - 더 부드럽게 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
            {/* 움직이는 광택 효과 */}
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                         -skew-x-12 animate-shimmer"></div>
          </div>
        </div>
        
        {/* 주요 단계 표시 (점) - 더 크고 명확하게 */}
        <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-4">
          {[0, 2, 6, 8].map((stepIndex) => (
            <div
              key={stepIndex}
              className={`transition-all duration-700 ${
                currentStateIndex >= stepIndex 
                  ? 'w-12 h-12 bg-white shadow-2xl scale-110 border-4 border-primary-blue ring-2 ring-primary-blue/20' 
                  : 'w-9 h-9 bg-white/90 shadow-lg border-2 border-gray-300'
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
      
      {/* 단계 라벨 - 고령자 친화적으로 더 크고 명확하게, 너비 통일 */}
      {showLabel && (
        <div className="mt-12 grid grid-cols-5 gap-2">
          <div className="text-center">
            <span className={`block text-xl font-bold whitespace-pre-line leading-tight ${
              currentStateIndex === 0 || currentStateIndex === 1 
                ? 'text-primary-blue scale-110' 
                : 'text-gray-400'
            } transition-all duration-700 transform`}>
              병원\n도착
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-xl font-bold whitespace-pre-line leading-tight ${
              currentStateIndex === 2 || currentStateIndex === 3 
                ? 'text-primary-blue scale-110' 
                : 'text-gray-400'
            } transition-all duration-700 transform`}>
              접수\n완료
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-xl font-bold whitespace-pre-line leading-tight ${
              currentStateIndex >= 4 && currentStateIndex <= 6 
                ? 'text-primary-blue scale-110' 
                : 'text-gray-400'
            } transition-all duration-700 transform`}>
              검사\n진행
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-xl font-bold whitespace-pre-line leading-tight ${
              currentStateIndex === 7 
                ? 'text-amber-600 scale-110' 
                : 'text-gray-400'
            } transition-all duration-700 transform`}>
              수납\n처리
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-xl font-bold whitespace-pre-line leading-tight ${
              currentStateIndex === 8 
                ? 'text-emerald-600 scale-110' 
                : 'text-gray-400'
            } transition-all duration-700 transform`}>
              모든\n완료
            </span>
          </div>
        </div>
      )}
    </div>
  );
}