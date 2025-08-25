import React from 'react';
import FormatATemplate from '../templates/FormatATemplate';

export default function RegisteredScreen({ 
  // props로 받은 데이터들
  taggedLocation,
  user,
  patientState,
  todaySchedule,
  currentStep,
  totalSteps,
  waitingInfo,
  locationInfo,
  currentExam,
  nextExam,
  targetExam,
  actualCurrentStep
}) {
  // ❌ 모든 Store Hook 호출과 데이터 가공 로직 삭제!
  // 이제 모든 데이터는 props로 받아서 사용합니다.

  return (
    <FormatATemplate
      screenType="registered"
      currentStep={actualCurrentStep}
      totalSteps={totalSteps}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={null}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || 'REGISTERED'}
      currentExam={currentExam}
    />
  );
}