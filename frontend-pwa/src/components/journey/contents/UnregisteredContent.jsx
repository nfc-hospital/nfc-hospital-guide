import React, { useState } from 'react';
import ExamPreparationChecklist from '../../ExamPreparationChecklist';
import useJourneyStore from '../../../store/journeyStore';

/**
 * UnregisteredContent - 미등록(병원 도착 전) 상태의 순수 컨텐츠 컴포넌트
 *
 * 역할:
 * - 검사별 준비사항만 표시 (ExamPreparationChecklist)
 * - 공통 서류는 JourneyContainer → Template에서 처리
 *
 * 리팩토링:
 * - preparationItems 렌더링 로직 제거 (중복 제거)
 * - accordion UI 로직 제거 (Template로 이관)
 * - 순수한 "검사별 준비사항"만 담당
 */
const UnregisteredContent = () => {
  // 🎯 Store에서 필요한 데이터 직접 구독
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);

  // ExamPreparationChecklist의 완료 상태
  const [allRequiredCompleted, setAllRequiredCompleted] = useState(false);

  // 완료 상태 변경 핸들러 (ExamPreparationChecklist에서 호출)
  const handleCompletionChange = (isCompleted) => {
    setAllRequiredCompleted(isCompleted);
  };

  // 예약이 없으면 아무것도 표시하지 않음
  if (!todaysAppointments || todaysAppointments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          검사별 준비사항
        </h3>
        {allRequiredCompleted && (
          <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-bold animate-[scale-in_0.3s_ease-out]">
            준비 완료!
          </span>
        )}
      </div>
      {/* ExamPreparationChecklist:
          - API에서 검사별 준비사항 로드
          - 필수 항목 빨간 배지
          - 금식 필요 배지
          - 진행률 바
          - 모든 필수 항목 체크 시 자동 닫힘
          - 예약 변경 버튼 + 3단계 슬라이드 모달 (모두 내장) */}
      <ExamPreparationChecklist
        appointments={todaysAppointments}
        onCompletionChange={handleCompletionChange}
      />
    </div>
  );
};

UnregisteredContent.displayName = 'UnregisteredContent';

export default UnregisteredContent;
