import React, { useState, useEffect, useRef } from 'react';
import './InteractiveMapViewer.css';

const SimpleMapViewer = ({ floorId = 'main_1f' }) => {
  const [svgContent, setSvgContent] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const containerRef = useRef(null);
  const currentHoveredRef = useRef(null);

  // 층 정보
  const floors = {
    'main_1f': {
      name: '본관 1층',
      svg: '/images/maps/main_1f.svg',
      rooms: {
        'emergency': { name: '응급의료센터', type: 'medical' },
        'lab': { name: '진단검사의학과', type: 'medical' },
        'blood': { name: '채혈실', type: 'medical' },
        'donation': { name: '헌혈실', type: 'medical' },
        'convenience': { name: '편의점', type: 'facility' },
        'cafe': { name: '카페', type: 'facility' },
        'bank': { name: '은행', type: 'facility' }
      }
    },
    'main_2f': {
      name: '본관 2층',
      svg: '/images/maps/main_2f.svg',
      rooms: {
        'waiting': { name: '내과 대기실', type: 'waiting' },
        'clinic1': { name: '내과 진료실 1', type: 'clinic' },
        'clinic2': { name: '내과 진료실 2', type: 'clinic' },
        'clinic3': { name: '내과 진료실 3', type: 'clinic' }
      }
    }
  };

  // SVG 로드
  useEffect(() => {
    fetch(floors[floorId].svg)
      .then(res => res.text())
      .then(svg => {
        setSvgContent(svg);
        setTimeout(setupInteractivity, 100);
      });
  }, [floorId]);

  // 인터랙티브 설정
  const setupInteractivity = () => {
    if (!containerRef.current) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // 모든 text 요소의 pointer-events를 비활성화
    const texts = svg.querySelectorAll('text');
    texts.forEach(text => {
      text.style.pointerEvents = 'none';
    });

    // 모든 rect 요소 찾기
    const rects = svg.querySelectorAll('rect:not(.bg)');
    
    rects.forEach((rect, index) => {
      const x = parseFloat(rect.getAttribute('x'));
      const y = parseFloat(rect.getAttribute('y'));
      
      // 간단한 매핑 (본관 1층 예시)
      let roomId = null;
      if (floorId === 'main_1f') {
        if (x >= 380 && x <= 580 && y >= 100 && y <= 220) roomId = 'lab';
        else if (x >= 610 && x <= 750 && y >= 100 && y <= 220) roomId = 'blood';
        else if (x >= 50 && x <= 230 && y >= 350 && y <= 450) roomId = 'donation';
      }
      
      if (roomId && floors[floorId].rooms[roomId]) {
        rect.setAttribute('data-room-id', roomId);
        rect.style.cursor = 'pointer';
        rect.style.pointerEvents = 'all';
        rect.classList.add('clickable-room');
      }
    });
  };

  // 클릭 핸들러
  const handleContainerClick = (e) => {
    console.log('SimpleMapViewer click:', e.target);
    if (e.target.hasAttribute('data-room-id')) {
      const roomId = e.target.getAttribute('data-room-id');
      console.log('Room clicked:', roomId);
      const room = floors[floorId].rooms[roomId];
      if (room) {
        setSelectedRoom({ id: roomId, ...room });
        console.log('Room selected:', room.name);
      }
    }
  };

  // 마우스 이동 핸들러 - 더 단순하게
  const handleMouseMove = (e) => {
    const target = e.target;
    const isRoom = target.hasAttribute('data-room-id');
    
    if (isRoom) {
      const roomId = target.getAttribute('data-room-id');
      const room = floors[floorId].rooms[roomId];
      
      // 새로운 방에 들어갔을 때만 업데이트
      if (room && currentHoveredRef.current !== roomId) {
        // 이전 방 초기화
        if (currentHoveredRef.current) {
          const prev = containerRef.current?.querySelector(`[data-room-id="${currentHoveredRef.current}"]`);
          if (prev) prev.style.opacity = '1';
        }
        
        // 새 방 설정
        currentHoveredRef.current = roomId;
        setHoveredRoom({ id: roomId, ...room });
        target.style.opacity = '0.7';
      }
    } else {
      // 방이 아닌 곳에 있으면 초기화
      if (currentHoveredRef.current) {
        const prev = containerRef.current?.querySelector(`[data-room-id="${currentHoveredRef.current}"]`);
        if (prev) prev.style.opacity = '1';
        currentHoveredRef.current = null;
        setHoveredRoom(null);
      }
    }
  };

  return (
    <div>
      <h2>{floors[floorId].name}</h2>
      
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          background: '#f0f0f0',
          border: '2px solid #ddd',
          minHeight: '600px'
        }}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      
      {selectedRoom && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#fff', border: '1px solid #ddd' }}>
          <h3>선택된 위치</h3>
          <p>이름: {selectedRoom.name}</p>
          <p>타입: {selectedRoom.type}</p>
        </div>
      )}
      
      {hoveredRoom && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: '#fffbcc',
          border: '1px solid #ffc107',
          borderRadius: '5px'
        }}>
          <strong>마우스 호버 중:</strong> {hoveredRoom.name} ({hoveredRoom.type})
        </div>
      )}
    </div>
  );
};

export default SimpleMapViewer;