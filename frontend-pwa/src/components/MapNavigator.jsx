import { useEffect, useState } from 'react';

const MapNavigator = ({ location }) => {
  const [showFullMap, setShowFullMap] = useState(false);
  
  // 실제 구현에서는 병원 지도 이미지를 불러오거나
  // SVG 기반 지도 컴포넌트를 만들 수 있음
  const hospitalMap = {
    '본관 3층 영상의학과': {
      building: '본관',
      floor: 3,
      department: '영상의학과',
      route: '1층 로비에서 엘리베이터 3번을 타고 3층으로 이동 후 우측 복도 끝',
      mapUrl: '/images/maps/main-3f.svg' // 실제 경로로 변경 필요
    },
    '별관 1층 검사실': {
      building: '별관',
      floor: 1,
      department: '검사실',
      route: '본관에서 연결통로를 따라 별관으로 이동 후 1층 중앙 위치',
      mapUrl: '/images/maps/annex-1f.svg' // 실제 경로로 변경 필요
    }
  };
  
  const currentLocation = hospitalMap[location] || {
    building: '알 수 없음',
    floor: 0,
    department: '알 수 없음',
    route: '안내데스크에 문의해주세요',
    mapUrl: '/images/maps/default.svg'
  };
  
  const toggleFullMap = () => {
    setShowFullMap(!showFullMap);
  };
  
  return (
    <div className="section-container map-navigator-container">
      <h3>검사실 위치 안내</h3>
      
      <div className="location-info">
        <div className="location-icon">📍</div>
        <div className="location-details">
          <p className="building-info">
            <span className="building-name">{currentLocation.building}</span>
            <span className="floor-number">{currentLocation.floor}층</span>
          </p>
          <p className="department-name">{currentLocation.department}</p>
        </div>
      </div>
      
      <div className="route-directions">
        <p>{currentLocation.route}</p>
      </div>
      
      <div className="map-preview" onClick={toggleFullMap}>
        {/* 실제 구현에서는 SVG 지도 또는 이미지로 대체 */}
        <div className="map-placeholder">
          <div className="map-icon">🗺️</div>
          <p>지도 보기</p>
        </div>
      </div>
      
      {showFullMap && (
        <div className="full-map-modal">
          <div className="modal-content">
            <button className="close-button" onClick={toggleFullMap}>✕</button>
            <h3>{location} 지도</h3>
            
            <div className="map-container">
              {/* 실제 구현에서는 SVG 지도 또는 이미지로 대체 */}
              <div className="map-placeholder large">
                <div className="map-icon large">🗺️</div>
                <p>상세 지도</p>
                <p className="map-note">{currentLocation.route}</p>
              </div>
            </div>
            
            <div className="map-controls">
              <button className="zoom-button">+</button>
              <button className="zoom-button">-</button>
              <button className="center-button">⌖</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapNavigator;