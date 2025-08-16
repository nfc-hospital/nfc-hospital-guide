import React from 'react';
import PropTypes from 'prop-types';

/**
 * NFC 태그 및 시설 마커 오버레이 컴포넌트
 * NavigationNode 좌표를 SVG 좌표계로 변환하여 마커 표시
 */
const NFCMarkerOverlay = ({
  nodes = [],
  svgDimensions,
  showNFCTags = true,
  showExamRooms = true,
  onMarkerClick,
  highlightNodeId
}) => {
  // 좌표 변환 함수 (NavigationNode 좌표 -> SVG 좌표)
  const transformCoordinates = (x, y) => {
    // NavigationNode는 1000x800 좌표계 사용
    // SVG는 900x600 viewBox 사용
    const scaleX = svgDimensions.width / 1000;
    const scaleY = svgDimensions.height / 800;
    
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  // 노드 타입별 필터링
  const nfcNodes = nodes.filter(node => node.nfc_tag);
  const examNodes = nodes.filter(node => node.exam);
  const facilityNodes = nodes.filter(node => 
    !node.nfc_tag && !node.exam && ['facility', 'entrance', 'elevator'].includes(node.node_type)
  );

  const renderMarker = (node) => {
    const coords = transformCoordinates(node.x_coord, node.y_coord);
    const isHighlighted = highlightNodeId === node.node_id;
    
    // 마커 타입별 스타일 설정
    let markerClass = 'map-marker';
    let markerColor = '#9ca3af';
    let markerIcon = '📍';
    
    if (node.nfc_tag) {
      markerClass += ' nfc-marker';
      markerColor = '#2196F3';
      markerIcon = '📡';
    } else if (node.exam) {
      markerClass += ' exam-marker';
      markerColor = '#9C27B0';
      markerIcon = '🏥';
    } else if (node.node_type === 'elevator') {
      markerClass += ' elevator-marker';
      markerColor = '#607D8B';
      markerIcon = '🛗';
    } else if (node.node_type === 'entrance') {
      markerClass += ' entrance-marker';
      markerColor = '#4CAF50';
      markerIcon = '🚪';
    }

    if (isHighlighted) {
      markerClass += ' highlighted';
    }

    return (
      <g
        key={node.node_id}
        className={markerClass}
        transform={`translate(${coords.x}, ${coords.y})`}
        onClick={() => onMarkerClick && onMarkerClick(node)}
        style={{ cursor: 'pointer' }}
      >
        {/* 마커 배경 원 */}
        <circle
          r={isHighlighted ? 20 : 15}
          fill={markerColor}
          fillOpacity={0.9}
          stroke="white"
          strokeWidth="2"
        />
        
        {/* 하이라이트 애니메이션 */}
        {isHighlighted && (
          <circle
            r="25"
            fill="none"
            stroke={markerColor}
            strokeWidth="2"
            opacity="0.5"
            className="pulse-animation"
          />
        )}
        
        {/* 마커 아이콘 텍스트 */}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="12"
          fill="white"
          style={{ pointerEvents: 'none' }}
        >
          {markerIcon}
        </text>
        
        {/* 마커 라벨 */}
        <text
          y="30"
          textAnchor="middle"
          fontSize="11"
          fill="#333"
          fontWeight="500"
          style={{ pointerEvents: 'none' }}
        >
          {node.name}
        </text>
      </g>
    );
  };

  return (
    <svg
      className="marker-overlay"
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
      <defs>
        {/* 펄스 애니메이션 정의 */}
        <style>
          {`
            @keyframes pulse {
              0% {
                r: 25;
                opacity: 0.5;
              }
              50% {
                r: 35;
                opacity: 0.2;
              }
              100% {
                r: 25;
                opacity: 0.5;
              }
            }
            
            .pulse-animation {
              animation: pulse 2s infinite;
            }
            
            .map-marker {
              transition: all 0.3s ease;
            }
            
            .map-marker:hover circle:first-child {
              r: 18;
              filter: brightness(1.2);
            }
          `}
        </style>
      </defs>

      {/* 시설 마커 (항상 표시) */}
      <g id="facility-markers">
        {facilityNodes.map(renderMarker)}
      </g>

      {/* NFC 태그 마커 */}
      {showNFCTags && (
        <g id="nfc-markers" style={{ pointerEvents: 'auto' }}>
          {nfcNodes.map(renderMarker)}
        </g>
      )}

      {/* 검사실 마커 */}
      {showExamRooms && (
        <g id="exam-markers" style={{ pointerEvents: 'auto' }}>
          {examNodes.map(renderMarker)}
        </g>
      )}
    </svg>
  );
};

NFCMarkerOverlay.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    node_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    node_type: PropTypes.string,
    x_coord: PropTypes.number.isRequired,
    y_coord: PropTypes.number.isRequired,
    nfc_tag: PropTypes.object,
    exam: PropTypes.object
  })),
  svgDimensions: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }).isRequired,
  showNFCTags: PropTypes.bool,
  showExamRooms: PropTypes.bool,
  onMarkerClick: PropTypes.func,
  highlightNodeId: PropTypes.string
};

export default NFCMarkerOverlay;