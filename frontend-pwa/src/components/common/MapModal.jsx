import React, { useState, useEffect } from 'react';
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

const MapModal = ({ isOpen, onClose, mapConfig, destinations, title, appointment }) => {
  const [activePath, setActivePath] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentStep, setCurrentStep] = useState('select'); // 'select' or 'map'
  const [currentFloor, setCurrentFloor] = useState('본관 1층');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('전체'); // 목적지 필터링용

  // 층별 지도 설정
  const floorMaps = mapConfig || {};

  // appointment 정보가 있으면 해당 층으로 자동 설정하고 바로 지도 화면으로
  useEffect(() => {
    if (appointment?.exam && isOpen) {
      // building과 floor 정보로 정확한 층 찾기
      const building = appointment.exam.building || '본관';
      const floorNum = appointment.exam.floor || '1';
      const floorKey = `${building} ${floorNum}층`;
      
      if (floorMaps[floorKey]) {
        setCurrentFloor(floorKey);
        setCurrentStep('map'); // 바로 지도 화면으로 이동
        // appointment용 선택된 목적지 객체 생성
        setSelectedDestination({
          label: appointment.exam.title,
          description: `${appointment.exam.building} ${appointment.exam.floor}층 ${appointment.exam.room}`,
          icon: '🏥',
          floor: floorKey
        });
      }
    }
  }, [isOpen]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setActivePath(null);
      setSelectedDestination(null);
      setCurrentStep('select');
      setSelectedFloorFilter('전체');
      setCurrentFloor('본관 1층');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDestinationClick = (destination) => {
    setSelectedDestination(destination);
    
    // 해당 목적지의 층으로 변경
    if (destination.floor && floorMaps[destination.floor]) {
      setCurrentFloor(destination.floor);
    }
    
    // 해당 층의 경로 정보 가져오기
    const floorConfig = floorMaps[destination.floor || currentFloor];
    const pathName = destination.pathName;
    const nodeIds = floorConfig?.paths?.[pathName];
    
    if (nodeIds && floorConfig?.nodes) {
      const pathString = generateRectilinearPath(floorConfig.nodes, nodeIds);
      setActivePath(pathString);
      setCurrentStep('map'); // 지도 화면으로 전환
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
    setActivePath(null);
    setSelectedDestination(null);
  };

  const handleClose = () => {
    setActivePath(null);
    setSelectedDestination(null);
    setCurrentStep('select');
    setSelectedFloorFilter('전체');
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
            
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              목적지를 선택하면 현재 위치에서 가는 경로를 안내해드립니다.
            </p>
            
            {/* 층 필터 버튼 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setSelectedFloorFilter('전체')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFloorFilter === '전체'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {Object.keys(floorMaps).map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloorFilter(floor)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedFloorFilter === floor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto">
              {/* 필터링된 목적지 표시 */}
              {destinations && Object.entries(
                destinations
                  .filter(dest => selectedFloorFilter === '전체' || dest.floor === selectedFloorFilter)
                  .reduce((acc, dest) => {
                    const floor = dest.floor || '기타';
                    if (!acc[floor]) acc[floor] = [];
                    acc[floor].push(dest);
                    return acc;
                  }, {})
              ).map(([floor, floorDests]) => (
                <div key={floor} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">
                    {floor}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {floorDests.map(dest => (
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
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 지도 화면 */}
        {currentStep === 'map' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {!appointment && (
                  <button 
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {selectedDestination?.label ? `${selectedDestination.label} 위치` : '병원 지도'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedDestination?.description || currentFloor}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="text-2xl text-gray-600 hover:text-gray-900 p-2"
              >
                ×
              </button>
            </div>
            
            {/* 선택된 목적지 정보 표시 */}
            <div className="px-4 py-3 bg-blue-50 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDestination?.icon || appointment?.exam?.icon || '📍'}</span>
                <div>
                  <div className="font-semibold text-blue-900">
                    {selectedDestination?.label || '목적지 선택됨'}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedDestination?.description || currentFloor}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative flex-1 p-4">
              <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
                <InteractiveMapViewer mapUrl={floorMaps[currentFloor]?.url || '/images/maps/main_1f.interactive.svg'} />
                
                {activePath && (
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox={floorMaps[currentFloor]?.viewBox || "0 0 900 600"}
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