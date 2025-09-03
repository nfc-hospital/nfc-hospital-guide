// frontend-pwa/src/components/maps/InteractiveMapViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { mapService } from '../../api/mapService';
import LoadingSpinner from '../common/LoadingSpinner';
import './InteractiveMapViewer.css';

const InteractiveMapViewer = ({ mapName }) => {
  const [svgContent, setSvgContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const svgContainerRef = useRef(null);

  useEffect(() => {
    if (!mapName) return;

    const fetchMap = async () => {
      setIsLoading(true);
      setSvgContent(null);
      const content = await mapService.getMapSvgContent(mapName);
      setSvgContent(content);
      setIsLoading(false);
    };

    fetchMap();
  }, [mapName]);

  return (
    <div className="map-viewer-container">
      {isLoading && <LoadingSpinner />}
      <div
        ref={svgContainerRef}
        className="svg-container"
        style={{ visibility: isLoading ? 'hidden' : 'visible' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};

export default InteractiveMapViewer;