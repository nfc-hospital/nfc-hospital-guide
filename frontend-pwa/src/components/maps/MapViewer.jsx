import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import NFCMarkerOverlay from './NFCMarkerOverlay';
import MapLegend from './MapLegend';
import './MapViewer.css';

/**
 * 병원 지도 뷰어 컴포넌트
 * SVG 지도 위에 NFC 태그와 시설 마커를 오버레이로 표시
 */
const MapViewer = ({ 
  floorId = 'main_1f', 
  showNFCTags = true, 
  showExamRooms = true,
  onMarkerClick = null,
  highlightNodeId = null,
  navigationPath = null 
}) => {
  const [mapData, setMapData] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 900, height: 600 });
  const svgContainerRef = useRef(null);

  // 층 정보 매핑
  const floorInfo = {
    'main_1f': { building: '본관', floor: 1, name: '본관 1층', svg: '/images/maps/main_1f.svg' },
    'main_2f': { building: '본관', floor: 2, name: '본관 2층', svg: '/images/maps/main_2f.svg' },
    'cancer_1f': { building: '암센터', floor: 1, name: '암센터 1층', svg: '/images/maps/cancer_1f.svg' },
    'cancer_2f': { building: '암센터', floor: 2, name: '암센터 2층', svg: '/images/maps/cancer_2f.svg' }
  };

  // NavigationNode 데이터 가져오기
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/navigation/maps/');
        if (!response.ok) throw new Error('Failed to fetch map data');
        
        const result = await response.json();
        if (result.success && result.data) {
          setMapData(result.data);
          
          // 현재 층의 노드 필터링
          const currentFloor = floorInfo[floorId];
          const floorNodes = result.data.maps
            ?.find(m => m.building === currentFloor.building && m.floor === currentFloor.floor)
            ?.nodes || [];
          
          setNodes(floorNodes);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [floorId]);

  // SVG 크기 감지
  useEffect(() => {
    const updateDimensions = () => {
      if (svgContainerRef.current) {
        const svg = svgContainerRef.current.querySelector('svg');
        if (svg) {
          const viewBox = svg.getAttribute('viewBox');
          if (viewBox) {
            const [, , width, height] = viewBox.split(' ').map(Number);
            setSvgDimensions({ width, height });
          }
        }
      }
    };

    // SVG 로드 후 크기 업데이트
    const timer = setTimeout(updateDimensions, 500);
    return () => clearTimeout(timer);
  }, [floorId]);

  const handleMarkerClick = (node) => {
    console.log('Marker clicked:', node);
    if (onMarkerClick) {
      onMarkerClick(node);
    }
  };

  if (loading) {
    return (
      <div className="map-viewer-loading">
        <div className="spinner"></div>
        <p>지도를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-viewer-error">
        <p>지도를 불러올 수 없습니다.</p>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  const currentFloorInfo = floorInfo[floorId];

  return (
    <div className="map-viewer-container">
      {/* 지도 헤더 */}
      <div className="map-header">
        <h2>{currentFloorInfo.name}</h2>
        <div className="map-controls">
          <label className="control-checkbox">
            <input 
              type="checkbox" 
              checked={showNFCTags} 
              onChange={(e) => console.log('Toggle NFC tags:', e.target.checked)}
            />
            <span>NFC 태그</span>
          </label>
          <label className="control-checkbox">
            <input 
              type="checkbox" 
              checked={showExamRooms} 
              onChange={(e) => console.log('Toggle exam rooms:', e.target.checked)}
            />
            <span>검사실</span>
          </label>
        </div>
      </div>

      {/* SVG 지도 컨테이너 */}
      <div className="map-svg-container" ref={svgContainerRef}>
        {/* 기본 SVG 지도 */}
        <object 
          data={currentFloorInfo.svg} 
          type="image/svg+xml"
          className="base-map-svg"
          aria-label={`${currentFloorInfo.name} 평면도`}
        >
          <img src={currentFloorInfo.svg} alt={`${currentFloorInfo.name} 평면도`} />
        </object>

        {/* NFC 마커 오버레이 */}
        <NFCMarkerOverlay
          nodes={nodes}
          svgDimensions={svgDimensions}
          showNFCTags={showNFCTags}
          showExamRooms={showExamRooms}
          onMarkerClick={handleMarkerClick}
          highlightNodeId={highlightNodeId}
        />

        {/* 네비게이션 경로 오버레이 */}
        {navigationPath && (
          <svg 
            className="navigation-overlay"
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <path 
              d={navigationPath}
              fill="none"
              stroke="#2196F3"
              strokeWidth="3"
              strokeDasharray="10,5"
              opacity="0.8"
            />
          </svg>
        )}
      </div>

      {/* 범례 */}
      <MapLegend />
    </div>
  );
};

MapViewer.propTypes = {
  floorId: PropTypes.oneOf(['main_1f', 'main_2f', 'cancer_1f', 'cancer_2f']),
  showNFCTags: PropTypes.bool,
  showExamRooms: PropTypes.bool,
  onMarkerClick: PropTypes.func,
  highlightNodeId: PropTypes.string,
  navigationPath: PropTypes.string
};

export default MapViewer;