import React from 'react';

const MapNavigator = ({ mapId, highlightRoom }) => {
  // 지도 이미지 매핑
  const mapImages = {
    'main-1f': '/images/maps/main-1f.svg',
    'main-2f': '/images/maps/main-2f.svg',
    'main-3f': '/images/maps/main-3f.svg',
    'annex-1f': '/images/maps/annex-1f.svg',
    'annex-2f': '/images/maps/annex-2f.svg',
    'default': '/images/maps/default.svg'
  };

  const mapSrc = mapImages[mapId] || mapImages.default;

  return (
    <div className="relative w-full aspect-[4/3]">
      <img
        src={mapSrc}
        alt={`${mapId} 층별 안내도`}
        className="w-full h-full object-contain"
      />
      {highlightRoom && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <div className="bg-primary-blue/20 p-4 rounded-xl animate-pulse">
            <span className="text-xl font-bold text-primary-blue">
              {highlightRoom}호
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapNavigator;