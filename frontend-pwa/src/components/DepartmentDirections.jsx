import React from 'react';
import MapNavigator from './MapNavigator';

const DepartmentDirections = ({ department, onClose }) => {
  const getDepartmentInfo = (deptName) => {
    // 진료과별 위치 정보 매핑
    const departmentMap = {
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
      // 다른 진료과 정보 추가...
    };

    return departmentMap[deptName] || {
      building: '안내데스크',
      floor: 1,
      roomNumber: '101',
      directions: '정확한 위치는 안내데스크에서 확인해주세요',
      mapId: 'main-1f'
    };
  };

  const deptInfo = getDepartmentInfo(department);

  return (
    <div className="department-directions card p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{department}</h2>
        <p className="text-lg text-text-secondary">
          {deptInfo.building} {deptInfo.floor}층 {deptInfo.roomNumber}호
        </p>
      </div>

      <div className="bg-primary-blue-light/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚶</span>
          <p className="text-lg text-primary-blue font-medium">
            {deptInfo.directions}
          </p>
        </div>
      </div>

      <div className="map-container rounded-xl overflow-hidden border-2 border-border">
        <MapNavigator mapId={deptInfo.mapId} highlightRoom={deptInfo.roomNumber} />
      </div>

      <div className="space-y-3">
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

        <button 
          className="btn btn-secondary w-full"
          onClick={onClose}
        >
          다른 진료과 찾기
        </button>
      </div>

      <div className="text-center">
        <button 
          className="text-text-secondary hover:text-primary-blue text-lg"
          onClick={() => window.print()}
        >
          <span className="text-xl mr-1">🖨️</span>
          안내문 인쇄하기
        </button>
      </div>
    </div>
  );
};

export default DepartmentDirections; 