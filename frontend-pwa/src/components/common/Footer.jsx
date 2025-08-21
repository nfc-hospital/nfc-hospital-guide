import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <h3 className="text-xs font-semibold text-gray-900 tracking-wider uppercase mb-2">
              병원 정보
            </h3>
            <p className="text-gray-600 text-xs">
              서울특별시 종로구 대학로 101<br />
              대표전화: 1588-0000
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-gray-900 tracking-wider uppercase mb-2">
              운영시간
            </h3>
            <p className="text-gray-600 text-xs">
              평일: 09:00 - 17:30<br />
              토요일: 09:00 - 13:00<br />
              일요일/공휴일: 응급실만 운영
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-gray-900 tracking-wider uppercase mb-2">
              긴급연락처
            </h3>
            <p className="text-gray-600 text-xs">
              응급실: 02-0000-0000<br />
              종합상담: 02-0000-0001
            </p>
          </div>
        </div>
        
        <div className="mt-4 border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-500">
            © 2024 NFC Hospital Guide. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}