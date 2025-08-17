import React, { useEffect, useState, useRef } from 'react';
import './InteractiveMapViewer.css';

const InteractiveMapViewer = ({ mapUrl, onRoomSelect }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const svgObject = svgRef.current;
    if (!svgObject) return;

    const handleSvgLoad = () => {
      const svgDoc = svgObject.contentDocument;
      if (!svgDoc) return;

      const interactiveElements = svgDoc.querySelectorAll('[data-interactive="true"]');

      const handleMouseMove = (e) => {
        const roomElement = e.currentTarget;
        const roomName = roomElement.getAttribute('data-name') || roomElement.id;
        
        // 마우스 위치를 직접 사용
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        
        setTooltip({
          visible: true,
          content: roomName,
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top - 30, // 마우스 위에 표시
        });
      };

      const handleMouseOver = (e) => {
        const roomElement = e.currentTarget;
        roomElement.classList.add('hovered');
        handleMouseMove(e);
      };

      const handleMouseOut = (e) => {
        e.currentTarget.classList.remove('hovered');
        setTooltip({ visible: false, content: '', x: 0, y: 0 });
      };

      const handleClick = (e) => {
        const roomElement = e.currentTarget;
        const roomInfo = {
          id: roomElement.id,
          name: roomElement.getAttribute('data-name') || roomElement.id,
        };
        setSelectedRoom(roomInfo);
        if (onRoomSelect) {
          onRoomSelect(roomInfo);
        }
      };

      interactiveElements.forEach(elem => {
        elem.addEventListener('mouseover', handleMouseOver);
        elem.addEventListener('mousemove', handleMouseMove);
        elem.addEventListener('mouseout', handleMouseOut);
        elem.addEventListener('click', handleClick);
      });

      return () => {
        interactiveElements.forEach(elem => {
          elem.removeEventListener('mouseover', handleMouseOver);
          elem.removeEventListener('mousemove', handleMouseMove);
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
  }, [mapUrl, onRoomSelect]);

  return (
    <div className="map-container" ref={containerRef}>
      <object
        ref={svgRef}
        data={mapUrl}
        type="image/svg+xml"
        className="interactive-map"
        aria-label="Interactive hospital map"
      />
      {tooltip.visible && (
        <div 
          className="tooltip" 
          style={{ 
            position: 'absolute', 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px`,
            pointerEvents: 'none'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default InteractiveMapViewer;