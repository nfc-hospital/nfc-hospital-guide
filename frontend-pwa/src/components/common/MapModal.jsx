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
  const [currentStep, setCurrentStep] = useState('select'); // 'select' or 'map'

  if (!isOpen) return null;

  const handleDestinationClick = (destination) => {
    setSelectedDestination(destination.label);
    
    const pathName = destination.pathName;
    const nodeIds = mapConfig?.paths?.[pathName];
    
    if (nodeIds && mapConfig?.nodes) {
      const pathString = generateRectilinearPath(mapConfig.nodes, nodeIds);
      setActivePath(pathString);
      setCurrentStep('map'); // 지도 화면으로 전환
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
    setActivePath(null);
  };

  const handleClose = () => {
    setActivePath(null);
    setSelectedDestination(null);
    setCurrentStep('select');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Step 1: 목적지 선택 화면 */}
        {currentStep === 'select' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                어디로 가시나요?
              </h2>
              <button 
                onClick={handleClose}
                className="text-3xl text-gray-600 hover:text-gray-900 p-1"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              목적지를 선택하면 현재 위치에서 가는 경로를 안내해드립니다.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {destinations && destinations.map(dest => (
                <button 
                  key={dest.pathName}
                  onClick={() => handleDestinationClick(dest)}
                  className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <span className="text-2xl">{dest.icon || '📍'}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {dest.label}
                    </div>
                    {dest.description && (
                      <div className="text-sm text-gray-500 mt-1">
                        {dest.description}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 지도 화면 */}
        {currentStep === 'map' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {selectedDestination} 경로 안내
                  </h2>
                  <p className="text-sm text-gray-600">정문에서 출발</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="text-2xl text-gray-600 hover:text-gray-900 p-2"
              >
                ×
              </button>
            </div>
            
            <div className="relative flex-1 p-4">
              <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
                <InteractiveMapViewer mapUrl={mapConfig?.url || '/images/maps/main_1f.interactive.svg'} />
                
                {activePath && (
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapModal;