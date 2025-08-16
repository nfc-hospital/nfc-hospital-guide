import React, { useState, useEffect } from 'react';
import InteractiveMapViewer from '../components/maps/InteractiveMapViewer';
import SimpleMapViewer from '../components/maps/SimpleMapViewer';
import './MapTest.css';

/**
 * 병원 지도 테스트 페이지
 * InteractiveMapViewer 컴포넌트를 사용하여 SVG 요소 직접 활용
 */
const MapTest = () => {
  const [currentFloor, setCurrentFloor] = useState('main_1f');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [highlightRoom, setHighlightRoom] = useState(null);
  const [navigationPath, setNavigationPath] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [useSimple, setUseSimple] = useState(false);

  // 층 정보
  const floors = [
    { id: 'main_1f', building: '본관', floor: '1층', name: '본관 1층' },
    { id: 'main_2f', building: '본관', floor: '2층', name: '본관 2층' },
    { id: 'cancer_1f', building: '암센터', floor: '1층', name: '암센터 1층' },
    { id: 'cancer_2f', building: '암센터', floor: '2층', name: '암센터 2층' }
  ];

  // 테스트용 경로 데이터
  const testRoutes = {
    'main_1f': {
      emergency_to_lab: {
        path: 'M 200 200 L 350 200 L 350 160 L 480 160',
        steps: [
          '응급의료센터에서 출발',
          '복도를 따라 직진',
          '진단검사의학과 도착'
        ]
      },
      lab_to_blood: {
        path: 'M 480 160 L 580 160 L 580 160 L 680 160',
        steps: [
          '진단검사의학과에서 출발',
          '오른쪽 복도로 이동',
          '채혈실 도착'
        ]
      }
    },
    'main_2f': {
      waiting_to_clinic1: {
        path: 'M 450 140 L 450 240 L 215 240 L 215 290',
        steps: [
          '내과 대기실에서 출발',
          '복도를 따라 좌회전',
          '내과 진료실 1 도착'
        ]
      }
    },
    'cancer_1f': {
      lobby_to_radiation: {
        path: 'M 450 300 L 600 300 L 600 270 L 740 270',
        steps: [
          '암센터 로비에서 출발',
          '동쪽 복도로 이동',
          '방사선치료실 도착'
        ]
      }
    },
    'cancer_2f': {
      reception_to_mri: {
        path: 'M 150 140 L 300 140 L 300 270 L 560 270',
        steps: [
          '영상의학과 접수에서 출발',
          '복도를 따라 우회전',
          'MRI실 도착'
        ]
      }
    }
  };

  // 방 클릭 핸들러
  const handleRoomClick = (roomData) => {
    console.log('방 클릭:', roomData);
    setSelectedRoom(roomData);
    
    // 선택된 방 하이라이트
    setHighlightRoom(roomData.roomId);
  };

  // 테스트 경로 생성
  const testRoute = () => {
    console.log('테스트 경로 생성 클릭');
    console.log('선택된 방:', selectedRoom);
    
    if (!selectedRoom) {
      alert('먼저 지도에서 방을 클릭해주세요!');
      return;
    }
    
    // 현재 층의 테스트 경로 중 하나 선택
    const floorRoutes = testRoutes[currentFloor];
    if (floorRoutes) {
      const routeKeys = Object.keys(floorRoutes);
      const randomRoute = floorRoutes[routeKeys[0]]; // 첫 번째 경로 사용
      
      console.log('경로 설정:', randomRoute);
      setNavigationPath(randomRoute.path);
      setRouteInfo({
        from: randomRoute.steps[0].split('에서')[0],
        to: randomRoute.steps[randomRoute.steps.length - 1].split(' 도착')[0],
        steps: randomRoute.steps
      });
    } else {
      alert('현재 층에 테스트 경로가 없습니다.');
    }
  };

  // 경로 초기화
  const clearRoute = () => {
    setNavigationPath(null);
    setRouteInfo(null);
    setHighlightRoom(null);
  };



  return (
    <div className="map-test-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <h1>🏥 병원 지도 시스템 테스트</h1>
        <p>InteractiveMapViewer - SVG 요소 직접 활용</p>
        <button 
          onClick={() => setUseSimple(!useSimple)}
          style={{ marginTop: '10px', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          {useSimple ? '고급 버전 사용' : '간단한 버전 사용'}
        </button>
      </div>

      <div className="test-container">
        {/* 층 선택 탭 */}
        <div className="floor-tabs">
          {floors.map(floor => (
            <div
              key={floor.id}
              className={`floor-tab ${currentFloor === floor.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentFloor(floor.id);
                clearRoute();
                setSelectedRoom(null);
              }}
            >
              <span className="building-badge">{floor.building}</span>
              <span className="floor-name">{floor.floor}</span>
            </div>
          ))}
        </div>

        {/* 컨트롤 패널 */}
        <div className="control-panel">
          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={showTooltip}
                onChange={(e) => setShowTooltip(e.target.checked)}
              />
              <span>툴팁 표시</span>
            </label>
            <label className="control-label">
              <input
                type="checkbox"
                checked={highlightRoom !== null}
                onChange={(e) => setHighlightRoom(e.target.checked ? selectedRoom?.roomId : null)}
                disabled={!selectedRoom}
              />
              <span>방 하이라이트</span>
            </label>
          </div>
          <div className="info-text">
            SVG 내부 요소를 클릭하여 상호작용하세요
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="main-content">
          {/* 지도 섹션 */}
          <div className="map-section">
            {useSimple ? (
              <SimpleMapViewer floorId={currentFloor} />
            ) : (
              <InteractiveMapViewer
                floorId={currentFloor}
                onRoomClick={handleRoomClick}
                highlightRoomId={highlightRoom}
                navigationPath={navigationPath}
                showTooltip={showTooltip}
              />
            )}
          </div>

          {/* 정보 섹션 */}
          <div className="info-section">
            {/* 선택된 방 정보 */}
            {selectedRoom && (
              <div className="node-info-card">
                <h3>📍 선택된 위치</h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="info-label">이름:</span>
                    <span className="info-value">{selectedRoom.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">타입:</span>
                    <span className="info-value">{selectedRoom.type}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">노드 ID:</span>
                    <span className="info-value">{selectedRoom.nodeId}</span>
                  </div>
                  <div className="info-row highlight">
                    <span className="info-label">층:</span>
                    <span className="info-value">{selectedRoom.floor}</span>
                  </div>
                  <button 
                    className="test-route-btn"
                    onClick={testRoute}
                  >
                    🗺️ 테스트 경로 생성
                  </button>
                </div>
              </div>
            )}

            {/* 경로 정보 */}
            {routeInfo && (
              <div className="route-info-card">
                <h3>🚶 경로 안내</h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="info-label">출발:</span>
                    <span className="info-value">{routeInfo.from}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">도착:</span>
                    <span className="info-value">{routeInfo.to}</span>
                  </div>
                  <div className="route-steps">
                    <h4>경로 단계</h4>
                    {routeInfo.steps.map((step, index) => (
                      <div key={index} className="step-item">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-instruction">{step}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="test-route-btn"
                    onClick={clearRoute}
                    style={{ background: '#ef4444' }}
                  >
                    ❌ 경로 초기화
                  </button>
                </div>
              </div>
            )}

            {/* 디버그 정보 */}
            <div className="debug-info">
              <h3>🔧 디버그 정보</h3>
              <div className="debug-content">
                <p>현재 층: {currentFloor}</p>
                <p>선택된 방: {selectedRoom?.roomId || '없음'}</p>
                <p>하이라이트: {highlightRoom || '없음'}</p>
                <p>경로 활성화: {navigationPath ? '예' : '아니오'}</p>
                <p>툴팁 표시: {showTooltip ? '예' : '아니오'}</p>
              </div>
            </div>

            {/* 좌표 매핑 정보 */}
            <div className="mapping-info">
              <h3>📐 좌표 시스템</h3>
              <div className="mapping-content">
                <p>SVG ViewBox: 900x600</p>
                <p>NavigationNode: 1000x800</p>
                <p>Scale X: 0.9</p>
                <p>Scale Y: 0.75</p>
                <p>방식: SVG 요소 직접 활용</p>
                <p>마커: 별도 오버레이 없음</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MapTest;