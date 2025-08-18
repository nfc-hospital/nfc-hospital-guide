import React from 'react';
import MapNavigator from './MapNavigator';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const DepartmentDirections = ({ department, onClose }) => {
  const getDepartmentInfo = (deptName) => {
    // 진료과별 위치 정보 매핑
    const departmentMap = {
      // 주요 시설 - 1층
      응급실: {
        building: '본관',
        floor: 1,
        roomNumber: '응급실',
        directions: '정문 입구 좌측',
        mapId: 'main_1f'
      },
      약국: {
        building: '본관',
        floor: 1,
        roomNumber: '약국',
        directions: '로비에서 우측',
        mapId: 'main_1f'
      },
      원무과: {
        building: '본관',
        floor: 1,
        roomNumber: '원무과',
        directions: '정문 입구 정면',
        mapId: 'main_1f'
      },
      안내데스크: {
        building: '본관',
        floor: 1,
        roomNumber: '안내',
        directions: '정문 입구 중앙',
        mapId: 'main_1f'
      },
      // 진료과
      이비인후과: {
        building: '본관',
        floor: 3,
        roomNumber: '304',
        directions: '엘리베이터에서 우측으로 30m',
        mapId: 'main-3f'
      },
      안과: {
        building: '본관',
        floor: 3,
        roomNumber: '303',
        directions: '엘리베이터에서 우측으로 20m',
        mapId: 'main-3f'
      },
      정형외과: {
        building: '신관',
        floor: 2,
        roomNumber: '201',
        directions: '엘리베이터에서 좌측으로 10m',
        mapId: 'annex-2f'
      },
      내과: {
        building: '본관',
        floor: 2,
        roomNumber: '202',
        directions: '엘리베이터에서 직진 후 좌측',
        mapId: 'main-2f'
      },
      // 다른 진료과 정보 추가...
    };

    return departmentMap[deptName] || {
      building: '본관',
      floor: 1,
      roomNumber: '101',
      directions: '엘리베이터 이용 후 안내 표지판을 따라가세요',
      mapId: 'main-1f'
    };
  };

  const deptInfo = getDepartmentInfo(department);

  return (
    <div className="department-directions bg-white rounded-2xl p-6 space-y-6">
      {/* 뒤로가기 버튼 */}
      <button 
        onClick={onClose}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="font-medium">뒤로가기</span>
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{department}</h2>
        <p className="text-lg text-text-secondary">
          {deptInfo.building} {deptInfo.floor}층 {deptInfo.roomNumber}호
        </p>
      </div>

      <div className="space-y-4">
        <button 
          className="btn btn-primary w-full"
          onClick={() => {
            // 음성 안내 시작
            const speech = new SpeechSynthesisUtterance();
            speech.text = `${department}는 ${deptInfo.building} ${deptInfo.floor}층 ${deptInfo.roomNumber}호입니다. ${deptInfo.directions}`;
            speech.lang = 'ko-KR';
            window.speechSynthesis.speak(speech);
          }}
        >
          <span className="text-2xl mr-2">🔊</span>
          음성으로 듣기
        </button>

        {/* 경로 설명 - 더 눈에 띄게 디자인 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">가는 방법</h3>
              <p className="text-lg font-bold text-blue-700">
                {deptInfo.directions}
              </p>
            </div>
          </div>
        </div>

        <div className="map-container rounded-xl overflow-hidden border-2 border-border">
          <MapNavigator 
            mapId={deptInfo.mapId} 
            highlightRoom={deptInfo.roomNumber} 
            facilityName={department}
          />
        </div>
      </div>
    </div>
  );
};

export default DepartmentDirections; 