import React, { useState, useEffect, useRef } from 'react';
import { TrashIcon, MapIcon } from '@heroicons/react/24/outline';
import { availableMaps } from '../data/facilityRoutes';

/**
 * MapNodeEditorV2 - Multi-floor 경로 편집기 (완전히 새로 작성)
 *
 * 핵심 개념:
 * 1. 각 맵(층)별로 완전히 독립적인 노드/엣지 관리
 * 2. 맵 전환 시 이전 맵의 노드는 보이지 않음
 * 3. 층간/건물간 이동을 위한 transition 노드 지원
 * 4. 각 노드에 시설 정보 매핑 가능
 */
const MapNodeEditorV2 = () => {
  const svgContainerRef = useRef(null);

  // === 기본 상태 ===
  const [currentMapId, setCurrentMapId] = useState('main_1f');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);

  // === Multi-floor 데이터 구조 ===
  // 형식: { 'main_1f': { nodes: [...], edges: [...], ... }, 'main_2f': { ... } }
  const [mapsData, setMapsData] = useState({});

  // 현재 맵의 데이터 가져오기 (없으면 빈 객체 반환)
  const getCurrentMapData = () => {
    return mapsData[currentMapId] || {
      nodes: [],
      edges: [],
      startNode: null,
      endNode: null,
      nodeInfo: {} // { nodeId: { type: 'place'|'transition', facilityId: '...', targetMap: '...', targetNode: '...' } }
    };
  };

  const currentData = getCurrentMapData();

  // === 현재 맵의 데이터 업데이트 ===
  const updateCurrentMap = (updates) => {
    setMapsData(prev => ({
      ...prev,
      [currentMapId]: {
        ...getCurrentMapData(),
        ...updates
      }
    }));
  };

  // === SVG 로드 ===
  const [svgLoaded, setSvgLoaded] = useState(false);

  useEffect(() => {
    loadSvg();
  }, [currentMapId]);

  const loadSvg = async () => {
    if (!svgContainerRef.current) return;

    setSvgLoaded(false);

    try {
      const response = await fetch(`/images/maps/${currentMapId}.svg`);
      if (!response.ok) throw new Error('SVG load failed');

      const svgText = await response.text();
      svgContainerRef.current.innerHTML = svgText;

      const svg = svgContainerRef.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        setSvgLoaded(true);
      }
    } catch (error) {
      console.error('SVG 로드 실패:', error);
      svgContainerRef.current.innerHTML = `
        <div class="flex items-center justify-center h-full text-gray-500">
          <p>지도를 불러올 수 없습니다: ${currentMapId}</p>
        </div>
      `;
    }
  };

  // === SVG 클릭 핸들러 (노드 추가 및 선택) ===
  const handleSvgClick = (e) => {
    const svg = svgContainerRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      const x = Math.round(svgP.x);
      const y = Math.round(svgP.y);

      // 기존 노드 클릭 확인
      const clickedNode = currentData.nodes.find(node => {
        const dist = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        return dist < 15;
      });

      if (clickedNode) {
        handleNodeClick(clickedNode);
      } else if (!isConnecting) {
        // 빈 공간 클릭 -> 새 노드 추가
        addNode(x, y);
      }
    } catch (error) {
      console.error('클릭 처리 오류:', error);
    }
  };

  // === 노드 추가 ===
  const addNode = (x, y) => {
    const nodeId = `node-${Date.now()}`; // 유니크한 ID
    const newNode = {
      id: nodeId,
      x,
      y,
      name: `노드 ${currentData.nodes.length + 1}`
    };

    updateCurrentMap({
      nodes: [...currentData.nodes, newNode]
    });

    console.log(`✅ 노드 추가 [${currentMapId}]:`, newNode);
  };

  // === 노드 클릭 (선택 또는 연결) ===
  const handleNodeClick = (node) => {
    if (isConnecting && connectingFrom) {
      // 연결 모드: 엣지 추가
      if (connectingFrom.id !== node.id) {
        const newEdge = [connectingFrom.id, node.id];
        const exists = currentData.edges.some(edge =>
          (edge[0] === newEdge[0] && edge[1] === newEdge[1]) ||
          (edge[0] === newEdge[1] && edge[1] === newEdge[0])
        );

        if (!exists) {
          updateCurrentMap({
            edges: [...currentData.edges, newEdge]
          });
          console.log(`✅ 엣지 추가 [${currentMapId}]:`, newEdge);
        }
      }
      setIsConnecting(false);
      setConnectingFrom(null);
    } else {
      // 일반 모드: 노드 선택
      setSelectedNode(node);
    }
  };

  // === 노드 삭제 ===
  const deleteNode = (nodeId) => {
    if (!confirm(`노드 ${nodeId}를 삭제하시겠습니까?`)) return;

    updateCurrentMap({
      nodes: currentData.nodes.filter(n => n.id !== nodeId),
      edges: currentData.edges.filter(e => e[0] !== nodeId && e[1] !== nodeId),
      startNode: currentData.startNode === nodeId ? null : currentData.startNode,
      endNode: currentData.endNode === nodeId ? null : currentData.endNode,
      nodeInfo: Object.fromEntries(
        Object.entries(currentData.nodeInfo).filter(([id]) => id !== nodeId)
      )
    });

    setSelectedNode(null);
    console.log(`❌ 노드 삭제 [${currentMapId}]:`, nodeId);
  };

  // === 노드 이름 변경 ===
  const updateNodeName = (nodeId, newName) => {
    updateCurrentMap({
      nodes: currentData.nodes.map(n =>
        n.id === nodeId ? { ...n, name: newName } : n
      )
    });
  };

  // === 노드 정보 업데이트 ===
  const updateNodeInfo = (nodeId, info) => {
    updateCurrentMap({
      nodeInfo: {
        ...currentData.nodeInfo,
        [nodeId]: {
          ...currentData.nodeInfo[nodeId],
          ...info
        }
      }
    });
  };

  // === 출발지/도착지 설정 ===
  const setStartNode = (nodeId) => {
    updateCurrentMap({ startNode: nodeId });
    setSelectedNode(null);
  };

  const setEndNode = (nodeId) => {
    updateCurrentMap({ endNode: nodeId });
    setSelectedNode(null);
  };

  // === 연결 모드 시작 ===
  const startConnecting = (node) => {
    setIsConnecting(true);
    setConnectingFrom(node);
    setSelectedNode(null);
  };

  // === 전체 초기화 ===
  const clearCurrentMap = () => {
    if (!confirm(`현재 맵(${currentMapId})의 모든 노드와 엣지를 삭제하시겠습니까?`)) return;

    updateCurrentMap({
      nodes: [],
      edges: [],
      startNode: null,
      endNode: null,
      nodeInfo: {}
    });

    setSelectedNode(null);
    console.log(`🗑️ 맵 초기화 [${currentMapId}]`);
  };

  // === 저장 ===
  const saveAllMaps = () => {
    if (!selectedFacility) {
      alert('시설을 먼저 선택해주세요!');
      return;
    }

    const hasData = Object.values(mapsData).some(data => data.nodes && data.nodes.length > 0);
    if (!hasData) {
      alert('저장할 데이터가 없습니다!');
      return;
    }

    // localStorage에 저장
    const facilityRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
    facilityRoutes[selectedFacility] = {
      maps: mapsData,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('facilityRoutes', JSON.stringify(facilityRoutes));

    alert(`✅ 저장 완료!\n시설: ${selectedFacility}\n맵 개수: ${Object.keys(mapsData).length}`);
    console.log('💾 저장된 데이터:', mapsData);
  };

  // === 불러오기 ===
  const loadFacilityData = (facilityName) => {
    const facilityRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
    const savedData = facilityRoutes[facilityName];

    if (savedData && savedData.maps) {
      setMapsData(savedData.maps);
      console.log(`📂 불러오기 완료 [${facilityName}]:`, savedData.maps);
      alert(`✅ 불러오기 완료!\n맵 개수: ${Object.keys(savedData.maps).length}`);
    } else {
      setMapsData({});
      console.log(`⚠️ 저장된 데이터 없음 [${facilityName}]`);
    }
  };

  useEffect(() => {
    if (selectedFacility) {
      loadFacilityData(selectedFacility);
    }
  }, [selectedFacility]);

  // === SVG 렌더링 (노드와 엣지 표시) ===
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;

    // 기존 그룹 제거
    const existingGroup = svg.querySelector('#editor-layer');
    if (existingGroup) existingGroup.remove();

    // 새 그룹 생성
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'editor-layer');

    // 엣지 그리기
    currentData.edges.forEach(([fromId, toId]) => {
      const fromNode = currentData.nodes.find(n => n.id === fromId);
      const toNode = currentData.nodes.find(n => n.id === toId);

      if (fromNode && toNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('stroke', '#3b82f6');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('opacity', '0.6');
        g.appendChild(line);
      }
    });

    // 노드 그리기
    currentData.nodes.forEach(node => {
      const nodeInfo = currentData.nodeInfo[node.id] || {};

      // 노드 색상 결정
      let fillColor = '#3b82f6'; // 기본 파란색
      let label = node.name;
      let radius = 10;

      if (node.id === currentData.startNode) {
        fillColor = '#22c55e'; // 녹색 (출발지)
        label = '🟢 ' + label;
        radius = 12;
      } else if (node.id === currentData.endNode) {
        fillColor = '#ef4444'; // 빨간색 (도착지)
        label = '🔴 ' + label;
        radius = 12;
      } else if (nodeInfo.type === 'transition') {
        fillColor = '#a855f7'; // 보라색 (층간 이동)
        label = '🟣 ' + label;
        radius = 11;
      } else if (selectedNode?.id === node.id) {
        fillColor = '#f59e0b'; // 주황색 (선택됨)
        radius = 11;
      }

      // 원
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '3');
      circle.style.cursor = 'pointer';

      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        handleNodeClick(node);
      });

      // 라벨
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - radius - 8);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#1e40af');
      text.style.pointerEvents = 'none';
      text.textContent = label;

      g.appendChild(circle);
      g.appendChild(text);
    });

    svg.appendChild(g);
  }, [svgLoaded, currentData, selectedNode, currentMapId]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* 상단 바 */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          {/* 왼쪽: 시설 선택 */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Multi-Floor 경로 편집기</h2>
            <input
              type="text"
              placeholder="시설 이름 (예: 채혈실)"
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-48"
            />
          </div>

          {/* 중앙: 맵 선택 */}
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-gray-600" />
            <select
              value={currentMapId}
              onChange={(e) => setCurrentMapId(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm font-medium"
            >
              {availableMaps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              ({currentData.nodes.length} 노드)
            </span>
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={clearCurrentMap}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              현재 맵 초기화
            </button>
            <button
              onClick={saveAllMaps}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              전체 저장
            </button>
          </div>
        </div>
      </div>

      {/* 출발지/도착지 표시 */}
      {(currentData.startNode || currentData.endNode) && (
        <div className="bg-gradient-to-r from-green-50 to-red-50 border-b px-4 py-2">
          <div className="flex items-center justify-center gap-6 text-sm">
            {currentData.startNode && (
              <span className="font-medium text-green-700">
                🟢 출발지: {currentData.nodes.find(n => n.id === currentData.startNode)?.name}
              </span>
            )}
            {currentData.endNode && (
              <span className="font-medium text-red-700">
                🔴 도착지: {currentData.nodes.find(n => n.id === currentData.endNode)?.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* SVG 캔버스 */}
        <div
          ref={svgContainerRef}
          onClick={handleSvgClick}
          className="flex-1 bg-gray-50 flex items-center justify-center"
          style={{ cursor: isConnecting ? 'crosshair' : 'default' }}
        />

        {/* 오른쪽 패널: 노드 설정 */}
        {selectedNode && (
          <div className="w-80 bg-white border-l shadow-lg p-4 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">노드 설정</h3>

            {/* 노드 ID */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">노드 ID</div>
              <div className="font-mono text-sm">{selectedNode.id}</div>
            </div>

            {/* 좌표 */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">좌표</div>
              <div className="text-sm">X: {selectedNode.x}, Y: {selectedNode.y}</div>
            </div>

            {/* 이름 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">노드 이름</label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* 출발지/도착지 설정 */}
            <div className="mb-4 border-t pt-4">
              <div className="text-sm font-semibold mb-2">경로 지정</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStartNode(selectedNode.id)}
                  disabled={currentData.startNode === selectedNode.id}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                    currentData.startNode === selectedNode.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {currentData.startNode === selectedNode.id ? '✓ 출발지' : '🟢 출발지로'}
                </button>
                <button
                  onClick={() => setEndNode(selectedNode.id)}
                  disabled={currentData.endNode === selectedNode.id}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                    currentData.endNode === selectedNode.id
                      ? 'bg-red-100 text-red-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {currentData.endNode === selectedNode.id ? '✓ 도착지' : '🔴 도착지로'}
                </button>
              </div>
            </div>

            {/* 노드 타입 */}
            <div className="mb-4 border-t pt-4">
              <label className="block text-sm font-semibold mb-2">노드 타입</label>
              <select
                value={currentData.nodeInfo[selectedNode.id]?.type || 'place'}
                onChange={(e) => updateNodeInfo(selectedNode.id, { type: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="place">🔵 일반 장소</option>
                <option value="transition">🟣 층간/건물간 이동</option>
              </select>
            </div>

            {/* 층간 이동 설정 */}
            {currentData.nodeInfo[selectedNode.id]?.type === 'transition' && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="text-sm font-semibold text-purple-900 mb-2">다음 맵 연결</div>

                <label className="block text-xs text-purple-700 mb-1">이동할 맵</label>
                <select
                  value={currentData.nodeInfo[selectedNode.id]?.targetMap || ''}
                  onChange={(e) => updateNodeInfo(selectedNode.id, { targetMap: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm mb-2"
                >
                  <option value="">선택...</option>
                  {availableMaps.filter(m => m.id !== currentMapId).map(map => (
                    <option key={map.id} value={map.id}>{map.name}</option>
                  ))}
                </select>

                <label className="block text-xs text-purple-700 mb-1">연결될 노드 ID</label>
                <input
                  type="text"
                  placeholder="예: node-1234567890"
                  value={currentData.nodeInfo[selectedNode.id]?.targetNode || ''}
                  onChange={(e) => updateNodeInfo(selectedNode.id, { targetNode: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            )}

            {/* 시설 ID 매핑 */}
            <div className="mb-4 border-t pt-4">
              <label className="block text-sm font-semibold mb-2">시설 ID (선택)</label>
              <input
                type="text"
                placeholder="예: blood-collection"
                value={currentData.nodeInfo[selectedNode.id]?.facilityId || ''}
                onChange={(e) => updateNodeInfo(selectedNode.id, { facilityId: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                이 노드가 특정 시설을 나타내면 시설 ID를 입력하세요
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 border-t pt-4">
              <button
                onClick={() => startConnecting(selectedNode)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                연결하기
              </button>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 연결 모드 안내 */}
        {isConnecting && (
          <div className="absolute left-4 top-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium">연결할 노드를 클릭하세요</p>
            <p className="text-xs text-gray-600 mt-1">
              {connectingFrom.name} → ?
            </p>
            <button
              onClick={() => {
                setIsConnecting(false);
                setConnectingFrom(null);
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              취소
            </button>
          </div>
        )}

        {/* 왼쪽 하단: 통계 */}
        <div className="absolute left-4 bottom-4 bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm space-y-1">
            <div className="font-semibold text-gray-700">{currentMapId}</div>
            <div>노드: {currentData.nodes.length}개</div>
            <div>엣지: {currentData.edges.length}개</div>
          </div>
        </div>

        {/* 오른쪽 하단: 전체 맵 목록 */}
        <div className="absolute right-4 bottom-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <div className="text-sm font-semibold mb-2">저장된 맵</div>
          <div className="space-y-1 text-xs">
            {Object.keys(mapsData).length === 0 && (
              <div className="text-gray-400">아직 저장된 맵이 없습니다</div>
            )}
            {Object.entries(mapsData).map(([mapId, data]) => (
              <div key={mapId} className="flex justify-between items-center">
                <span className={mapId === currentMapId ? 'font-bold text-blue-600' : 'text-gray-600'}>
                  {availableMaps.find(m => m.id === mapId)?.name || mapId}
                </span>
                <span className="text-gray-400">
                  {data.nodes?.length || 0} 노드
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapNodeEditorV2;
