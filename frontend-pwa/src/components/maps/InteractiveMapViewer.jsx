import React, { useEffect, useState, useRef } from 'react';
import './InteractiveMapViewer.css';

const InteractiveMapViewer = ({ mapUrl, onRoomSelect, highlightZoneId }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const svgRef = useRef(null);
  
  // 특정 구역 하이라이트 함수
  const highlightZone = (svgDoc, zoneId) => {
    if (!svgDoc || !zoneId) return;
    
    // 기존 하이라이트 제거
    const highlighted = svgDoc.querySelectorAll('.highlight');
    highlighted.forEach(el => el.classList.remove('highlight'));
    
    // 새로운 하이라이트 추가
    const targetElement = svgDoc.getElementById(zoneId);
    if (targetElement) {
      targetElement.classList.add('highlight');
    }
  };

  useEffect(() => {
    const svgObject = svgRef.current;
    if (!svgObject) return;

    const handleSvgLoad = () => {
      const svgDoc = svgObject.contentDocument;
      if (!svgDoc) return;

      // 하이라이트할 구역이 있으면 하이라이트 적용
      if (highlightZoneId) {
        setTimeout(() => {
          highlightZone(svgDoc, highlightZoneId);
        }, 100); // SVG 로드 후 약간의 지연
      }

      const interactiveElements = svgDoc.querySelectorAll('[data-interactive="true"]');

      const handleMouseOver = (e) => {
        const roomElement = e.currentTarget;
        roomElement.classList.add('hovered');
      };

      const handleMouseOut = (e) => {
        e.currentTarget.classList.remove('hovered');
      };

      const handleClick = (e) => {
        const roomElement = e.currentTarget;
        const roomInfo = {
          id: roomElement.id,
          name: roomElement.getAttribute('data-name') || roomElement.id,
          type: roomElement.getAttribute('data-type') || 'room', // department zone 또는 room
          building: roomElement.getAttribute('data-building'),
          floor: roomElement.getAttribute('data-floor')
        };
        setSelectedRoom(roomInfo);
        if (onRoomSelect) {
          onRoomSelect(roomInfo);
        }
      };

      interactiveElements.forEach(elem => {
        elem.addEventListener('mouseover', handleMouseOver);
        elem.addEventListener('mouseout', handleMouseOut);
        elem.addEventListener('click', handleClick);
      });

      return () => {
        interactiveElements.forEach(elem => {
          elem.removeEventListener('mouseover', handleMouseOver);
          elem.removeEventListener('mouseout', handleMouseOut);
          elem.removeEventListener('click', handleClick);
        });
      };
    };

    svgObject.addEventListener('load', handleSvgLoad);
    if (svgObject.contentDocument) {
        handleSvgLoad();
    }

    return () => {
      svgObject.removeEventListener('load', handleSvgLoad);
    };
  }, [mapUrl, onRoomSelect, highlightZoneId]);
  
  // highlightZoneId가 변경될 때 하이라이트 업데이트
  useEffect(() => {
    const svgObject = svgRef.current;
    if (!svgObject || !svgObject.contentDocument) return;
    
    highlightZone(svgObject.contentDocument, highlightZoneId);
  }, [highlightZoneId]);

  return (
    <div className="map-container">
      <object
        ref={svgRef}
        data={mapUrl}
        type="image/svg+xml"
        className="interactive-map"
        aria-label="Interactive hospital map"
      />
      {selectedRoom && (
        <div className="selected-room-info">
          <p className="text-sm font-medium text-gray-900">
            선택된 위치: {selectedRoom.name}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveMapViewer;