import React, { useEffect, useRef, useState } from 'react';

const InteractiveMapViewer = ({ mapFileName, highlightDepartment, onDepartmentClick }) => {
  const svgContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

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