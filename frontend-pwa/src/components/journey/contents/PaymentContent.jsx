import React from 'react';
import { CreditCardIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

/**
 * PaymentContent - 수납 상태의 순수 컨텐츠 컴포넌트
 * 템플릿 래핑 없이 순수 컨텐츠만 제공
 */
export default function PaymentContent({ 
  // 필요한 데이터만 props로 받음
  user,
  patientState,
  locationInfo,
  completionStats
}) {
  return (
    <div className="space-y-6">
      {/* 수납 안내 메시지 */}
      <div className="bg-blue-50 rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <CreditCardIcon className="w-16 h-16 text-blue-600" />
        </div>
        <p className="text-lg text-blue-800 font-medium">
          {user?.name}님, 수납을 위해 원무과로 이동해주세요
        </p>
        <p className="text-sm text-blue-600 mt-2">
          검사가 완료되었습니다. 수납 후 귀가하실 수 있습니다.
        </p>
      </div>

      {/* 수납 위치 안내 */}
      <div className="bg-green-50 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <MapPinIcon className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-green-800">
              수납 위치: {locationInfo?.name || '원무과 수납창구'}
            </h3>
            <p className="text-green-600 mt-1">
              {locationInfo?.building || '본관'} {locationInfo?.floor || '1층'} {locationInfo?.room || '중앙홀'}
            </p>
            {locationInfo?.directions && (
              <p className="text-sm text-green-500 mt-2">
                {locationInfo.directions}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 검사 완료 확인 */}
      {completionStats && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-medium text-gray-800">
              검사 완료 현황
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">
                {completionStats.completedCount || 0}
              </p>
              <p className="text-sm text-green-500">완료된 검사</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">
                {completionStats.totalCount || 0}
              </p>
              <p className="text-sm text-blue-500">총 검사</p>
            </div>
          </div>
        </div>
      )}

      {/* 수납 관련 안내 */}
      <div className="bg-amber-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-amber-800 mb-3">
          💳 수납 관련 안내
        </h3>
        <ul className="space-y-2 text-sm text-amber-700">
          <li>• 신용카드, 현금, 계좌이체 모두 가능합니다</li>
          <li>• 건강보험 적용 여부를 확인해주세요</li>
          <li>• 영수증을 꼭 챙겨가시기 바랍니다</li>
          <li>• 추가 진료비가 발생할 수 있습니다</li>
        </ul>
      </div>

      {/* 준비물 체크리스트 */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          📋 수납 시 준비물
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 신분증 (주민등록증, 운전면허증)</li>
          <li>• 건강보험증</li>
          <li>• 결제 수단 (카드, 현금, 통장)</li>
          <li>• 진료비 계산서 (접수 시 받은 서류)</li>
        </ul>
      </div>
    </div>
  );
}