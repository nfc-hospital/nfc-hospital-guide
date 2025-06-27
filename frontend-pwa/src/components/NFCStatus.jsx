import { useEffect, useState } from 'react';

export default function NFCStatus({ isSupported }) {
  return (
    <div className="text-center">
      {isSupported ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">NFC 스캔 준비 완료</h3>
          <p className="text-gray-600">
            휴대폰을 NFC 태그에 가까이 대어주세요
          </p>
          <div className="animate-pulse flex justify-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-primary-300 rounded-full"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">NFC를 사용할 수 없습니다</h3>
          <p className="text-gray-600">
            이 기기에서는 NFC 기능을 지원하지 않습니다.<br />
            NFC를 지원하는 기기로 다시 시도해주세요.
          </p>
        </div>
      )}
    </div>
  );
}