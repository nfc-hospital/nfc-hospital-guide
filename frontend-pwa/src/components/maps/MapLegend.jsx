import React from 'react';

/**
 * 지도 범례 컴포넌트
 */
const MapLegend = () => {
  const legendItems = [
    { icon: '📡', label: 'NFC 태그', color: '#2196F3' },
    { icon: '🏥', label: '검사실', color: '#9C27B0' },
    { icon: '🛗', label: '엘리베이터', color: '#607D8B' },
    { icon: '🚪', label: '출입구', color: '#4CAF50' },
    { icon: '📍', label: '시설', color: '#9ca3af' }
  ];

  return (
    <div className="map-legend">
      <h3>범례</h3>
      <div className="legend-items">
        {legendItems.map((item, index) => (
          <div key={index} className="legend-item">
            <span 
              className="legend-icon"
              style={{ backgroundColor: item.color }}
            >
              {item.icon}
            </span>
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapLegend;