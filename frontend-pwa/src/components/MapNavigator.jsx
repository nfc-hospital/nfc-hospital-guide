import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import useMapStore from '../store/mapStore';

// 시설별 SVG element ID 매핑 (컴포넌트 밖으로 이동)
const facilityMapping = {
  // 주요 시설
  '응급실': 'dept-emergency',
  '약국': 'store-pharmacy',
  '원무과': 'room-storage',
  '안내': 'room-storage',  // 안내데스크도 원무과 위치 사용
  '안내데스크': 'room-storage',
  
  // 진료과
  '내과': 'clinic-internal-1',
  '내과 대기실': 'clinic-internal-1',
  '정형외과': 'dept-orthopedics',
  '재활의학과': 'dept-rehab',
  '영상의학과': 'reception-radiology',
  '이비인후과': 'dept-ent',
  
  // 검사실
  '진단검사의학과': 'dept-laboratory',
  '채혈실': 'room-blood-collection',
  'CT실': 'room-ct',
  'MRI실': 'room-mri',
  'X-ray실': 'room-xray',
  '초음파실': 'room-ultrasound',
  
  // 편의시설
  '편의점': 'store-convenience',
  '카페': 'store-cafe',
  '은행': 'store-bank'
};

const MapNavigator = ({ 
  mapId: propMapId,  // props로 받은 mapId (폴백용)
  highlightRoom, 
  facilityName, 
  multiFloor = false, 
  startFloor, 
  endFloor,
  pathNodes: propPathNodes = [],  // props로 받은 경로 (폴백용)
  pathEdges: propPathEdges = [],  // props로 받은 엣지 (폴백용)
  currentLocation: propCurrentLocation = null,  // props로 받은 현재 위치 (폴백용)
  targetLocation = null,  // 목표 위치
  svgWidth = 900,  // SVG 기본 너비
  svgHeight = 600  // SVG 기본 높이
}) => {
  const svgContainerRef = useRef(null);
  const [showNodes, setShowNodes] = useState(false);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  
  // ✅ mapStore에서 필요한 것들 가져오기
  const activeRoute = useMapStore(state => state.activeRoute);
  const navigationRoute = useMapStore(state => state.navigationRoute);
  const storeCurrentLocation = useMapStore(state => state.currentLocation);
  const currentMapId = useMapStore(state => state.currentMapId);
  
  // Store의 mapId가 있으면 사용, 없으면 props 사용
  const mapId = currentMapId || propMapId || 'main_1f';
  
  // Store에서 경로 데이터 가져오기 (navigationRoute 우선)
  const routeData = navigationRoute || activeRoute || {};
  
  // Store에서 가져온 데이터가 없으면 props 사용 (폴백)
  const corridorNodes = routeData.nodes?.length > 0 ? routeData.nodes : propPathNodes;
  const corridorEdges = routeData.edges?.length > 0 ? routeData.edges : propPathEdges;
  const currentLocation = storeCurrentLocation || propCurrentLocation;
  
  // 디버깅용 로그
  console.log('🗺️ MapNavigator 경로 데이터:', {
    routeNodes: routeData.nodes,
    routeEdges: routeData.edges,
    propPathNodes,
    propPathEdges,
    corridorNodes,
    corridorEdges,
    showNodes
  });
  
  // 지도 이미지 매핑
  const mapImages = {
    'main_1f': '/images/maps/main_1f.svg',
    'main-1f': '/images/maps/main_1f.svg',
    'main_2f': '/images/maps/main_2f.svg',
    'main-2f': '/images/maps/main_2f.svg',
    'main-3f': '/images/maps/main-3f.svg',
    'overview_main_2f': '/images/maps/overview_main_2f.svg',
    'annex_1f': '/images/maps/annex_1f.svg',
    'annex-1f': '/images/maps/annex_1f.svg',
    'annex-2f': '/images/maps/annex-2f.svg',
    'cancer_1f': '/images/maps/cancer_1f.svg',
    'cancer_2f': '/images/maps/cancer_2f.svg',
    'default': '/images/maps/default.svg'
  };

  // 다중 층 경로 설정
  const mapSequence = [];
  if (multiFloor && startFloor && endFloor) {
    // 예: main_1f -> main_2f 경로
    if (startFloor.includes('1f') && endFloor.includes('2f')) {
      mapSequence.push({ 
        id: 'main_1f', 
        label: '1층', 
        fullLabel: '본관 1층 - 출발지',
        highlight: '현재 위치',
        description: '엘리베이터로 이동' 
      });
      mapSequence.push({ 
        id: 'main_2f', 
        label: '2층',
        fullLabel: '본관 2층 - 도착지',
        highlight: highlightRoom,
        description: '내과 대기실까지 이동' 
      });
    } else if (startFloor.includes('main') && endFloor.includes('annex')) {
      mapSequence.push({ 
        id: startFloor, 
        label: '본관',
        fullLabel: '본관 - 출발지',
        highlight: '현재 위치' 
      });
      mapSequence.push({ 
        id: endFloor, 
        label: '별관',
        fullLabel: '별관 - 도착지',
        highlight: highlightRoom 
      });
    } else {
      mapSequence.push({ 
        id: mapId, 
        label: '현재',
        fullLabel: '현재 위치',
        highlight: highlightRoom 
      });
    }
  } else {
    // 단일 층
    mapSequence.push({ 
      id: mapId, 
      label: '현재',
      fullLabel: '현재 위치',
      highlight: highlightRoom 
    });
  }

  const currentMap = mapSequence[currentMapIndex];
  const mapSrc = mapImages[currentMap?.id] || mapImages.default;
  
  
  // 지도 전환 핸들러
  const handleMapClick = () => {
    if (mapSequence.length > 1) {
      setCurrentMapIndex((prev) => (prev + 1) % mapSequence.length);
    }
  };

  const handlePrevMap = () => {
    if (mapSequence.length > 1) {
      setCurrentMapIndex((prev) => (prev - 1 + mapSequence.length) % mapSequence.length);
    }
  };

  const handleNextMap = () => {
    if (mapSequence.length > 1) {
      setCurrentMapIndex((prev) => (prev + 1) % mapSequence.length);
    }
  };

  useEffect(() => {
    if (!svgContainerRef.current || !mapSrc) return;
    
    // SVG 로드
    const loadSvg = async () => {
      try {
        const response = await fetch(mapSrc);
        const svgText = await response.text();
        
        // SVG 파싱
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // SVG viewBox 정보 가져오기 (좌표 시스템 확인)
        const viewBox = svgElement.getAttribute('viewBox');
        // console.log('📐 SVG viewBox:', viewBox);
        
        // SVG 크기 속성 설정 (전체가 보이도록)
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
        // 특정 시설 강조
        const roomToHighlight = currentMap?.highlight || highlightRoom;
        if (roomToHighlight) {
          const facilityId = facilityMapping[roomToHighlight];
          if (facilityId) {
            const targetElement = svgElement.getElementById(facilityId);
            if (targetElement) {
              // 강조 스타일 적용 (빨간색으로 변경)
              targetElement.style.fill = '#fca5a5'; // 밝은 빨간색 배경
              targetElement.style.stroke = '#dc2626'; // 진한 빨간색 테두리
              targetElement.style.strokeWidth = '3';
              targetElement.style.filter = 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.6))';
            }
          }
        }
        
        // 현재 위치 마커는 별도 useEffect에서 처리
        
        // 목적지 마커 제거 - 사용자 요청에 따라 현재 위치만 표시
        
        // 노드 표시 모드 (showNodes가 true일 때만 노드 표시)
        if (showNodes && corridorNodes.length > 0) {
          const nodesGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
          nodesGroup.setAttribute('id', 'debug-nodes');
          
          // 디버그용 엣지 표시
          corridorEdges.forEach(([from, to]) => {
            const fromNode = corridorNodes.find(n => n.id === from);
            const toNode = corridorNodes.find(n => n.id === to);
            
            if (fromNode && toNode) {
              const line = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', fromNode.x);
              line.setAttribute('y1', fromNode.y);
              line.setAttribute('x2', toNode.x);
              line.setAttribute('y2', toNode.y);
              line.setAttribute('stroke', '#10b981');
              line.setAttribute('stroke-width', '1');
              line.setAttribute('opacity', '0.3');
              nodesGroup.appendChild(line);
            }
          });
          
          // 노드 점 표시
          corridorNodes.forEach(node => {
            const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', '#10b981');
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '2');
            
            const text = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y - 8);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#065f46');
            text.textContent = node.id.replace('node-', '');
            
            nodesGroup.appendChild(circle);
            nodesGroup.appendChild(text);
          });
          
          svgElement.appendChild(nodesGroup);
        }
        
        // 경로 표시 (경로 데이터가 있으면 항상 표시)
        if (corridorNodes.length > 0 && corridorEdges.length > 0) {
          const pathGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
          pathGroup.setAttribute('id', 'path-route');
          
          // 화살표 마커 정의 (작고 부드러운 화살표)
          const defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
          const marker = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'marker');
          marker.setAttribute('id', 'arrowhead');
          marker.setAttribute('markerWidth', '8');
          marker.setAttribute('markerHeight', '8');
          marker.setAttribute('refX', '7');
          marker.setAttribute('refY', '4');
          marker.setAttribute('orient', 'auto');
          marker.setAttribute('fill', '#2563eb');
          
          const path = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M 0 1 L 7 4 L 0 7 L 2 4 z');
          marker.appendChild(path);
          defs.appendChild(marker);
          svgElement.appendChild(defs);
          
          // 모든 노드를 연결하는 연속된 경로 생성
          const pathData = [];
          let currentPath = [];
          
          // 엣지를 따라 경로 구성
          corridorEdges.forEach(([from, to], index) => {
            const fromNode = corridorNodes.find(n => n.id === from);
            const toNode = corridorNodes.find(n => n.id === to);
            
            if (fromNode && toNode) {
              const line = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', fromNode.x);
              line.setAttribute('y1', fromNode.y);
              line.setAttribute('x2', toNode.x);
              line.setAttribute('y2', toNode.y);
              line.setAttribute('stroke', '#2563eb'); // bg-blue-600과 동일
              line.setAttribute('stroke-width', '3');
              line.setAttribute('stroke-dasharray', '12,6');
              line.setAttribute('opacity', '0.8');
              
              // 마지막 선분에 화살표 추가
              if (index === corridorEdges.length - 1) {
                line.setAttribute('marker-end', 'url(#arrowhead)');
              }
              
              // 애니메이션 추가
              const animate = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
              animate.setAttribute('attributeName', 'stroke-dashoffset');
              animate.setAttribute('from', '18');
              animate.setAttribute('to', '0');
              animate.setAttribute('dur', '1s');
              animate.setAttribute('repeatCount', 'indefinite');
              line.appendChild(animate);
              
              pathGroup.appendChild(line);
            }
          });
          
          svgElement.appendChild(pathGroup);
        }
        
        // 컨테이너에 SVG 삽입 (null 체크 추가)
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = '';
          svgContainerRef.current.appendChild(svgElement);
        }
      } catch (error) {
        console.error('SVG 로드 오류:', error);
      }
    };
    
    loadSvg();
  }, [mapSrc, highlightRoom, currentMapIndex, showNodes]); // 지도 자체가 변경될 때만 재렌더링

  // 경로만 별도로 업데이트하는 useEffect
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // 기존 경로 제거
    const existingPath = svgElement.querySelector('#path-route');
    if (existingPath) existingPath.remove();
    
    // 새 경로 그리기
    if (corridorNodes.length > 0 && corridorEdges.length > 0) {
      const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pathGroup.setAttribute('id', 'path-route');
      
      // 엣지를 따라 경로 그리기
      corridorEdges.forEach(([from, to]) => {
        const fromNode = corridorNodes.find(n => n.id === from);
        const toNode = corridorNodes.find(n => n.id === to);
        
        if (fromNode && toNode) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', fromNode.x);
          line.setAttribute('y1', fromNode.y);
          line.setAttribute('x2', toNode.x);
          line.setAttribute('y2', toNode.y);
          line.setAttribute('stroke', '#2563eb');
          line.setAttribute('stroke-width', '3');
          line.setAttribute('stroke-dasharray', '10,5');
          pathGroup.appendChild(line);
        }
      });
      
      svgElement.appendChild(pathGroup);
      console.log('🎯 경로 업데이트 완료:', corridorNodes.length, '개 노드');
    }
  }, [corridorNodes, corridorEdges]); // 경로 데이터 변경시에도 SVG 재렌더링

  // 별도의 useEffect로 현재 위치 마커만 업데이트
  useEffect(() => {
    if (!svgContainerRef.current) return;
    
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    console.log('🔴 현재 위치 마커 업데이트:', currentLocation);
    
    // 기존 마커 제거
    const existingMarker = svgElement.querySelector('#current-location-marker');
    if (existingMarker) existingMarker.remove();
    
    // 현재 위치 마커 추가
    if (currentLocation) {
      const xCoord = currentLocation.x_coord || currentLocation.x || 150;
      const yCoord = currentLocation.y_coord || currentLocation.y || 400;
      
      console.log(`📍 마커 좌표: (${xCoord}, ${yCoord})`);
      
      const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      markerGroup.setAttribute('transform', `translate(${xCoord}, ${yCoord})`);
      markerGroup.setAttribute('id', 'current-location-marker');
      
      // 펄스 애니메이션 원
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('r', '20');
      pulseCircle.setAttribute('fill', '#dc2626');
      pulseCircle.setAttribute('opacity', '0.3');
      
      const animatePulse = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animatePulse.setAttribute('attributeName', 'r');
      animatePulse.setAttribute('from', '10');
      animatePulse.setAttribute('to', '30');
      animatePulse.setAttribute('dur', '2s');
      animatePulse.setAttribute('repeatCount', 'indefinite');
      
      const animateOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateOpacity.setAttribute('attributeName', 'opacity');
      animateOpacity.setAttribute('from', '0.5');
      animateOpacity.setAttribute('to', '0');
      animateOpacity.setAttribute('dur', '2s');
      animateOpacity.setAttribute('repeatCount', 'indefinite');
      
      pulseCircle.appendChild(animatePulse);
      pulseCircle.appendChild(animateOpacity);
      
      // 메인 마커
      const mainCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      mainCircle.setAttribute('r', '12');
      mainCircle.setAttribute('fill', '#dc2626');
      mainCircle.setAttribute('stroke', '#ffffff');
      mainCircle.setAttribute('stroke-width', '3');
      
      // 현재 위치 텍스트
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('y', '-20');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '16');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#dc2626');
      text.setAttribute('stroke', '#ffffff');
      text.setAttribute('stroke-width', '0.5');
      text.textContent = '현재 위치';
      
      markerGroup.appendChild(pulseCircle);
      markerGroup.appendChild(mainCircle);
      markerGroup.appendChild(text);
      
      svgElement.appendChild(markerGroup);
    }
  }, [currentLocation, mapSrc]); // 현재 위치나 지도가 변경시 업데이트

  return (
    <div className="relative w-full">
      {/* 현재 층 정보 - 우측 상단 */}
      {mapSequence.length > 1 && (
        <div className="absolute top-2 right-2 z-20">
          <div className="bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-1.5">
            <div className="text-xs font-bold text-gray-900">
              {currentMap?.fullLabel}
            </div>
            {currentMap?.description && (
              <div className="text-xs text-gray-500 mt-0.5">
                {currentMap?.description}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 노드 표시 토글 버튼 (개발용) */}
      {(currentMap?.id === 'main_1f' || currentMap?.id === 'main_2f' || mapId === 'main_1f' || mapId === 'main_2f') && (
        <button
          onClick={() => setShowNodes(!showNodes)}
          className="absolute bottom-2 right-2 z-10 bg-white border-2 border-gray-300 rounded-lg px-3 py-1 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          {showNodes ? '노드 숨기기' : '노드 표시'}
        </button>
      )}
      
      <div 
        className="relative w-full aspect-[3/2] bg-gray-50 overflow-hidden cursor-pointer"
        onClick={handleMapClick}
      >
        <div ref={svgContainerRef} className="w-full h-full flex items-center justify-center" />
        
        {/* 페이지 인디케이터 - 하단 중앙 */}
        {mapSequence.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-1.5">
            {mapSequence.map((_, index) => (
              <div
                key={index}
                className={`transition-all ${
                  index === currentMapIndex 
                    ? 'w-6 h-2 bg-blue-600 rounded-full' 
                    : 'w-2 h-2 bg-gray-400 rounded-full'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapNavigator;