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
  stage,  // JourneyNavigator에서 전달받는 stage prop
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
  svgHeight = 600,  // SVG 기본 높이
  onStageComplete  // stage 완료 콜백
}) => {
  const svgContainerRef = useRef(null);
  const [showNodes, setShowNodes] = useState(false);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  
  // ✅ mapStore에서 필요한 것들 가져오기
  const activeRoute = useMapStore(state => state.activeRoute);
  const navigationRoute = useMapStore(state => state.navigationRoute);
  const storeCurrentLocation = useMapStore(state => state.currentLocation);
  const currentMapId = useMapStore(state => state.currentMapId);
  
  // stage에서 데이터 추출
  const stageMapId = stage?.mapName;
  const stageNodes = stage?.routeData?.nodes || [];
  const stageEdges = stage?.routeData?.edges || [];
  
  // Props의 mapId 우선순위: stage > props > store
  const mapId = stageMapId || propMapId || currentMapId || 'main_1f';
  
  // Store에서 경로 데이터 가져오기 (navigationRoute 우선)
  const routeData = navigationRoute || activeRoute || {};
  
  // 경로 데이터 우선순위: store > stage > props
  const corridorNodes = routeData.nodes?.length > 0 ? routeData.nodes : 
    (stageNodes.length > 0 ? stageNodes : propPathNodes);
  const corridorEdges = routeData.edges?.length > 0 ? routeData.edges : 
    (stageEdges.length > 0 ? stageEdges : propPathEdges);
  
  // 현재 위치 설정 - 첫 번째 노드를 현재 위치로 사용
  const currentLocation = corridorNodes.length > 0 ? corridorNodes[0] : 
    (storeCurrentLocation || propCurrentLocation || null);
  
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
    'main_3f': '/images/maps/main_2f.svg',  // main_3f가 없으므로 main_2f 사용
    'main-3f': '/images/maps/main_2f.svg',  // main-3f도 main_2f로 폴백
    'overview_main_2f': '/images/maps/overview_main_2f.svg',
    'annex_1f': '/images/maps/annex_1f.svg',
    'annex-1f': '/images/maps/annex_1f.svg',
    'annex_2f': '/images/maps/annex_1f.svg',  // annex_2f가 없으므로 annex_1f 사용
    'annex-2f': '/images/maps/annex_1f.svg',  // annex-2f도 annex_1f로 폴백
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
        fullLabel: ' ',
        highlight: '현재 위치',
        description: ' ' 
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
  
  // stage가 transition인 경우 특별한 UI 표시
  if (stage?.isTransition) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-600 text-white rounded-full p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-blue-800">이동 안내</h3>
          </div>
          <p className="text-lg text-blue-700 whitespace-pre-line">{stage.transitionInstruction}</p>
          {onStageComplete && (
            <button 
              onClick={onStageComplete}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              다음 단계로
            </button>
          )}
        </div>
      </div>
    );
  }
  
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

  // 지도 SVG 로드 (지도 변경 시에만)
  useEffect(() => {
    if (!svgContainerRef.current) return;
    
    // SVG 로드 (백엔드 또는 로컬)
    const loadSvg = async () => {
      try {
        let svgText = '';
        
        // mapStore에서 SVG 내용 확인
        const currentFloorMap = useMapStore.getState().currentFloorMap;
        
        if (currentFloorMap?.svg_content && currentFloorMap.floor_id === mapId) {
          // 백엔드에서 로드한 SVG 사용
          svgText = currentFloorMap.svg_content;
        } else if (mapSrc) {
          // 로컬 파일 폴백
          try {
            const response = await fetch(mapSrc);
            if (!response.ok) {
              throw new Error(`Failed to load map: ${response.status}`);
            }
            svgText = await response.text();
          } catch (fetchError) {
            console.error('지도 파일 로드 실패:', mapSrc, fetchError);
            // default.svg로 폴백
            const defaultResponse = await fetch(mapImages.default);
            svgText = await defaultResponse.text();
          }
        } else {
          // 백엔드에서 지도 로드 시도
          const loadFloorMap = useMapStore.getState().loadFloorMap;
          const mapData = await loadFloorMap(mapId);
          if (mapData?.svg_content) {
            svgText = mapData.svg_content;
          } else {
            console.error('지도를 로드할 수 없습니다');
            return;
          }
        }
        
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
        
        // 1. 먼저 경로 표시 (경로 데이터가 있으면 항상 표시)
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
              
              // 애니메이션 추가 (점선이 움직이는 효과)
              const animate = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
              animate.setAttribute('attributeName', 'stroke-dashoffset');
              animate.setAttribute('from', '0');
              animate.setAttribute('to', '-18');  // 음수로 설정하여 정방향 이동
              animate.setAttribute('dur', '1.5s');
              animate.setAttribute('repeatCount', 'indefinite');
              line.appendChild(animate);
              
              // 추가: 선 자체에 클래스 추가 (CSS 애니메이션 대비)
              line.setAttribute('class', 'path-line-animated');
              
              pathGroup.appendChild(line);
            }
          });
          
          svgElement.appendChild(pathGroup);
        }
        
        // 2. 그 다음에 현재 위치 마커 추가 (경로보다 위에 그려짐)
        const locationToShow = currentLocation || (corridorNodes.length > 0 ? corridorNodes[0] : null);
        if (locationToShow) {
          const xCoord = locationToShow.x_coord || locationToShow.x || 150;
          const yCoord = locationToShow.y_coord || locationToShow.y || 400;
          
          const markerGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
          markerGroup.setAttribute('transform', `translate(${xCoord}, ${yCoord})`);
          markerGroup.setAttribute('id', 'current-location-marker');
          
          // 펄스 애니메이션 원
          const pulseCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          pulseCircle.setAttribute('r', '20');
          pulseCircle.setAttribute('fill', '#dc2626');
          pulseCircle.setAttribute('opacity', '0.3');
          
          const animatePulse = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animatePulse.setAttribute('attributeName', 'r');
          animatePulse.setAttribute('from', '10');
          animatePulse.setAttribute('to', '30');
          animatePulse.setAttribute('dur', '2s');
          animatePulse.setAttribute('repeatCount', 'indefinite');
          
          const animateOpacity = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animateOpacity.setAttribute('attributeName', 'opacity');
          animateOpacity.setAttribute('from', '0.5');
          animateOpacity.setAttribute('to', '0');
          animateOpacity.setAttribute('dur', '2s');
          animateOpacity.setAttribute('repeatCount', 'indefinite');
          
          pulseCircle.appendChild(animatePulse);
          pulseCircle.appendChild(animateOpacity);
          
          // 메인 마커
          const mainCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          mainCircle.setAttribute('r', '12');
          mainCircle.setAttribute('fill', '#dc2626');
          mainCircle.setAttribute('stroke', '#ffffff');
          mainCircle.setAttribute('stroke-width', '3');
          
          // 현재 위치 텍스트 - 흰색 배경용 (아래쪽)
          const textBg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
          textBg.setAttribute('y', '-20');
          textBg.setAttribute('text-anchor', 'middle');
          textBg.setAttribute('font-size', '16');
          textBg.setAttribute('font-weight', 'bold');
          textBg.setAttribute('fill', '#ffffff');
          textBg.setAttribute('stroke', '#ffffff');
          textBg.setAttribute('stroke-width', '3');
          textBg.textContent = '현재 위치';
          
          // 현재 위치 텍스트 - 빨간색 (위쪽)
          const text = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('y', '-20');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '16');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('fill', '#dc2626');
          text.textContent = '현재 위치';
          
          markerGroup.appendChild(pulseCircle);
          markerGroup.appendChild(mainCircle);
          markerGroup.appendChild(textBg);  // 흰색 배경 텍스트 먼저
          markerGroup.appendChild(text);     // 빨간색 텍스트 나중에
          
          svgElement.appendChild(markerGroup);
        }
        
        // 컨테이너에 SVG 삽입 (null 체크 추가)
        if (svgContainerRef.current) {
          // 기존 SVG가 있으면 교체, 없으면 추가
          const existingSvg = svgContainerRef.current.querySelector('svg');
          if (existingSvg) {
            svgContainerRef.current.replaceChild(svgElement, existingSvg);
          } else {
            svgContainerRef.current.appendChild(svgElement);
          }
        }
      } catch (error) {
        console.error('SVG 로드 오류:', error);
      }
    };
    
    loadSvg();
  }, [mapSrc, highlightRoom, currentMapIndex]); // 지도 변경 시에만 재로드

  // 경로와 현재 위치만 업데이트하는 useEffect
  useEffect(() => {
    if (!svgContainerRef.current) return;
    
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) {
      // SVG가 아직 로드되지 않았으면 기다림
      return;
    }
    
    // 기존 경로와 마커 제거
    const existingPath = svgElement.querySelector('#path-route');
    const existingMarker = svgElement.querySelector('#current-location-marker');
    const existingNodes = svgElement.querySelector('#debug-nodes');
    
    if (existingPath) existingPath.remove();
    if (existingMarker) existingMarker.remove();
    if (existingNodes) existingNodes.remove();
    
    // 노드 표시 모드 (showNodes가 true일 때만 노드 표시)
    if (showNodes && corridorNodes.length > 0) {
      const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodesGroup.setAttribute('id', 'debug-nodes');
      
      // 디버그용 엣지 표시
      corridorEdges.forEach(([from, to]) => {
        const fromNode = corridorNodes.find(n => n.id === from);
        const toNode = corridorNodes.find(n => n.id === to);
        
        if (fromNode && toNode) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#10b981');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
    
    // 1. 먼저 경로 표시 (경로 데이터가 있으면 항상 표시)
    if (corridorNodes.length > 0 && corridorEdges.length > 0) {
      const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pathGroup.setAttribute('id', 'path-route');
      
      // 화살표 마커 정의 (작고 부드러운 화살표)
      let defs = svgElement.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgElement.appendChild(defs);
      }
      
      if (!defs.querySelector('#arrowhead')) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '8');
        marker.setAttribute('markerHeight', '8');
        marker.setAttribute('refX', '7');
        marker.setAttribute('refY', '4');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('fill', '#2563eb');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 1 L 7 4 L 0 7 L 2 4 z');
        marker.appendChild(path);
        defs.appendChild(marker);
      }
      
      // 엣지를 따라 경로 구성
      corridorEdges.forEach(([from, to], index) => {
        const fromNode = corridorNodes.find(n => n.id === from);
        const toNode = corridorNodes.find(n => n.id === to);
        
        if (fromNode && toNode) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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
          
          // 애니메이션 추가 (점선이 움직이는 효과)
          const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animate.setAttribute('attributeName', 'stroke-dashoffset');
          animate.setAttribute('from', '0');
          animate.setAttribute('to', '-18');  // 음수로 설정하여 정방향 이동
          animate.setAttribute('dur', '1.5s');
          animate.setAttribute('repeatCount', 'indefinite');
          line.appendChild(animate);
          
          pathGroup.appendChild(line);
        }
      });
      
      svgElement.appendChild(pathGroup);
    }
    
    // 2. 그 다음에 현재 위치 마커 추가 (경로보다 위에 그려짐)
    const locationToShow = currentLocation || (corridorNodes.length > 0 ? corridorNodes[0] : null);
    if (locationToShow) {
      const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      markerGroup.setAttribute('id', 'current-location-marker');
      markerGroup.setAttribute('transform', `translate(${locationToShow.x || locationToShow.x_coord}, ${locationToShow.y || locationToShow.y_coord})`);
      
      // 펍스 효과를 위한 큰 원
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('r', '20');
      pulseCircle.setAttribute('fill', 'none');
      pulseCircle.setAttribute('stroke', '#dc2626');
      pulseCircle.setAttribute('stroke-width', '2');
      pulseCircle.setAttribute('opacity', '0.5');
      
      // 펍스 애니메이션
      const pulseAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseAnimate.setAttribute('attributeName', 'r');
      pulseAnimate.setAttribute('from', '12');
      pulseAnimate.setAttribute('to', '25');
      pulseAnimate.setAttribute('dur', '2s');
      pulseAnimate.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(pulseAnimate);
      
      const pulseOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseOpacity.setAttribute('attributeName', 'opacity');
      pulseOpacity.setAttribute('from', '0.8');
      pulseOpacity.setAttribute('to', '0');
      pulseOpacity.setAttribute('dur', '2s');
      pulseOpacity.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(pulseOpacity);
      
      // 메인 마커
      const mainCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      mainCircle.setAttribute('r', '12');
      mainCircle.setAttribute('fill', '#dc2626');
      mainCircle.setAttribute('stroke', '#ffffff');
      mainCircle.setAttribute('stroke-width', '3');
      
      // 현재 위치 텍스트 - 흰색 배경용 (아래쪽)
      const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textBg.setAttribute('y', '-20');
      textBg.setAttribute('text-anchor', 'middle');
      textBg.setAttribute('font-size', '16');
      textBg.setAttribute('font-weight', 'bold');
      textBg.setAttribute('fill', '#ffffff');
      textBg.setAttribute('stroke', '#ffffff');
      textBg.setAttribute('stroke-width', '3');
      textBg.textContent = '현재 위치';
      
      // 현재 위치 텍스트 - 빨간색 (위쪽)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('y', '-20');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '16');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#dc2626');
      text.textContent = '현재 위치';
      
      markerGroup.appendChild(pulseCircle);
      markerGroup.appendChild(mainCircle);
      markerGroup.appendChild(textBg);  // 흰색 배경 텍스트 먼저
      markerGroup.appendChild(text);     // 빨간색 텍스트 나중에
      
      svgElement.appendChild(markerGroup);
    }
  }, [showNodes, corridorNodes, corridorEdges, currentLocation]); // 경로 데이터 변경 시에만 업데이트

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
        
        {/* CSS 애니메이션 스타일 추가 */}
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -18;
            }
          }
          .path-line-animated {
            animation: dash 1.5s linear infinite;
          }
        `}</style>
        
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
      
      {/* stage 모드일 때 완료 버튼 */}
      {stage && onStageComplete && !stage.isTransition && (
        <div className="mt-4 flex justify-center">
          <button 
            onClick={onStageComplete}
            className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg"
          >
            {stage.endPoint ? '도착 확인' : '다음 단계로'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MapNavigator;