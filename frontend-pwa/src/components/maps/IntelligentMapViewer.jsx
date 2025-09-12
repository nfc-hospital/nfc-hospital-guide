import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../../styles/IntelligentMapViewer.css';

const IntelligentMapViewer = ({ 
  startNodeId, 
  endNodeId, 
  onRouteCalculated,
  className = ""
}) => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [maps, setMaps] = useState({});
  const [nextActionGuidance, setNextActionGuidance] = useState(null);

  // Calculate route using optimized pathfinding
  const calculateRoute = async () => {
    if (!startNodeId || !endNodeId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/navigation/route-optimized/', {
        start_node_id: startNodeId,
        end_node_id: endNodeId
      });

      if (response.data.success) {
        setRouteData(response.data);
        
        // Set initial floor to start floor
        if (response.data.start_floor) {
          setCurrentFloor(response.data.start_floor);
        }

        // Calculate next action guidance
        calculateNextActionGuidance(response.data);
        
        if (onRouteCalculated) {
          onRouteCalculated(response.data);
        }
      } else {
        setError(response.data.error || 'Route calculation failed');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setError('Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate intelligent next action guidance
  const calculateNextActionGuidance = (routeData) => {
    if (!routeData.path_coordinates || routeData.path_coordinates.length < 2) {
      setNextActionGuidance(null);
      return;
    }

    const path = routeData.path_coordinates;
    const currentPath = path.filter(point => point.coordinates.floor === currentFloor);
    
    if (currentPath.length === 0) {
      setNextActionGuidance(null);
      return;
    }

    // Find the next significant action
    let nextAction = null;
    
    // Check for floor transitions
    for (let i = 0; i < path.length - 1; i++) {
      const currentPoint = path[i];
      const nextPoint = path[i + 1];
      
      if (currentPoint.coordinates.floor === currentFloor && 
          nextPoint.coordinates.floor !== currentFloor) {
        nextAction = {
          type: 'floor_transition',
          description: `Take ${currentPoint.transition_type || 'elevator'} to floor ${nextPoint.coordinates.floor}`,
          location: currentPoint.name,
          targetFloor: nextPoint.coordinates.floor,
          icon: currentPoint.transition_type === 'stairs' ? '🚶‍♂️' : '🛗'
        };
        break;
      }
    }

    // If no floor transition, provide general guidance
    if (!nextAction && currentPath.length > 1) {
      const endPoint = currentPath[currentPath.length - 1];
      nextAction = {
        type: 'navigate',
        description: `Head towards ${endPoint.name}`,
        location: endPoint.name,
        icon: '🚶‍♂️'
      };
    }

    setNextActionGuidance(nextAction);
  };

  // Load SVG maps for floors involved
  const loadMaps = async (floorsInvolved) => {
    const mapPromises = floorsInvolved.map(async (floor) => {
      try {
        const response = await axios.get(`/api/v1/maps/hospital-floor-${floor}.svg`);
        return { floor, svgContent: response.data };
      } catch (err) {
        console.error(`Failed to load map for floor ${floor}:`, err);
        return { floor, svgContent: null };
      }
    });

    const loadedMaps = await Promise.all(mapPromises);
    const mapsObject = {};
    loadedMaps.forEach(({ floor, svgContent }) => {
      mapsObject[floor] = svgContent;
    });
    
    setMaps(mapsObject);
  };

  // Filter path coordinates for current floor
  const currentFloorPath = useMemo(() => {
    if (!routeData?.path_coordinates) return [];
    return routeData.path_coordinates.filter(
      point => point.coordinates.floor === currentFloor
    );
  }, [routeData, currentFloor]);

  // 90도 직각 경로 생성 헬퍼 함수
  const generateOrthogonalPath = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return '';
    
    let pathString = `M ${coordinates[0].coordinates.x} ${coordinates[0].coordinates.y}`;
    
    for (let i = 1; i < coordinates.length; i++) {
      const current = coordinates[i].coordinates;
      const previous = coordinates[i - 1].coordinates;
      
      const dx = Math.abs(current.x - previous.x);
      const dy = Math.abs(current.y - previous.y);
      
      // 90도 직각 이동만 허용 (대각선 이동을 L자로 변환)
      if (dx > 5 && dy > 5) {
        // 대각선 이동을 두 단계로 나눔: 먼저 수평, 그다음 수직
        pathString += ` L ${current.x} ${previous.y}`;
        pathString += ` L ${current.x} ${current.y}`;
      } else {
        // 이미 수평 또는 수직 이동이면 그대로 연결
        pathString += ` L ${current.x} ${current.y}`;
      }
    }
    
    return pathString;
  };

  // Generate SVG path string with 90-degree orthogonal paths
  const pathString = useMemo(() => {
    if (currentFloorPath.length < 2) return '';
    
    return generateOrthogonalPath(currentFloorPath);
  }, [currentFloorPath]);

  // Handle floor change
  const handleFloorChange = (floor) => {
    setCurrentFloor(floor);
    calculateNextActionGuidance(routeData);
  };

  // Auto-calculate route when nodes change
  useEffect(() => {
    calculateRoute();
  }, [startNodeId, endNodeId]);

  // Load maps when route data is available
  useEffect(() => {
    if (routeData?.floors_involved) {
      loadMaps(routeData.floors_involved);
    }
  }, [routeData]);

  // Update guidance when floor changes
  useEffect(() => {
    if (routeData) {
      calculateNextActionGuidance(routeData);
    }
  }, [currentFloor, routeData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg font-medium text-gray-600">Calculating optimal route...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="text-red-500 text-2xl">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Route Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={calculateRoute}
          className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-300 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className={`bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 ${className}`}>
        <p className="text-lg text-gray-600">No route data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-2xl overflow-hidden ${className}`}>
      {/* Route Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b-2 border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 font-medium">Distance</p>
            <p className="text-xl font-bold text-blue-700">{routeData.total_distance}m</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Est. Time</p>
            <p className="text-xl font-bold text-blue-700">{Math.ceil(routeData.total_time / 60)} min</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Floors</p>
            <p className="text-xl font-bold text-blue-700">{routeData.floors_involved?.length || 1}</p>
          </div>
        </div>
        
        {/* Multi-floor route indicator */}
        {routeData.has_floor_transitions && (
          <div className="mt-4 bg-amber-100 border-2 border-amber-200 rounded-xl p-3">
            <div className="flex items-center space-x-2">
              <span className="text-amber-600 text-lg">🏢</span>
              <p className="text-amber-800 font-medium">
                Multi-floor route: {routeData.start_floor}F → {routeData.end_floor}F
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floor Selection Tabs */}
      {routeData.floors_involved && routeData.floors_involved.length > 1 && (
        <div className="bg-gray-50 px-6 py-4 border-b-2 border-gray-100">
          <div className="flex space-x-2 overflow-x-auto">
            {routeData.floors_involved.map(floor => (
              <button
                key={floor}
                onClick={() => handleFloorChange(floor)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap min-h-[48px] ${
                  currentFloor === floor
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
                }`}
              >
                {floor}F
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Next Action Guidance */}
      {nextActionGuidance && (
        <div className="bg-green-50 border-b-2 border-green-100 px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{nextActionGuidance.icon}</span>
            <div>
              <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Next Step</p>
              <p className="text-lg font-semibold text-green-800">{nextActionGuidance.description}</p>
              {nextActionGuidance.location && (
                <p className="text-green-700">at {nextActionGuidance.location}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Display */}
      <div className="p-6">
        <div className="bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-200">
          {maps[currentFloor] ? (
            <div className="relative">
              {/* SVG Map Container */}
              <div 
                className="w-full h-96 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: maps[currentFloor] }}
              />
              
              {/* Route Overlay */}
              {pathString && (
                <svg 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  viewBox="0 0 800 600"
                >
                  {/* Route Path */}
                  <path
                    d={pathString}
                    stroke="#3B82F6"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="0"
                    className="animate-pulse"
                  />
                  
                  {/* Start Marker */}
                  {currentFloorPath.length > 0 && (
                    <circle
                      cx={currentFloorPath[0].coordinates.x}
                      cy={currentFloorPath[0].coordinates.y}
                      r="8"
                      fill="#10B981"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* End Marker */}
                  {currentFloorPath.length > 1 && (
                    <circle
                      cx={currentFloorPath[currentFloorPath.length - 1].coordinates.x}
                      cy={currentFloorPath[currentFloorPath.length - 1].coordinates.y}
                      r="8"
                      fill="#EF4444"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Floor Transition Points */}
                  {currentFloorPath.filter(point => point.is_floor_transition).map((point, index) => (
                    <g key={index}>
                      <circle
                        cx={point.coordinates.x}
                        cy={point.coordinates.y}
                        r="12"
                        fill="#F59E0B"
                        stroke="#ffffff"
                        strokeWidth="3"
                        className="animate-bounce"
                      />
                      <text
                        x={point.coordinates.x}
                        y={point.coordinates.y + 6}
                        textAnchor="middle"
                        className="fill-white text-sm font-bold"
                      >
                        {point.transition_type === 'stairs' ? '🚶‍♂️' : '🛗'}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-lg text-gray-600">Loading floor {currentFloor} map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Floor-specific Route Instructions */}
        {currentFloorPath.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-2xl p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Route on Floor {currentFloor}
            </h4>
            <div className="space-y-2">
              {currentFloorPath.map((point, index) => (
                <div 
                  key={point.node_id}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
                    index === 0 ? 'bg-green-100 border-2 border-green-200' :
                    index === currentFloorPath.length - 1 ? 'bg-red-100 border-2 border-red-200' :
                    point.is_floor_transition ? 'bg-amber-100 border-2 border-amber-200' :
                    'bg-white border-2 border-gray-200'
                  }`}
                >
                  <span className="text-lg">
                    {index === 0 ? '🟢' : 
                     index === currentFloorPath.length - 1 ? '🔴' :
                     point.is_floor_transition ? '🟡' : '⚪'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{point.name}</p>
                    {point.is_floor_transition && (
                      <p className="text-sm text-amber-700">
                        → Take {point.transition_type} to Floor {point.transition_to_floor}
                      </p>
                    )}
                  </div>
                  {index > 0 && (
                    <span className="text-sm text-gray-500">
                      Step {index + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligentMapViewer;