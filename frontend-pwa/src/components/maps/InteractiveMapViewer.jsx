import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import MapLegend from './MapLegend';
import './InteractiveMapViewer.css';

/**
 * 개선된 병원 지도 뷰어 컴포넌트
 * SVG 내부 요소를 직접 활용하여 인터랙티브 기능 구현
 * 별도 마커 오버레이 없이 기존 SVG 디자인 활용
 */
const InteractiveMapViewer = ({ 
  floorId = 'main_1f', 
  onRoomClick = null,
  highlightRoomId = null,
  navigationPath = null,
  showTooltip = true
}) => {
  const [mapData, setMapData] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [svgContent, setSvgContent] = useState('');
  const svgContainerRef = useRef(null);
  const svgRef = useRef(null);

  // 층 정보 매핑
  const floorInfo = {
    'main_1f': { 
      building: '본관', 
      floor: 1, 
      name: '본관 1층', 
      svg: '/images/maps/main_1f.svg',
      rooms: {
        'emergency': { name: '응급의료센터', type: 'medical', node_id: 'node-001' },
        'lab': { name: '진단검사의학과', type: 'medical', node_id: 'node-002' },
        'blood': { name: '채혈실', type: 'medical', node_id: 'node-003' },
        'donation': { name: '헌혈실', type: 'medical', node_id: 'node-004' },
        'convenience': { name: '편의점', type: 'facility', node_id: 'node-005' },
        'cafe': { name: '카페', type: 'facility', node_id: 'node-006' },
        'bank': { name: '은행', type: 'facility', node_id: 'node-007' }
      }
    },
    'main_2f': { 
      building: '본관', 
      floor: 2, 
      name: '본관 2층', 
      svg: '/images/maps/main_2f.svg',
      rooms: {
        'waiting': { name: '내과 대기실', type: 'waiting', node_id: 'node-101' },
        'clinic1': { name: '내과 진료실 1', type: 'clinic', node_id: 'node-102' },
        'clinic2': { name: '내과 진료실 2', type: 'clinic', node_id: 'node-103' },
        'clinic3': { name: '내과 진료실 3', type: 'clinic', node_id: 'node-104' },
        'treatment': { name: '처치실', type: 'medical', node_id: 'node-105' },
        'consultation': { name: '상담실', type: 'clinic', node_id: 'node-106' },
        'nurse': { name: '간호사실', type: 'facility', node_id: 'node-107' }
      }
    },
    'cancer_1f': { 
      building: '암센터', 
      floor: 1, 
      name: '암센터 1층', 
      svg: '/images/maps/cancer_1f.svg',
      rooms: {
        'lobby': { name: '암센터 로비', type: 'facility', node_id: 'node-201' },
        'consult1': { name: '상담실 1', type: 'clinic', node_id: 'node-202' },
        'consult2': { name: '상담실 2', type: 'clinic', node_id: 'node-203' },
        'radiation': { name: '방사선치료실', type: 'medical', node_id: 'node-204' },
        'chemo': { name: '항암치료실', type: 'medical', node_id: 'node-205' },
        'waiting': { name: '치료 대기실', type: 'waiting', node_id: 'node-206' },
        'rest': { name: '휴게실', type: 'facility', node_id: 'node-207' }
      }
    },
    'cancer_2f': { 
      building: '암센터', 
      floor: 2, 
      name: '암센터 2층', 
      svg: '/images/maps/cancer_2f.svg',
      rooms: {
        'reception': { name: '영상의학과 접수', type: 'facility', node_id: 'node-301' },
        'waiting': { name: '검사 대기실', type: 'waiting', node_id: 'node-302' },
        'ct': { name: 'CT실', type: 'medical', node_id: 'node-303' },
        'mri': { name: 'MRI실', type: 'medical', node_id: 'node-304' },
        'xray': { name: 'X-ray실', type: 'medical', node_id: 'node-305' },
        'ultrasound': { name: '초음파실', type: 'medical', node_id: 'node-306' },
        'changing': { name: '탈의실', type: 'facility', node_id: 'node-307' }
      }
    }
  };

  // SVG 로드
  useEffect(() => {
    let isMounted = true;
    
    const loadSVG = async () => {
      try {
        setLoading(true);
        setError(null);
        setSvgContent('');
        
        const currentFloorInfo = floorInfo[floorId];
        
        // SVG 파일 로드
        const response = await fetch(currentFloorInfo.svg);
        
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
        }
        
        const svgText = await response.text();
        
        if (isMounted) {
          setSvgContent(svgText);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading SVG:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadSVG();
    
    return () => {
      isMounted = false;
    };
  }, [floorId]);

  // SVG 요소 향상
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) {
      return;
    }
    
    // 약간의 지연을 주어 DOM이 완전히 렌더링되도록 함
    const timeoutId = setTimeout(() => {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (!svgElement) {
        return;
      }
      
      svgRef.current = svgElement;
      
      // SVG 스타일 적용
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.display = 'block';
      
      // 모든 text 요소의 pointer-events를 none으로 설정
      const textElements = svgElement.querySelectorAll('text');
      textElements.forEach(text => {
        text.style.pointerEvents = 'none';
      });
      
      // 인터랙티브 기능 추가
      const currentFloorInfo = floorInfo[floorId];
      enhanceSVGElements(svgElement, currentFloorInfo.rooms, floorId);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [svgContent, floorId]);

  // SVG 요소들을 인터랙티브하게 만들기
  const enhanceSVGElements = (svgElement, rooms, currentFloorId) => {
    // 모든 rect와 path 요소를 선택 (bg 클래스 제외)
    const allShapes = svgElement.querySelectorAll('rect:not(.bg), path:not(.doorway)');
    
    // 실제 방/시설인 요소만 필터링
    const interactiveElements = Array.from(allShapes).filter(shape => {
      const className = shape.getAttribute('class') || '';
      return className.includes('room') || 
             className.includes('medical') || 
             className.includes('clinic') || 
             className.includes('convenience') || 
             className.includes('treatment');
    });
    
    interactiveElements.forEach((element, index) => {
      // 클래스명으로 방 타입 식별
      const classList = element.getAttribute('class');
      let roomKey = null;
      
      // SVG 내 위치로 방 식별 (좌표 기반)
      let x, y;
      
      if (element.tagName === 'rect') {
        x = parseFloat(element.getAttribute('x'));
        y = parseFloat(element.getAttribute('y'));
      } else if (element.tagName === 'path') {
        // path의 경우 d 속성의 첫 번째 좌표를 사용
        const d = element.getAttribute('d');
        const match = d.match(/M\s*([\d.]+)\s+([\d.]+)/);
        if (match) {
          x = parseFloat(match[1]);
          y = parseFloat(match[2]);
        }
      }
      
      // 좌표 기반으로 방 매칭 (각 층별로 다르게 처리)
      if (currentFloorId === 'main_1f') {
        if (x >= 50 && x <= 350 && y >= 100 && y <= 300) roomKey = 'emergency';
        else if (x >= 380 && x <= 580 && y >= 100 && y <= 220) roomKey = 'lab';
        else if (x >= 610 && x <= 750 && y >= 100 && y <= 220) roomKey = 'blood';
        else if (x >= 50 && x <= 230 && y >= 350 && y <= 450) roomKey = 'donation';
        else if (x >= 470 && x <= 590 && y >= 280 && y <= 360) roomKey = 'convenience';
        else if (x >= 470 && x <= 590 && y >= 380 && y <= 460) roomKey = 'cafe';
        else if (x >= 620 && x <= 740 && y >= 280 && y <= 460) roomKey = 'bank';
      } else if (currentFloorId === 'main_2f') {
        if (x >= 300 && x <= 600 && y >= 80 && y <= 200) roomKey = 'waiting';
        else if (x >= 150 && x <= 280 && y >= 240 && y <= 340) roomKey = 'clinic1';
        else if (x >= 300 && x <= 430 && y >= 240 && y <= 340) roomKey = 'clinic2';
        else if (x >= 450 && x <= 580 && y >= 240 && y <= 340) roomKey = 'clinic3';
        else if (x >= 150 && x <= 280 && y >= 380 && y <= 480) roomKey = 'treatment';
        else if (x >= 620 && x <= 750 && y >= 380 && y <= 480) roomKey = 'consultation';
        else if (x >= 350 && x <= 550 && y >= 370 && y <= 450) roomKey = 'nurse';
      } else if (currentFloorId === 'cancer_1f') {
        if (x >= 80 && x <= 220 && y >= 200 && y <= 300) roomKey = 'consult1';
        else if (x >= 80 && x <= 220 && y >= 340 && y <= 440) roomKey = 'consult2';
        else if (x >= 650 && x <= 830 && y >= 200 && y <= 340) roomKey = 'radiation';
        else if (x >= 650 && x <= 830 && y >= 80 && y <= 180) roomKey = 'chemo';
        else if (x >= 300 && x <= 600 && y >= 80 && y <= 180) roomKey = 'waiting';
        else if (x >= 280 && x <= 500 && y >= 450 && y <= 550) roomKey = 'rest';
      } else if (currentFloorId === 'cancer_2f') {
        if (x >= 50 && x <= 250 && y >= 80 && y <= 200) roomKey = 'reception';
        else if (x >= 50 && x <= 250 && y >= 230 && y <= 360) roomKey = 'waiting';
        else if (x >= 280 && x <= 440 && y >= 190 && y <= 350) roomKey = 'ct';
        else if (x >= 470 && x <= 650 && y >= 190 && y <= 350) roomKey = 'mri';
        else if (x >= 50 && x <= 240 && y >= 390 && y <= 480) roomKey = 'xray';
        else if (x >= 270 && x <= 400 && y >= 380 && y <= 480) roomKey = 'ultrasound';
        else if (x >= 680 && x <= 770 && y >= 190 && y <= 290) roomKey = 'changing';
      }
      
      if (roomKey && rooms[roomKey]) {
        const roomData = rooms[roomKey];
        
        // 요소에 데이터 속성 추가
        element.setAttribute('data-room-id', roomKey);
        element.setAttribute('data-node-id', roomData.node_id);
        element.setAttribute('data-room-name', roomData.name);
        element.setAttribute('data-room-type', roomData.type);
        
        // 인터랙티브 클래스 추가
        element.classList.add('interactive-room');
        
        // 스타일 직접 설정
        element.style.cursor = 'pointer';
        element.style.pointerEvents = 'all';
      }
    });

    // 원형 로비도 처리 (암센터 1층)
    if (currentFloorId === 'cancer_1f') {
      const lobbyCircle = svgElement.querySelector('circle[cx="450"][cy="300"]');
      if (lobbyCircle) {
        const roomData = rooms['lobby'];
        lobbyCircle.setAttribute('data-room-id', 'lobby');
        lobbyCircle.setAttribute('data-node-id', roomData.node_id);
        lobbyCircle.classList.add('interactive-room');
        
        lobbyCircle.style.cursor = 'pointer';
        lobbyCircle.style.pointerEvents = 'all';
      }
    }
  };

  // 방 클릭 핸들러
  const handleRoomClick = (roomKey, roomData) => {
    setSelectedRoom({ key: roomKey, ...roomData });
    
    if (onRoomClick) {
      onRoomClick({
        roomId: roomKey,
        nodeId: roomData.node_id,
        name: roomData.name,
        type: roomData.type,
        floor: floorId
      });
    }
  };

  // 하이라이트 효과 업데이트
  useEffect(() => {
    if (svgRef.current && highlightRoomId) {
      // 모든 하이라이트 제거
      svgRef.current.querySelectorAll('.highlighted').forEach(el => {
        el.classList.remove('highlighted');
      });
      
      // 선택된 방 하이라이트
      const targetElement = svgRef.current.querySelector(`[data-room-id="${highlightRoomId}"]`);
      if (targetElement) {
        targetElement.classList.add('highlighted');
      }
    }
  }, [highlightRoomId]);

  // 경로 표시
  useEffect(() => {
    if (svgRef.current && navigationPath) {
      // 기존 경로 제거
      const existingPath = svgRef.current.querySelector('.navigation-path');
      if (existingPath) {
        existingPath.remove();
      }
      
      // 새 경로 추가
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', navigationPath);
      pathElement.setAttribute('class', 'navigation-path');
      pathElement.setAttribute('fill', 'none');
      pathElement.setAttribute('stroke', '#2196F3');
      pathElement.setAttribute('stroke-width', '3');
      pathElement.setAttribute('stroke-dasharray', '10,5');
      pathElement.setAttribute('opacity', '0.8');
      
      svgRef.current.appendChild(pathElement);
    }
  }, [navigationPath]);

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
    <div className="interactive-map-container">
      {/* 지도 헤더 */}
      <div className="map-header">
        <h2>{currentFloorInfo.name}</h2>
        {selectedRoom && (
          <div className="selected-room-info">
            <span className="room-badge">{selectedRoom.name}</span>
          </div>
        )}
      </div>

      {/* SVG 지도 컨테이너 - 항상 렌더링 */}
      <div 
        className="interactive-svg-container" 
        ref={svgContainerRef}
        onClick={(e) => {
          const target = e.target;
          console.log('Click event on:', target);
          
          if (target.hasAttribute('data-room-id')) {
            const roomId = target.getAttribute('data-room-id');
            console.log('Room clicked:', roomId);
            
            if (roomId && floorInfo[floorId].rooms[roomId]) {
              handleRoomClick(roomId, floorInfo[floorId].rooms[roomId]);
            }
          }
        }}
        onMouseMove={(e) => {
          const target = e.target;
          const isRoom = target.hasAttribute('data-room-id');
          
          if (isRoom) {
            const roomId = target.getAttribute('data-room-id');
            if (roomId && floorInfo[floorId].rooms[roomId]) {
              // Only update if entering a new room
              if (!hoveredRoom || hoveredRoom.key !== roomId) {
                const rect = target.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top
                });
                setHoveredRoom({ key: roomId, ...floorInfo[floorId].rooms[roomId] });
                
                // Clear previous hover styles
                svgContainerRef.current?.querySelectorAll('.hovered').forEach(el => {
                  el.classList.remove('hovered');
                  el.style.opacity = '1';
                });
                
                // Apply new hover styles
                target.classList.add('hovered');
                target.style.opacity = '0.8';
              }
            }
          } else {
            // Mouse is not over a room - clear hover state
            if (hoveredRoom) {
              setHoveredRoom(null);
              svgContainerRef.current?.querySelectorAll('.hovered').forEach(el => {
                el.classList.remove('hovered');
                el.style.opacity = '1';
              });
            }
          }
        }}
        onMouseLeave={(e) => {
          // Clear hover when leaving the container entirely
          setHoveredRoom(null);
          svgContainerRef.current?.querySelectorAll('.hovered').forEach(el => {
            el.classList.remove('hovered');
            el.style.opacity = '1';
          });
        }}
      >
        {loading ? (
          <div className="map-viewer-loading">
            <div className="spinner"></div>
            <p>지도를 불러오는 중...</p>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        )}
      </div>

      {/* 호버 툴팁 */}
      {showTooltip && hoveredRoom && (
        <div 
          className="room-tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            position: 'fixed'
          }}
        >
          <div className="tooltip-content">
            <strong>{hoveredRoom.name}</strong>
            <span className="room-type">{hoveredRoom.type}</span>
          </div>
        </div>
      )}

      {/* 범례 */}
      <MapLegend />

      {/* 선택된 방 정보 패널 */}
      {selectedRoom && (
        <div className="selected-room-panel">
          <h3>선택된 위치</h3>
          <div className="room-details">
            <p><strong>이름:</strong> {selectedRoom.name}</p>
            <p><strong>타입:</strong> {selectedRoom.type}</p>
            <p><strong>노드 ID:</strong> {selectedRoom.node_id}</p>
          </div>
        </div>
      )}
    </div>
  );
};

InteractiveMapViewer.propTypes = {
  floorId: PropTypes.oneOf(['main_1f', 'main_2f', 'cancer_1f', 'cancer_2f']),
  onRoomClick: PropTypes.func,
  highlightRoomId: PropTypes.string,
  navigationPath: PropTypes.string,
  showTooltip: PropTypes.bool
};

export default InteractiveMapViewer;