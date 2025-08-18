import React, { useState, useEffect } from 'react';
import InteractiveMapViewer from './InteractiveMapViewer';

/**
 * DepartmentDirections 컴포넌트
 * 비로그인 사용자를 위한 진료과 위치 안내
 * 개요 지도(Overview Map)를 사용하여 큰 단위의 구역 표시
 */
const DepartmentDirections = ({ department, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  // 디버깅: props 확인
  console.log('DepartmentDirections props:', department);

  useEffect(() => {
    if (department) {
      setIsVisible(true);
      // 해당 진료과 영역 하이라이트
      highlightDepartment(department.svg_id);
    }
  }, [department]);

  const highlightDepartment = (svgId) => {
    // SVG 로드 후 해당 영역 하이라이트
    setTimeout(() => {
      const iframe = document.querySelector('.interactive-map');
      if (iframe && iframe.contentDocument) {
        const targetElement = iframe.contentDocument.getElementById(svgId);
        if (targetElement) {
          // 기존 하이라이트 제거
          const highlighted = iframe.contentDocument.querySelectorAll('.highlight');
          highlighted.forEach(el => el.classList.remove('highlight'));
          
          // 새로운 하이라이트 추가
          targetElement.classList.add('highlight');
        }
      }
    }, 500);
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  if (!department || !isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{department.icon || '🏥'}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {department.name} 위치 안내
              </h2>
              <p className="text-gray-600">
                {department.description || `${department.building} ${department.floor}`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-3xl text-gray-600 hover:text-gray-900 transition-colors p-2"
          >
            ×
          </button>
        </div>

        {/* 위치 정보 카드 */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📍</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                위치: {department.building} {department.floor}
              </h3>
              <p className="text-blue-700">
                아래 지도에서 <span className="font-semibold text-blue-800">파란색으로 표시된 영역</span>이 {department.name}입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 지도 영역 */}
        <div className="relative h-96 bg-gray-50">
          <InteractiveMapViewer 
            mapUrl={department.map_url || '/images/maps/overview_main_1f.svg'}
            highlightZoneId={department.svg_id}
            onRoomSelect={(roomData) => {
              // 진료과 존 클릭 시 상세 정보 표시 (옵션)
              console.log('Department zone clicked:', roomData);
            }}
          />
        </div>

        {/* 안내 정보 */}
        <div className="p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-green-900 mb-2">찾아가는 방법</h4>
                <ul className="text-green-800 space-y-1 text-sm">
                  <li>• 정문에서 입장 후, 지도를 참고하여 해당 구역으로 이동하세요</li>
                  <li>• 엘리베이터나 안내 데스크 근처에서 세부 위치를 확인할 수 있습니다</li>
                  <li>• 도움이 필요하시면 안내 데스크나 직원에게 문의하세요</li>
                </ul>
              </div>
            </div>
          </div>

          {department.zone_type === 'DEPARTMENT' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">진료 시간 안내</h4>
                  <p className="text-amber-800 text-sm">
                    진료 시간은 평일 09:00 ~ 18:00입니다. 
                    정확한 진료 시간은 원무과에서 확인하시기 바랍니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold
                     hover:bg-blue-700 transition-colors duration-200"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDirections;