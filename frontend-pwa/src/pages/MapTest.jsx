import React, { useState } from 'react';
import InteractiveMapViewer from '../components/maps/InteractiveMapViewer';
import './MapTest.css';

// 병원 지도의 정확한 복도 노드 (세밀하게 조정됨)
const navigationNodes = {
  // === 건물 입구 ===
  entrance_main: { x: 450, y: 80, name: '정문' },
  
  // === 검사실/시설 입구 (실제 문 위치) ===
  door_emergency: { x: 220, y: 280, name: '응급센터 문' },
  door_lab: { x: 500, y: 200, name: '진단검사의학과 문' },
  door_blood: { x: 700, y: 200, name: '채혈실 문' },
  door_xray: { x: 380, y: 200, name: 'X-ray실 문' },
  door_ct: { x: 320, y: 200, name: 'CT실 문' },
  door_donation: { x: 140, y: 430, name: '헌혈실 문' },
  door_convenience: { x: 570, y: 280, name: '편의점 문' },
  door_cafe: { x: 570, y: 360, name: '카페 문' },
  door_bank: { x: 680, y: 280, name: '은행 문' },
  door_pharmacy: { x: 780, y: 280, name: '약국 문' },
  
  // === 메인 복도 (중앙 가로 복도) ===
  corridor_main_1: { x: 180, y: 240, name: '서쪽 끝 복도' },
  corridor_main_2: { x: 250, y: 240, name: '응급센터 앞 복도' },
  corridor_main_3: { x: 320, y: 240, name: 'CT실 앞 복도' },
  corridor_main_4: { x: 380, y: 240, name: 'X-ray실 앞 복도' },
  corridor_main_5: { x: 450, y: 240, name: '중앙 로비' },
  corridor_main_6: { x: 500, y: 240, name: '진단검사의학과 앞 복도' },
  corridor_main_7: { x: 570, y: 240, name: '편의시설 앞 복도' },
  corridor_main_8: { x: 640, y: 240, name: '동쪽 복도' },
  corridor_main_9: { x: 700, y: 240, name: '채혈실 앞 복도' },
  corridor_main_10: { x: 780, y: 240, name: '약국 앞 복도' },
  corridor_main_11: { x: 850, y: 240, name: '동쪽 끝 복도' },
  
  // === 세로 연결 복도 ===
  corridor_north_1: { x: 450, y: 160, name: '정문 연결 복도' },
  corridor_north_2: { x: 450, y: 120, name: '정문 근처 복도' },
  
  corridor_south_1: { x: 320, y: 320, name: '남쪽 복도 1' },
  corridor_south_2: { x: 450, y: 320, name: '남쪽 복도 2' },
  corridor_south_3: { x: 570, y: 320, name: '남쪽 복도 3' },
  corridor_south_4: { x: 680, y: 320, name: '남쪽 복도 4' },
  
  // === 하단 가로 복도 ===
  corridor_bottom_1: { x: 140, y: 460, name: '헌혈실 앞 복도' },
  corridor_bottom_2: { x: 250, y: 460, name: '하단 서쪽 복도' },
  corridor_bottom_3: { x: 380, y: 460, name: '하단 중앙 복도' },
  corridor_bottom_4: { x: 500, y: 460, name: '하단 동쪽 복도' },
  corridor_bottom_5: { x: 450, y: 400, name: '하단 연결 복도' },
  
  // === 우회 경로용 추가 노드 ===
  bypass_north: { x: 450, y: 180, name: '북쪽 우회로' },
  bypass_east_1: { x: 750, y: 240, name: '동쪽 우회로 1' },
  bypass_east_2: { x: 750, y: 180, name: '동쪽 우회로 2' },
};

// 복도만 따라가는 정확한 경로
const predefinedPaths = {
  '정문 → 채혈실': [
    'entrance_main',
    'corridor_north_2',        // 정문에서 복도로
    'corridor_north_1',        // 복도 따라 남쪽으로
    'bypass_north',            // 우회로 시작
    'bypass_east_2',           // 동쪽으로 우회 (진단검사의학과 위쪽)
    'bypass_east_1',           // 남쪽으로 내려옴
    'corridor_main_9',         // 채혈실 앞 복도
    'door_blood',              // 채혈실 입구
  ],
  
  '정문 → 진단검사의학과': [
    'entrance_main',
    'corridor_north_2',
    'corridor_north_1',
    'corridor_main_5',         // 중앙 로비
    'corridor_main_6',         // 진단검사의학과 앞 복도
    'door_lab',                // 진단검사의학과 입구
  ],
  
  '응급센터 → 편의점': [
    'door_emergency',          // 응급센터 문에서 시작
    'corridor_main_2',         // 복도로 나옴
    'corridor_main_3',         // 동쪽으로
    'corridor_main_4',         // 계속 동쪽으로
    'corridor_main_5',         // 중앙 로비
    'corridor_main_6',         // 계속 동쪽으로
    'corridor_main_7',         // 편의시설 앞
    'door_convenience',        // 편의점 입구
  ],
  
  '헌혈실 → 은행': [
    'door_donation',           // 헌혈실 문에서 시작
    'corridor_bottom_1',       // 하단 복도로 나옴
    'corridor_bottom_2',       // 동쪽으로
    'corridor_bottom_3',       // 계속 동쪽으로
    'corridor_bottom_5',       // 북쪽으로 올라감
    'corridor_south_2',        // 중간 높이 도달
    'corridor_main_5',         // 메인 복도로
    'corridor_main_7',         // 동쪽으로
    'corridor_main_8',         // 계속 동쪽으로
    'corridor_south_4',        // 은행 위치로
    'door_bank',               // 은행 입구
  ],
  
  'X-ray실 → 약국': [
    'door_xray',               // X-ray실 문에서 시작
    'corridor_main_4',         // 복도로 나옴
    'corridor_main_5',         // 동쪽으로
    'corridor_main_6',
    'corridor_main_7',
    'corridor_main_8',
    'corridor_main_9',
    'corridor_main_10',        // 약국 앞
    'door_pharmacy',           // 약국 입구
  ],
  
  'CT실 → 카페': [
    'door_ct',                 // CT실 문에서 시작
    'corridor_main_3',         // 복도로 나옴
    'corridor_main_4',
    'corridor_main_5',
    'corridor_main_6',
    'corridor_main_7',         // 편의시설 앞
    'corridor_south_3',        // 남쪽으로
    'door_cafe',               // 카페 입구
  ],
};

// 90도 직각 경로 생성
const generateRectilinearPath = (nodeIds) => {
  if (!nodeIds || nodeIds.length < 2) return '';
  const coords = nodeIds.map(id => navigationNodes[id]);
  if (!coords.every(c => c)) return '';
  
  let path = `M ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i-1];
    const curr = coords[i];
    
    // x, y가 모두 다르면 90도 회전 (수평 이동 우선)
    if (prev.x !== curr.x && prev.y !== curr.y) {
      // 거리가 짧은 축을 먼저 이동
      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);
      
      if (dx < dy) {
        // x축 먼저 이동
        path += ` L ${curr.x} ${prev.y}`;
      } else {
        // y축 먼저 이동
        path += ` L ${prev.x} ${curr.y}`;
      }
    }
    path += ` L ${curr.x} ${curr.y}`;
  }
  
  return path;
};

const MapTest = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [pathData, setPathData] = useState('');
  const [currentPathName, setCurrentPathName] = useState('');
  const [showNodes, setShowNodes] = useState(false);

  const handleRoomSelection = (roomInfo) => setSelectedLocation(roomInfo);

  const createPath = (pathName) => {
    const nodeIds = predefinedPaths[pathName];
    if (!nodeIds) return;
    
    const pathString = generateRectilinearPath(nodeIds);
    setPathData(pathString);
    setCurrentPathName(pathName);
  };

  const clearPath = () => {
    setPathData('');
    setCurrentPathName('');
  };

  return (
    <div className="map-test-page">
      <header className="page-header">
        <h1>🏥 병원 지도 테스트</h1>
        <p className="subtitle">정밀 복도 경로 시스템</p>
      </header>
      
      <div className="controls">
        {Object.keys(predefinedPaths).map(pathName => (
          <button 
            key={pathName} 
            onClick={() => createPath(pathName)} 
            className="action-button primary"
          >
            🗺️ {pathName}
          </button>
        ))}
        
        {pathData && (
          <button onClick={clearPath} className="action-button secondary">
            ❌ 경로 초기화
          </button>
        )}
        
        <button 
          onClick={() => setShowNodes(!showNodes)} 
          className="action-button"
          style={{ backgroundColor: showNodes ? '#10b981' : '#6b7280' }}
        >
          {showNodes ? '🔵 노드 숨기기' : '⭕ 노드 표시'}
        </button>
      </div>
      
      {currentPathName && (
        <div style={{ 
          textAlign: 'center', 
          padding: '10px', 
          backgroundColor: '#e0f2fe', 
          borderRadius: '8px',
          margin: '10px auto',
          maxWidth: '600px'
        }}>
          <p style={{ margin: 0, fontSize: '16px', color: '#0c4a6e' }}>
            현재 경로: <strong>{currentPathName}</strong>
          </p>
        </div>
      )}
      
      <main className="main-content">
        <div className="map-area">
          <InteractiveMapViewer 
            mapUrl="/images/maps/main_1f.interactive.svg" 
            onRoomSelect={handleRoomSelection} 
          />
          
          {/* 경로 렌더링 */}
          {pathData && (
            <svg className="path-overlay" preserveAspectRatio="xMidYMid meet" viewBox="0 0 900 600">
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
                    fill="#ff4444"
                  />
                </marker>
              </defs>
              
              {/* 메인 경로 */}
              <path 
                d={pathData} 
                stroke="#0066ff" 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#arrowhead)"
                strokeDasharray="6,3"
                style={{ animation: 'dash 30s linear infinite' }}
              />
              
              {/* 시작점 마커 (S) */}
              {(() => {
                const firstNode = predefinedPaths[currentPathName]?.[0];
                const startPoint = firstNode ? navigationNodes[firstNode] : null;
                return startPoint ? (
                  <g>
                    <circle
                      cx={startPoint.x}
                      cy={startPoint.y}
                      r="10"
                      fill="#00cc00"
                      fillOpacity="0.8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={startPoint.x}
                      y={startPoint.y + 4}
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      S
                    </text>
                  </g>
                ) : null;
              })()}
              
              {/* 도착점 마커 (E) */}
              {(() => {
                const lastNode = predefinedPaths[currentPathName]?.slice(-1)[0];
                const endPoint = lastNode ? navigationNodes[lastNode] : null;
                return endPoint ? (
                  <g>
                    <circle
                      cx={endPoint.x}
                      cy={endPoint.y}
                      r="10"
                      fill="#ff4444"
                      fillOpacity="0.8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={endPoint.x}
                      y={endPoint.y + 4}
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      E
                    </text>
                  </g>
                ) : null;
              })()}
            </svg>
          )}
          
          {/* 노드 표시 오버레이 */}
          {showNodes && (
            <svg className="path-overlay" preserveAspectRatio="xMidYMid meet" viewBox="0 0 900 600">
              {Object.entries(navigationNodes).map(([nodeId, node]) => (
                <g key={nodeId}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="4"
                    fill={
                      nodeId.startsWith('entrance_') ? '#22c55e' :     // 녹색: 건물 입구
                      nodeId.startsWith('door_') ? '#ef4444' :         // 빨간색: 시설 문
                      nodeId.startsWith('corridor_main') ? '#3b82f6' : // 파란색: 메인 복도
                      nodeId.startsWith('bypass_') ? '#a855f7' :       // 보라색: 우회로
                      '#fbbf24'                                        // 노란색: 기타 복도
                    }
                    fillOpacity="0.8"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  {/* 노드 이름은 줌인 시에만 표시 */}
                  <text
                    x={node.x}
                    y={node.y - 6}
                    fill="#1f2937"
                    fontSize="7"
                    fontWeight="400"
                    textAnchor="middle"
                    opacity="0.7"
                  >
                    {node.name}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
        
        {selectedLocation && (
          <aside className="selected-panel">
            <h3>📍 선택된 위치 정보</h3>
            <div className="info-content">
              <div className="info-row">
                <span className="info-label">ID:</span>
                <span className="info-value">{selectedLocation.id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">이름:</span>
                <span className="info-value">{selectedLocation.name}</span>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
};

export default MapTest;