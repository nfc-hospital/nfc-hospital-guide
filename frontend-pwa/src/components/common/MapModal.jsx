import React from 'react';
import InteractiveMapViewer from '../maps/InteractiveMapViewer';

const MapModal = ({ isOpen, onClose, mapUrl, pathData, title }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>{title || '병원 지도'}</h2>
          <button 
            onClick={onClose} 
            style={{ fontSize: '24px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        <div className="map-area" style={{ position: 'relative', width: '800px', height: '600px', border: '1px solid #ccc' }}>
          <InteractiveMapViewer mapUrl={mapUrl} />
          {pathData && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} preserveAspectRatio="xMidYMid meet" viewBox="0 0 900 600">
              <path 
                d={pathData} 
                stroke="#007bff"
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapModal;