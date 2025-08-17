import React, { useEffect, useState, useRef } from 'react';
import './InteractiveMapViewer.css';

const InteractiveMapViewer = ({ mapUrl, onRoomSelect }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
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
      };

      const handleMouseOut = (e) => {
        e.currentTarget.classList.remove('hovered');
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
    </div>
  );
};

export default InteractiveMapViewer;