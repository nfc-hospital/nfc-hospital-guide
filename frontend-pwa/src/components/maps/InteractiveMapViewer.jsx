import React, { useEffect, useState, useRef } from 'react';
import './InteractiveMapViewer.css';

const InteractiveMapViewer = ({ mapUrl, onRoomSelect }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const svgRef = useRef(null);

  useEffect(() => {
    const svgObject = svgRef.current;
    if (!svgObject) return;

    const handleSvgLoad = () => {
      const svgDoc = svgObject.contentDocument;
      if (!svgDoc) return;

      const interactiveElements = svgDoc.querySelectorAll('[data-interactive="true"]');

      const handleMouseOver = (e) => {
        const roomElement = e.currentTarget;
        roomElement.classList.add('hovered');
        const roomName = roomElement.getAttribute('data-name') || roomElement.id;
        
        const rect = roomElement.getBoundingClientRect();
        const containerRect = svgObject.getBoundingClientRect();
        setTooltip({
          visible: true,
          content: roomName,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 10,
        });
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
  }, [mapUrl, onRoomSelect]);

  return (
    <div className="map-container">
      <object
        ref={svgRef}
        data={mapUrl}
        type="image/svg+xml"
        className="interactive-map"
        aria-label="Interactive hospital map"
      />
      {tooltip.visible && (
        <div className="tooltip" style={{ position: 'absolute', left: `${tooltip.x}px`, top: `${tooltip.y}px` }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default InteractiveMapViewer;