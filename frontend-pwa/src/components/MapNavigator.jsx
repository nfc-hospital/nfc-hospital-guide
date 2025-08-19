import React, { useEffect, useRef, useState } from 'react';
import { getFacilityRoute } from '../api/facilityRoutes';

// 시설별 SVG element ID 매핑 (컴포넌트 밖으로 이동)
const facilityMapping = {
  '응급실': 'dept-emergency',
  '약국': 'store-pharmacy',
  '원무과': 'room-storage',
  '안내': 'room-storage',  // 안내데스크도 원무과 위치 사용
  '안내데스크': 'room-storage',
};

const MapNavigator = ({ mapId, highlightRoom, facilityName }) => {
  const svgContainerRef = useRef(null);
  const [showNodes, setShowNodes] = useState(false);
  
  // 지도 이미지 매핑
  const mapImages = {
    'main_1f': '/images/maps/main_1f.svg',
    'main-1f': '/images/maps/main_1f.svg',
    'main-2f': '/images/maps/main_2f.svg',
    'main-3f': '/images/maps/main-3f.svg',
    'annex-1f': '/images/maps/annex-1f.svg',
    'annex-2f': '/images/maps/annex-2f.svg',
    'default': '/images/maps/default.svg'
  };

  const mapSrc = mapImages[mapId] || mapImages.default;

  const [corridorNodes, setCorridorNodes] = useState([]);
  const [corridorEdges, setCorridorEdges] = useState([]);
  
  // facilityName이 변경될 때 경로 데이터 가져오기
  useEffect(() => {
    const loadRoute = async () => {
      if (facilityName) {
        const route = await getFacilityRoute(facilityName);
        setCorridorNodes(route.nodes || []);
        setCorridorEdges(route.edges || []);
      } else {
        setCorridorNodes([]);
        setCorridorEdges([]);
      }
    };
    
    loadRoute();
  }, [facilityName]);

  useEffect(() => {
    if (svgContainerRef.current) {
      // SVG 로드 대기
      const loadSvg = async () => {
        try {
          const response = await fetch(mapSrc);
          const svgText = await response.text();
          
          // SVG 파싱
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;
          
          // SVG 크기 속성 설정 (전체가 보이도록)
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
          // 특정 시설 강조
          if (highlightRoom) {
            const facilityId = facilityMapping[highlightRoom];
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
          
          // 현재 위치 마커 추가 (정문)
          const markerGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
          markerGroup.setAttribute('transform', 'translate(450, 50)');
          
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
          
          // 현재 위치 텍스트
          const text = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('y', '-20');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '14');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('fill', '#dc2626');
          text.textContent = '현재 위치';
          
          markerGroup.appendChild(pulseCircle);
          markerGroup.appendChild(mainCircle);
          markerGroup.appendChild(text);
          
          svgElement.appendChild(markerGroup);
          
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
          
          // 경로 표시 (노드 숨기기 모드에서만 표시)
          if (!showNodes && corridorNodes.length > 0 && corridorEdges.length > 0) {
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
          
          // 컨테이너에 SVG 삽입
          svgContainerRef.current.innerHTML = '';
          svgContainerRef.current.appendChild(svgElement);
        } catch (error) {
          console.error('SVG 로드 오류:', error);
        }
      };
      
      loadSvg();
    }
  }, [mapSrc, highlightRoom, showNodes, corridorNodes, corridorEdges]); // 정리된 의존성 배열

  return (
    <div className="relative w-full">
      {/* 노드 표시 토글 버튼 (개발용) */}
      {mapId === 'main_1f' && (
        <button
          onClick={() => setShowNodes(!showNodes)}
          className="absolute top-2 right-2 z-10 bg-white border-2 border-gray-300 rounded-lg px-3 py-1 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {showNodes ? '노드 숨기기' : '노드 표시'}
        </button>
      )}
      
      <div className="relative w-full aspect-[3/2] bg-gray-50 overflow-hidden">
        <div ref={svgContainerRef} className="w-full h-full flex items-center justify-center" />
      </div>
    </div>
  );
};

export default MapNavigator;