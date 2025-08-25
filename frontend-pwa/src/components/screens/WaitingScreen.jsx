import React, { useState, useEffect } from 'react';
import FormatATemplate from '../templates/FormatATemplate';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import CalledModal from '../modals/CalledModal';

export default function WaitingScreen({ 
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
  currentTask,
  isOngoing,
  isCalled,
  actualCurrentStep,
  completionStats
}) {
  // CalledModal 상태 관리
  const [showCalledModal, setShowCalledModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  
  // CALLED 상태일 때 모달 표시 (한 번만)
  useEffect(() => {
    const shouldShowModal = (isCalled || currentTask?.state === 'called' || patientState === 'CALLED');
    
    if (shouldShowModal && !hasShownModal) {
      setShowCalledModal(true);
      setHasShownModal(true);
    } else if (!shouldShowModal) {
      // 상태가 변경되면 다시 보여줄 수 있도록 리셋
      setHasShownModal(false);
    }
  }, [isCalled, currentTask?.state, patientState, hasShownModal]);

  return (
    <>
      {/* 호출 모달 - 데이터 전달 */}
      <CalledModal 
        isOpen={showCalledModal}
        onClose={() => setShowCalledModal(false)}
        examInfo={currentExam}
        userName={user?.name}
        currentTask={currentTask}
      />
      
      <FormatATemplate
      screenType="waiting"
      currentStep={actualCurrentStep || currentStep}
      totalSteps={totalSteps || todaySchedule?.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={currentTask}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || (isOngoing ? 'ONGOING' : isCalled ? 'CALLED' : 'WAITING')}
      currentExam={currentExam}
    >
      {/* 추가 콘텐츠 영역 - 상태별 안내 */}
      <div className="space-y-4">
        {isOngoing && (
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-3">
              <ClipboardDocumentCheckIcon className="w-16 h-16 text-green-600" />
            </div>
            <p className="text-lg text-green-800 font-medium">
              현재 {currentExam?.title || '검사'}가 진행 중입니다
            </p>
            <p className="text-sm text-green-600 mt-2">
              검사가 끝날 때까지 잠시만 기다려주세요
            </p>
          </div>
        )}
      </div>
    </FormatATemplate>
    </>
  );
}