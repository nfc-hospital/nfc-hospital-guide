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
  const nextExam = useJourneyStore(state => state.nextExam);
  const locationInfo = useJourneyStore(state => state.locationInfo);

  // 다음 검사실 위치 정보 (locationInfo 우선 사용)
  const getNextExamLocation = () => {
    if (locationInfo) {
      const parts = [];
      if (locationInfo.building) parts.push(locationInfo.building);
      if (locationInfo.floor) parts.push(locationInfo.floor);
      if (locationInfo.room) parts.push(locationInfo.room);
      return parts.length > 0 ? parts.join(' ') : locationInfo.name || '검사실';
    }

    if (nextExam) {
      const parts = [];
      if (nextExam.building) parts.push(nextExam.building);
      if (nextExam.floor) parts.push(nextExam.floor);
      if (nextExam.room) parts.push(nextExam.room);
      return parts.length > 0 ? parts.join(' ') : nextExam.department || '검사실';
    }

    return '검사실';
  };

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
      {nextExam && (
        <div className="bg-blue-50 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-blue-800">
                다음 검사: {locationInfo?.name || nextExam.title}
              </h3>
              <p className="text-blue-600 mt-1">
                {getNextExamLocation()}로 이동해주세요
              </p>
              {(locationInfo?.description || nextExam.description) && (
                <p className="text-sm text-blue-500 mt-2">
                  {locationInfo?.description || nextExam.description}
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