import React, { useEffect, useRef, useState, useMemo } from 'react';
import useLocationStore from '../store/locationStore';

const InteractiveMapViewer = ({ mapFileName, highlightDepartment, onDepartmentClick, showRoute = false }) => {
  const svgContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [svgDoc, setSvgDoc] = useState(null);
  const [svgElement, setSvgElement] = useState(null);
  
  // LocationStore 연동 - 직접 상태 접근으로 무한 루프 방지
  const currentNodeId = useLocationStore((state) => state.currentNodeId);
  const currentPosition = useLocationStore((state) => state.currentPosition);
  const currentMapId = useLocationStore((state) => state.currentMapId);
  const routeCoordinates = useLocationStore((state) => state.routeCoordinates);
  const isRouteActive = useLocationStore((state) => state.isRouteActive);
  const destinationNodeId = useLocationStore((state) => state.destinationNodeId);
  const destinationName = useLocationStore((state) => state.destinationName);
  
  // 계산된 값들을 useMemo로 메모이제이션
  const currentCoordinateLocation = useMemo(() => ({
    nodeId: currentNodeId,
    position: currentPosition,
    mapId: currentMapId,
    isSet: !!currentNodeId
  }), [currentNodeId, currentPosition, currentMapId]);
  
  const routeInfo = useMemo(() => ({
    isActive: isRouteActive,
    coordinates: routeCoordinates,
    destinationNodeId: destinationNodeId,
    destinationName: destinationName,
    coordinateCount: routeCoordinates.length
  }), [isRouteActive, routeCoordinates, destinationNodeId, destinationName]);

  useEffect(() => {
    const loadMap = async () => {
      if (!svgContainerRef.current || !mapFileName) return;
      
      setIsLoading(true);
      const mapPath = `/images/maps/${mapFileName}.svg`;
      
      try {
        const response = await fetch(mapPath);
        const svgText = await response.text();
        
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // SVG 크기 설정
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // 모든 부서/시설 요소에 클릭 이벤트 추가
        const interactiveElements = svgElement.querySelectorAll('[id^="dept-"], [id^="zone-"], [id^="store-"], [id^="room-"]');
        interactiveElements.forEach(element => {
          // 기본 스타일 설정
          element.style.cursor = 'pointer';
          element.style.transition = 'all 0.3s ease';
          
          // 호버 효과
          element.addEventListener('mouseenter', () => {
            if (element.id !== highlightDepartment) {
              element.style.filter = 'brightness(0.9)';
              element.style.transform = 'scale(1.02)';
            }
          });
          
          element.addEventListener('mouseleave', () => {
            if (element.id !== highlightDepartment) {
              element.style.filter = '';
              element.style.transform = '';
            }
          });
          
          // 클릭 이벤트
          element.addEventListener('click', () => {
            if (onDepartmentClick) {
              onDepartmentClick(element.id);
            }
          });
        });
        
        // 하이라이트 처리
        if (highlightDepartment) {
          const targetElement = svgElement.getElementById(highlightDepartment);
          if (targetElement) {
            // 강조 스타일 적용
            targetElement.style.fill = '#fbbf24'; // 노란색 배경
            targetElement.style.stroke = '#f59e0b'; // 진한 노란색 테두리
            targetElement.style.strokeWidth = '3';
            targetElement.style.filter = 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))';
            
            // 펄스 애니메이션 추가
            const animate = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'opacity');
            animate.setAttribute('values', '1;0.7;1');
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            targetElement.appendChild(animate);
          }
        }
        
        // 범례 추가
        const legendGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('transform', 'translate(20, 20)');
        
        // 범례 배경
        const legendBg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        legendBg.setAttribute('width', '150');
        legendBg.setAttribute('height', '100');
        legendBg.setAttribute('fill', 'white');
        legendBg.setAttribute('stroke', '#e5e7eb');
        legendBg.setAttribute('stroke-width', '1');
        legendBg.setAttribute('rx', '8');
        legendBg.setAttribute('opacity', '0.95');
        legendGroup.appendChild(legendBg);
        
        // 범례 제목
        const legendTitle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
        legendTitle.setAttribute('x', '10');
        legendTitle.setAttribute('y', '25');
        legendTitle.setAttribute('font-size', '14');
        legendTitle.setAttribute('font-weight', 'bold');
        legendTitle.setAttribute('fill', '#374151');
        legendTitle.textContent = '지도 범례';
        legendGroup.appendChild(legendTitle);
        
        // 범례 항목들
        const legendItems = [
          { color: '#93c5fd', label: '진료과' },
          { color: '#fca5a5', label: '편의시설' },
          { color: '#fbbf24', label: '선택된 위치' }
        ];
        
        legendItems.forEach((item, index) => {
          // 색상 박스
          const colorBox = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          colorBox.setAttribute('x', '15');
          colorBox.setAttribute('y', 40 + index * 20);
          colorBox.setAttribute('width', '15');
          colorBox.setAttribute('height', '15');
          colorBox.setAttribute('fill', item.color);
          colorBox.setAttribute('stroke', '#6b7280');
          colorBox.setAttribute('stroke-width', '0.5');
          legendGroup.appendChild(colorBox);
          
          // 라벨
          const label = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', '35');
          label.setAttribute('y', 50 + index * 20);
          label.setAttribute('font-size', '12');
          label.setAttribute('fill', '#6b7280');
          label.textContent = item.label;
          legendGroup.appendChild(label);
        });
        
        svgElement.appendChild(legendGroup);
        
        // SVG 요소를 상태에 저장 (현재 위치/경로 표시용)
        setSvgDoc(svgDoc);
        setSvgElement(svgElement);
        
        // 컨테이너에 SVG 삽입
        svgContainerRef.current.innerHTML = '';
        svgContainerRef.current.appendChild(svgElement);
        setIsLoading(false);
      } catch (error) {
        console.error('지도 로드 오류:', error);
        setIsLoading(false);
      }
    };
    
    loadMap();
  }, [mapFileName, highlightDepartment, onDepartmentClick]);

  // 현재 위치 표시 useEffect
  useEffect(() => {
    if (!svgDoc || !svgElement) return;

    // 기존 위치 마커 제거
    const existingLocationMarker = svgElement.querySelector('#current-location-marker');
    if (existingLocationMarker) {
      existingLocationMarker.remove();
    }

    // 현재 위치가 설정되어 있고, 현재 지도와 일치하는 경우에만 표시
    if (currentCoordinateLocation.isSet && 
        currentCoordinateLocation.mapId === mapFileName) {
      
      const { position } = currentCoordinateLocation;
      
      // 현재 위치 마커 그룹 생성
      const locationGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
      locationGroup.setAttribute('id', 'current-location-marker');
      
      // 외부 원 (펄스 효과용)
      const outerCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerCircle.setAttribute('cx', position.x);
      outerCircle.setAttribute('cy', position.y);
      outerCircle.setAttribute('r', '12');
      outerCircle.setAttribute('fill', '#ef4444');
      outerCircle.setAttribute('opacity', '0.3');
      outerCircle.setAttribute('class', 'animate-ping');
      locationGroup.appendChild(outerCircle);
      
      // 내부 원 (메인 마커)
      const innerCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCircle.setAttribute('cx', position.x);
      innerCircle.setAttribute('cy', position.y);
      innerCircle.setAttribute('r', '8');
      innerCircle.setAttribute('fill', '#ef4444');
      innerCircle.setAttribute('stroke', '#ffffff');
      innerCircle.setAttribute('stroke-width', '2');
      locationGroup.appendChild(innerCircle);
      
      // 중앙 점
      const centerDot = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      centerDot.setAttribute('cx', position.x);
      centerDot.setAttribute('cy', position.y);
      centerDot.setAttribute('r', '3');
      centerDot.setAttribute('fill', '#ffffff');
      locationGroup.appendChild(centerDot);
      
      // SVG에 위치 마커 추가
      svgElement.appendChild(locationGroup);
      
      console.log('📍 현재 위치 마커 표시됨:', position);
    }
  }, [svgDoc, svgElement, currentCoordinateLocation, mapFileName]);

  // 경로 표시 useEffect
  useEffect(() => {
    if (!svgDoc || !svgElement || !showRoute) return;

    // 기존 경로 제거
    const existingRoute = svgElement.querySelector('#route-path');
    if (existingRoute) {
      existingRoute.remove();
    }

    // 경로가 활성화되어 있고 좌표가 있는 경우에만 표시
    if (routeInfo.isActive && routeInfo.coordinates.length > 1) {
      
      // 경로 그룹 생성
      const routeGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
      routeGroup.setAttribute('id', 'route-path');
      
      // 경로 라인 생성
      const pathString = routeInfo.coordinates
        .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
        .join(' ');
      
      // 배경 경로 (더 두꺼운 흰색)
      const backgroundPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'path');
      backgroundPath.setAttribute('d', pathString);
      backgroundPath.setAttribute('stroke', '#ffffff');
      backgroundPath.setAttribute('stroke-width', '6');
      backgroundPath.setAttribute('fill', 'none');
      backgroundPath.setAttribute('stroke-linecap', 'round');
      backgroundPath.setAttribute('stroke-linejoin', 'round');
      routeGroup.appendChild(backgroundPath);
      
      // 메인 경로 (파란색)
      const mainPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainPath.setAttribute('d', pathString);
      mainPath.setAttribute('stroke', '#2563eb');
      mainPath.setAttribute('stroke-width', '4');
      mainPath.setAttribute('fill', 'none');
      mainPath.setAttribute('stroke-linecap', 'round');
      mainPath.setAttribute('stroke-linejoin', 'round');
      mainPath.setAttribute('stroke-dasharray', '10,5');
      routeGroup.appendChild(mainPath);
      
      // 목적지 마커
      if (routeInfo.coordinates.length > 0) {
        const destination = routeInfo.coordinates[routeInfo.coordinates.length - 1];
        
        const destMarker = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        destMarker.setAttribute('cx', destination.x);
        destMarker.setAttribute('cy', destination.y);
        destMarker.setAttribute('r', '8');
        destMarker.setAttribute('fill', '#16a34a');
        destMarker.setAttribute('stroke', '#ffffff');
        destMarker.setAttribute('stroke-width', '2');
        routeGroup.appendChild(destMarker);
        
        // 목적지 아이콘 (체크마크)
        const checkMark = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
        checkMark.setAttribute('x', destination.x);
        checkMark.setAttribute('y', destination.y + 4);
        checkMark.setAttribute('text-anchor', 'middle');
        checkMark.setAttribute('font-size', '10');
        checkMark.setAttribute('fill', '#ffffff');
        checkMark.setAttribute('font-weight', 'bold');
        checkMark.textContent = '✓';
        routeGroup.appendChild(checkMark);
      }
      
      // SVG에 경로 추가
      svgElement.appendChild(routeGroup);
      
      console.log('🗺️ 경로 표시됨:', routeInfo.coordinates.length, '개 좌표');
    }
  }, [svgDoc, svgElement, routeInfo, showRoute]);

  return (
    <div className="relative w-full bg-white rounded-xl shadow-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">지도를 불러오는 중...</p>
          </div>
        </div>
      )}
      <div 
        ref={svgContainerRef} 
        className="w-full h-[400px] flex items-center justify-center"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default InteractiveMapViewer;