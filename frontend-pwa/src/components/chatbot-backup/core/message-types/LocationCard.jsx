const LocationCard = ({ message }) => {
  const locationData = message.locationData || {};
  
  const handleDirectionsClick = () => {
    // 네비게이션 이벤트 발송
    window.dispatchEvent(new CustomEvent('navigate-to-location', {
      detail: {
        target: locationData.room || locationData.name,
        floor: locationData.floor,
        building: locationData.building
      }
    }));
  };

  const handleMapClick = () => {
    // 지도 보기 이벤트 발송
    window.dispatchEvent(new CustomEvent('show-map', {
      detail: {
        location: locationData
      }
    }));
  };

  return (
    <div className="location-card">
      <div className="card-header">
        <h3 className="card-title">
          📍 {locationData.name || '위치'} 안내
        </h3>
      </div>
      
      <div className="card-divider"></div>
      
      {/* 위치 이미지/맵 */}
      <div className="location-visual">
        {locationData.mapImage ? (
          <div className="location-map">
            <img 
              src={locationData.mapImage} 
              alt={`${locationData.name} 위치 지도`}
              className="map-image"
              onClick={handleMapClick}
            />
            <div className="map-overlay">
              <span className="map-click-hint">클릭하여 크게 보기</span>
            </div>
          </div>
        ) : (
          <div className="location-placeholder">
            <div className="placeholder-icon">🗺️</div>
            <div className="placeholder-text">지도 준비 중</div>
          </div>
        )}
      </div>
      
      {/* 위치 정보 */}
      <div className="location-details">
        <div className="detail-row primary">
          <span className="detail-icon">🏢</span>
          <span className="detail-text">
            {locationData.building || '본관'} {locationData.floor || ''}층 {locationData.room || ''}
          </span>
        </div>
        
        {locationData.landmarks && (
          <div className="detail-row">
            <span className="detail-icon">🎯</span>
            <span className="detail-text">
              {locationData.landmarks.join(', ')} 근처
            </span>
          </div>
        )}
        
        {locationData.accessibility && (
          <div className="detail-row accessibility">
            <span className="detail-icon">♿</span>
            <span className="detail-text">
              {locationData.accessibility.join(', ')}
            </span>
          </div>
        )}
        
        {locationData.openHours && (
          <div className="detail-row">
            <span className="detail-icon">🕒</span>
            <span className="detail-text">
              운영시간: {locationData.openHours}
            </span>
          </div>
        )}
      </div>
      
      <div className="card-divider"></div>
      
      {/* 액션 버튼들 */}
      <div className="location-actions">
        <button 
          className="action-btn primary"
          onClick={handleDirectionsClick}
          aria-label={`${locationData.name || '목적지'}로 길찾기`}
        >
          <span className="btn-icon">🧭</span>
          <span className="btn-text">길찾기</span>
        </button>
        
        <button 
          className="action-btn secondary"
          onClick={handleMapClick}
          aria-label="병원 지도 보기"
        >
          <span className="btn-icon">🗺️</span>
          <span className="btn-text">지도 보기</span>
        </button>
        
        {locationData.phone && (
          <button 
            className="action-btn secondary"
            onClick={() => window.open(`tel:${locationData.phone}`)}
            aria-label={`${locationData.name} 전화 걸기`}
          >
            <span className="btn-icon">📞</span>
            <span className="btn-text">전화</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationCard;