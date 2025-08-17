import React, { useState } from 'react';
import InteractiveMapViewer from '../maps/InteractiveMapViewer';

// 90도 직각 경로 생성 함수
const generateRectilinearPath = (nodes, nodeIds) => {
  if (!nodes || !nodeIds || nodeIds.length < 2) return '';
  
  const coords = nodeIds.map(id => nodes[id]).filter(Boolean);
  if (coords.length < 2) return '';
  
  let path = `M ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i-1];
    const curr = coords[i];
    
    // x, y가 모두 다르면 90도 회전
    if (prev.x !== curr.x && prev.y !== curr.y) {
      // 거리가 짧은 축을 먼저 이동
      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);
      
      if (dx < dy) {
        path += ` L ${curr.x} ${prev.y}`;
      } else {
        path += ` L ${prev.x} ${curr.y}`;
      }
    }
    path += ` L ${curr.x} ${curr.y}`;
  }
  
  return path;
};

const MapModal = ({ isOpen, onClose, mapConfig, destinations, title }) => {
  const [activePath, setActivePath] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);

  if (!isOpen) return null;

  const handleDestinationClick = (destination) => {
    const pathName = destination.pathName;
    const nodeIds = mapConfig?.paths?.[pathName];
    
    if (nodeIds && mapConfig?.nodes) {
      const pathString = generateRectilinearPath(mapConfig.nodes, nodeIds);
      setActivePath(pathString);
      setSelectedDestination(destination.label);
    }
  };

  const handleClose = () => {
    setActivePath(null);
    setSelectedDestination(null);
    onClose();
  };

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
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          display: 'flex',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 목적지 선택 사이드바 */}
        <div style={{ 
          padding: '24px',
          borderRight: '1px solid #e5e7eb',
          width: '280px',
          backgroundColor: '#f9fafb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827'
          }}>
            목적지 선택
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            가고 싶은 장소를 선택하세요
          </p>
          
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            overflowY: 'auto'
          }}>
            {destinations && destinations.map(dest => (
              <button 
                key={dest.pathName}
                onClick={() => handleDestinationClick(dest)}
                style={{ 
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: selectedDestination === dest.label ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  backgroundColor: selectedDestination === dest.label ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  fontWeight: selectedDestination === dest.label ? '600' : '400',
                  color: selectedDestination === dest.label ? '#1d4ed8' : '#374151'
                }}
                onMouseEnter={e => {
                  if (selectedDestination !== dest.label) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedDestination !== dest.label) {
                    e.target.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{dest.icon || '📍'}</span>
                  <div>
                    <div style={{ fontWeight: '500' }}>{dest.label}</div>
                    {dest.description && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {dest.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedDestination && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              border: '1px solid #86efac'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                ✅ 선택됨: <strong>{selectedDestination}</strong>
              </p>
            </div>
          )}
        </div>
        
        {/* 지도 표시 영역 */}
        <div style={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {title || '병원 지도'}
            </h2>
            <button 
              onClick={handleClose}
              style={{ 
                fontSize: '28px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0 8px',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
          
          <div className="map-area" style={{ 
            position: 'relative',
            width: '800px',
            height: '600px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}>
            <InteractiveMapViewer mapUrl={mapConfig?.url || '/images/maps/main_1f.interactive.svg'} />
            
            {activePath && (
              <svg 
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 10 
                }}
                preserveAspectRatio="xMidYMid meet"
                viewBox={mapConfig?.viewBox || "0 0 900 600"}
              >
                <defs>
                  <marker 
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <polygon 
                      points="0,0 10,5 0,10"
                      fill="#0066ff"
                    />
                  </marker>
                </defs>
                
                {/* 경로 애니메이션 */}
                <path 
                  d={activePath}
                  stroke="#0066ff"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd="url(#arrowhead)"
                  strokeDasharray="8,4"
                  style={{ 
                    animation: 'dash 30s linear infinite'
                  }}
                />
              </svg>
            )}
            
            {!activePath && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '20px 32px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '16px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  ← 왼쪽에서 목적지를 선택하세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;