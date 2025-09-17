import React from 'react';
import { UserPlusIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import useJourneyStore from '../../../store/journeyStore';
import useLocationStore from '../../../store/locationStore';

/**
 * UnregisteredContent - 미등록 상태의 순수 컨텐츠 컴포넌트
 * Store에서 직접 필요한 데이터를 구독하여 Props Drilling 완전 제거
 */
const UnregisteredContent = () => {
  // 🎯 Store에서 필요한 데이터 직접 구독
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const taggedLocation = useLocationStore(state => state.getCurrentLocation());
  
  // 개발 모드에서만 데이터 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 UnregisteredContent 직접 구독 데이터:', { 
      user: user?.name, 
      taggedLocation: taggedLocation?.name,
      patientState
    });
  }
  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-blue-50 rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <UserPlusIcon className="w-16 h-16 text-blue-600" />
        </div>
        <p className="text-lg text-blue-800 font-medium">
          병원 안내 시스템에 오신 것을 환영합니다
        </p>
        <p className="text-sm text-blue-600 mt-2">
          NFC 태그를 스캔하여 병원 내 위치를 확인하고 안내를 받으세요
        </p>
      </div>

      {/* NFC 스캔 안내 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start space-x-3">
          <ClipboardDocumentListIcon className="w-6 h-6 text-gray-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-gray-800">
              NFC 태그 스캔 방법
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• 휴대폰의 NFC 기능을 켜주세요</li>
              <li>• 병원 내 안내판의 NFC 태그에 휴대폰을 가까이 대주세요</li>
              <li>• 자동으로 해당 위치의 정보와 안내를 받을 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 서비스 안내 */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          이용 가능한 서비스
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 실시간 대기순서 확인</li>
          <li>• 검사실 위치 안내</li>
          <li>• 검사 준비사항 확인</li>
          <li>• AI 챗봇 상담</li>
        </ul>
      </div>

      {taggedLocation && (
        <div className="bg-green-50 rounded-2xl p-6">
          <p className="text-green-800 font-medium">
            📍 현재 위치: {taggedLocation.description || taggedLocation.name}
          </p>
          <p className="text-sm text-green-600 mt-1">
            로그인하시면 개인화된 안내를 받을 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
};

UnregisteredContent.displayName = 'UnregisteredContent';

export default UnregisteredContent;