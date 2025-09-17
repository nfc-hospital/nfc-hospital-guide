import React from 'react';
import { CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import useJourneyStore from '../../../store/journeyStore';

/**
 * RegisteredContent - 등록 완료 상태의 순수 컨텐츠 컴포넌트
 * Store에서 직접 필요한 데이터를 구독하여 Props Drilling 완전 제거
 */
const RegisteredContent = () => {
  // 🎯 Store에서 필요한 데이터 직접 구독
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const nextExam = useJourneyStore(state => state.getNextExam());
  const locationInfo = useJourneyStore(state => state.locationInfo);
  const currentExam = useJourneyStore(state => state.getCurrentTask()?.exam);
  
  // 개발 모드에서만 데이터 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 RegisteredContent 직접 구독 데이터:', { 
      user: user?.name, 
      nextExam: nextExam?.title,
      patientState,
      locationInfo: locationInfo?.name
    });
  }
  return (
    <div className="space-y-4">
      {/* 등록 완료 확인 */}
      <div className="bg-green-50 rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <CheckCircleIcon className="w-16 h-16 text-green-600" />
        </div>
        <p className="text-lg text-green-800 font-medium">
          접수가 완료되었습니다
        </p>
        <p className="text-sm text-green-600 mt-2">
          {user?.name}님, 오늘의 검사 일정을 확인해주세요
        </p>
      </div>

      {/* 다음 검사 안내 */}
      {(currentExam || nextExam) && (
        <div className="bg-blue-50 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-blue-800">
                다음 검사: {(currentExam || nextExam)?.title || nextExam?.examName}
              </h3>
              <p className="text-blue-600 mt-1">
                {(currentExam || nextExam)?.location || locationInfo?.name || '검사실'}로 이동해주세요
              </p>
              {(currentExam || nextExam)?.description && (
                <p className="text-sm text-blue-500 mt-2">
                  {(currentExam || nextExam).description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 안내 사항 */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          안내사항
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 검사실로 이동 후 NFC 태그를 스캔해주세요</li>
          <li>• 대기 시간 중에는 휴대폰 진동을 켜두시기 바랍니다</li>
          <li>• 검사 준비사항이 있다면 미리 확인해주세요</li>
        </ul>
      </div>
    </div>
  );
};

RegisteredContent.displayName = 'RegisteredContent';

export default RegisteredContent;