import React, { useState, useEffect } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import CalledModal from '../../modals/CalledModal';
import { PatientJourneyState } from '../../../constants/states';

/**
 * WaitingContent - 대기 상태의 순수 컨텐츠 컴포넌트
 * 템플릿 래핑 없이 순수 컨텐츠만 제공
 */
export default function WaitingContent({ 
  // 필요한 데이터만 props로 받음
  user,
  patientState,
  currentExam,
  currentTask,
  isInProgress,
  isCalled
}) {
  // CalledModal 상태 관리
  const [showCalledModal, setShowCalledModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  
  // CALLED 상태일 때 모달 표시 (한 번만)
  useEffect(() => {
    const shouldShowModal = (isCalled || currentTask?.state === 'called' || patientState === PatientJourneyState.CALLED);
    
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
      
      {/* 상태별 안내 컨텐츠 */}
      <div className="space-y-4">
        {isInProgress && (
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
        
        {isCalled && !isInProgress && (
          <div className="bg-blue-50 rounded-2xl p-6 text-center">
            <p className="text-lg text-blue-800 font-medium">
              호출되었습니다! 검사실로 이동해주세요
            </p>
            <p className="text-sm text-blue-600 mt-2">
              {currentExam?.title || '검사'}를 위해 대기해주세요
            </p>
          </div>
        )}
        
        {!isInProgress && !isCalled && (
          <div className="bg-amber-50 rounded-2xl p-6 text-center">
            <p className="text-lg text-amber-800 font-medium">
              순서를 기다리고 있습니다
            </p>
            <p className="text-sm text-amber-600 mt-2">
              곧 호출될 예정이니 잠시만 기다려주세요
            </p>
          </div>
        )}
      </div>
    </>
  );
}