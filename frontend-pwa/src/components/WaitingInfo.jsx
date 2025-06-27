import { useEffect, useState } from 'react';

export default function WaitingInfo({ position, etaMin }) {
  if (!position) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        현재 대기 상태
      </h2>
      
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-3xl font-bold text-primary-600">
            {position}번
          </div>
          <p className="text-sm text-gray-500 mt-1">
            대기 순서
          </p>
        </div>
        
        <div>
          <div className="text-3xl font-bold text-primary-600">
            {etaMin}분
          </div>
          <p className="text-sm text-gray-500 mt-1">
            예상 대기 시간
          </p>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mt-4 text-center">
        * 예상 대기 시간은 실제와 다를 수 있습니다
      </p>
    </div>
  );
}