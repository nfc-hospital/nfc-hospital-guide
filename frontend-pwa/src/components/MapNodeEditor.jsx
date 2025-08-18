import React, { useState, useEffect, useRef } from 'react';
import { TrashIcon, ArrowPathIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { facilityRoutes, saveRoute, getFacilityRoute } from '../data/facilityRoutes';

const MapNodeEditor = () => {
  const svgContainerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState('');  // 초기값을 빈 문자열로
  const [mapId, setMapId] = useState('main_1f');

  // 시설 선택시 지도 변경 및 데이터 초기화
  useEffect(() => {
    console.log('시설 변경:', selectedFacility);
    
    // 먼저 모든 상태 초기화
    setNodes([]);
    setEdges([]);
    setNodeIdCounter(1);
    setSelectedNode(null);
    setIsConnecting(false);
    setConnectingFrom(null);
    
    if (selectedFacility && facilityRoutes[selectedFacility]) {
      const facility = facilityRoutes[selectedFacility];
      setMapId(facility.mapId);
      
      // 저장된 경로가 있으면 불러오기
      const savedRoute = getFacilityRoute(selectedFacility);
      if (savedRoute && savedRoute.nodes && savedRoute.nodes.length > 0) {
        console.log('저장된 노드 불러오기:', savedRoute.nodes.length, '개');
        
        // 중복 제거를 위해 ID 기준으로 유니크한 노드만 저장
        const uniqueNodes = [];
        const seenIds = new Set();
        
        savedRoute.nodes.forEach(node => {
          if (!seenIds.has(node.id)) {
            seenIds.add(node.id);
            uniqueNodes.push(node);
          }
        });
        
        setNodes(uniqueNodes);
        setEdges(savedRoute.edges || []);
        const maxId = Math.max(...uniqueNodes.map(n => parseInt(n.id.replace('node-', '')) || 0), 0);
        setNodeIdCounter(maxId + 1);
      }
    }
  }, [selectedFacility]);

  // 지도 이미지 경로
  const mapSrc = `/images/maps/${mapId}.svg`;

  useEffect(() => {
    loadSvg();
  }, [mapId]);
  
  // SVG 로드 완료 후 이벤트 리스너 등록
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;
    
    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;
    
    const clickHandler = (e) => handleSvgClick(e);
    
    // 기존 리스너 제거
    svg.removeEventListener('click', clickHandler);
    // 새 리스너 등록
    svg.addEventListener('click', clickHandler);
    
    return () => {
      svg.removeEventListener('click', clickHandler);
    };
  }, [svgLoaded, nodeIdCounter, nodes]); // svgLoaded 추가

  const loadSvg = async () => {
    if (!svgContainerRef.current) return;
    
    try {
      const response = await fetch(mapSrc);
      const svgText = await response.text();
      
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      
      // 클릭 이벤트는 useEffect에서만 관리하므로 여기서는 추가하지 않음
      // svgElement.addEventListener('click', handleSvgClick); // 제거!
      
      svgContainerRef.current.innerHTML = '';
      svgContainerRef.current.appendChild(svgElement);
      setSvgLoaded(true);
    } catch (error) {
      console.error('SVG 로드 오류:', error);
    }
  };

  const handleSvgClick = (e) => {
    if (!svgContainerRef.current) return;
    
    const svg = svgContainerRef.current.querySelector('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // 스크린 좌표를 SVG 좌표로 변환
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    // 기존 노드 클릭 확인
    const clickedNode = nodes.find(node => {
      const dist = Math.sqrt(Math.pow(node.x - svgP.x, 2) + Math.pow(node.y - svgP.y, 2));
      return dist < 15;
    });
    
    if (clickedNode) {
      handleNodeClick(clickedNode);
    } else if (!isConnecting) {
      // 빈 공간 클릭시 노드 추가
      addNode(svgP.x, svgP.y);
    }
  };

  const addNode = (x, y) => {
    const currentId = nodeIdCounter;
    const newNode = {
      id: `node-${currentId}`,
      x: Math.round(x),
      y: Math.round(y),
      name: `노드 ${currentId}`
    };
    
    console.log('노드 추가:', newNode.id);
    
    // 중복 체크
    if (nodes.some(n => n.id === newNode.id)) {
      console.error('중복된 노드 ID 발견:', newNode.id);
      return;
    }
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    setNodeIdCounter(currentId + 1);
  };

  const handleNodeClick = (node) => {
    if (isConnecting && connectingFrom) {
      // 연결 완료
      if (connectingFrom.id !== node.id) {
        const newEdge = [connectingFrom.id, node.id];
        // 중복 체크
        const exists = edges.some(edge => 
          (edge[0] === newEdge[0] && edge[1] === newEdge[1]) ||
          (edge[0] === newEdge[1] && edge[1] === newEdge[0])
        );
        
        if (!exists) {
          setEdges([...edges, newEdge]);
        }
      }
      setIsConnecting(false);
      setConnectingFrom(null);
    } else {
      setSelectedNode(node);
    }
  };

  // ... 나머지 코드는 모두 동일합니다 ...

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(edge => edge[0] !== nodeId && edge[1] !== nodeId));
    setSelectedNode(null);
  };

  const startConnecting = (node) => {
    setIsConnecting(true);
    setConnectingFrom(node);
    setSelectedNode(null);
  };

  const snapToGrid = (value, gridSize = 10) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const alignNodes = () => {
    // 현재 노드가 2개 미만이면 정렬할 필요 없음
    if (nodes.length < 2) {
      console.log('노드가 2개 미만이므로 정렬하지 않음');
      return;
    }

    console.log('=== 자동 정렬 시작 ===');
    console.log('정렬 전 노드:', nodes);
    
    // 중복 제거를 위해 Set 사용
    const uniqueNodeIds = new Set();
    const uniqueNodes = [];
    
    nodes.forEach(node => {
      if (!uniqueNodeIds.has(node.id)) {
        uniqueNodeIds.add(node.id);
        uniqueNodes.push({
          ...node,
          x: node.x,
          y: node.y
        });
      }
    });
    
    console.log('중복 제거 후 노드 개수:', uniqueNodes.length);
    
    // ID 순서로 정렬
    uniqueNodes.sort((a, b) => {
      const aNum = parseInt(a.id.replace('node-', ''));
      const bNum = parseInt(b.id.replace('node-', ''));
      return aNum - bNum;
    });

    const gridSize = 10;

    // 첫 번째 노드는 격자에 맞춤
    uniqueNodes[0].x = snapToGrid(uniqueNodes[0].x, gridSize);
    uniqueNodes[0].y = snapToGrid(uniqueNodes[0].y, gridSize);

    // 나머지 노드들을 순차적으로 90도로 정렬
    for (let i = 1; i < uniqueNodes.length; i++) {
      const prev = uniqueNodes[i - 1];
      const curr = uniqueNodes[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      
      // 가로/세로 중 더 긴 방향을 선택
      if (Math.abs(dx) >= Math.abs(dy)) {
        // 가로 이동
        curr.y = prev.y;
        curr.x = snapToGrid(curr.x, gridSize);
      } else {
        // 세로 이동
        curr.x = prev.x;
        curr.y = snapToGrid(curr.y, gridSize);
      }
    }

    console.log('정렬 완료, 최종 노드 개수:', uniqueNodes.length);

    // 상태 업데이트 - 중복 제거된 정렬 노드로 교체
    setNodes(uniqueNodes);
    
    // 엣지 재생성 - 순서대로 연결
    const newEdges = [];
    for (let i = 0; i < uniqueNodes.length - 1; i++) {
      newEdges.push([uniqueNodes[i].id, uniqueNodes[i + 1].id]);
    }
    setEdges(newEdges);
    
    console.log('=== 자동 정렬 완료 ===');
  };

  const exportNodes = () => {
    if (!selectedFacility) {
      alert('시설을 선택해주세요!');
      return;
    }
    
    if (nodes.length === 0) {
      alert('노드를 추가해주세요!');
      return;
    }

    // 경로를 올바른 순서로 정렬하기
    const sortedEdges = [];
    if (edges.length > 0) {
      const adj = new Map(); // 각 노드에 연결된 다른 노드들을 저장
      nodes.forEach(node => adj.set(node.id, []));
      edges.forEach(([u, v]) => {
        adj.get(u).push(v);
        adj.get(v).push(u);
      });

      // 경로의 시작점 찾기 (연결이 하나뿐인 노드)
      let startNode = nodes[0].id; // 기본 시작점
      for (const [nodeId, neighbors] of adj.entries()) {
        if (neighbors.length === 1) {
          startNode = nodeId;
          break;
        }
      }

      // 시작점부터 경로 탐색하여 순서대로 정렬된 엣지 생성
      const path = [];
      const visited = new Set();
      let currentNode = startNode;

      while (path.length < nodes.length) {
        path.push(currentNode);
        visited.add(currentNode);
        
        const neighbors = adj.get(currentNode);
        const nextNode = neighbors.find(neighbor => !visited.has(neighbor));

        if (nextNode) {
          sortedEdges.push([currentNode, nextNode]);
          currentNode = nextNode;
        } else {
          break; // 경로의 끝
        }
      }
    }
    
    // 저장 및 코드 생성 시 정렬된 'sortedEdges'를 사용
    const success = saveRoute(selectedFacility, nodes, sortedEdges.length > 0 ? sortedEdges : edges);
    
    if (success) {
      // MapNavigator 컴포넌트용 코드 생성
      console.clear();
      console.log(`=== ${selectedFacility} 경로 코드 생성 완료 ===`);
      console.log('\n// MapNavigator.jsx에 다음 코드를 추가하세요:');
      console.log(`\n// ${selectedFacility} 경로 데이터`);
      console.log(`const ${selectedFacility.replace(/[\s-]/g, '')}Nodes = [`);
      nodes.forEach(node => {
        console.log(`  { id: '${node.id}', x: ${node.x}, y: ${node.y}, name: '${node.name}' },`);
      });
      console.log('];');
      console.log(`\nconst ${selectedFacility.replace(/[\s-]/g, '')}Edges = [`);
      // 정렬된 엣지로 콘솔 출력
      (sortedEdges.length > 0 ? sortedEdges : edges).forEach(edge => {
        console.log(`  ['${edge[0]}', '${edge[1]}'],`);
      });
      console.log('];');
      
      // 파일로도 저장
      const exportData = {
        facility: selectedFacility,
        mapId: mapId,
        nodes: nodes,
        edges: sortedEdges.length > 0 ? sortedEdges : edges, // 정렬된 엣지로 저장
        generatedCode: `const ${selectedFacility.replace(/[\s-]/g, '')}Nodes = ${JSON.stringify(nodes, null, 2)};\nconst ${selectedFacility.replace(/[\s-]/g, '')}Edges = ${JSON.stringify(sortedEdges.length > 0 ? sortedEdges : edges, null, 2)};`
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${selectedFacility}_route.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      alert(`✅ ${selectedFacility} 경로가 저장되었습니다!\n\n1. 파일 다운로드: ${exportFileDefaultName}\n2. 브라우저 저장소에 저장됨\n3. 콘솔에서 코드 확인 가능\n\n이제 PublicHome에서 이 경로를 사용할 수 있습니다.`);
    } else {
      alert('저장 실패: 시설 정보를 찾을 수 없습니다.');
    }
  };

  const clearAll = () => {
    if (confirm('모든 노드와 연결을 삭제하시겠습니까?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setNodeIdCounter(1);
    }
  };

  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;
    
    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;
    
    const existingGroup = svg.querySelector('#editor-nodes');
    if (existingGroup) {
      existingGroup.remove();
    }
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'editor-nodes');
    
    edges.forEach(([fromId, toId]) => {
      const fromNode = nodes.find(n => n.id === fromId);
      const toNode = nodes.find(n => n.id === toId);
      
      if (fromNode && toNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('stroke', '#3b82f6');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.7');
        g.appendChild(line);
      }
    });
    
    nodes.forEach(node => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', selectedNode?.id === node.id ? '#ef4444' : '#3b82f6');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '3');
      circle.setAttribute('cursor', 'pointer');
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#1e40af');
      text.textContent = node.id.replace('node-', '');
      
      g.appendChild(circle);
      g.appendChild(text);
    });
    
    svg.appendChild(g);
  }, [nodes, edges, selectedNode, svgLoaded]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">맵 경로 편집기</h2>
            <select 
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-4 py-2 border-2 rounded-lg text-sm font-medium bg-white"
            >
              <option value="">시설을 선택하세요</option>
              {Object.keys(facilityRoutes).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">현재 맵: {mapId}</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => alignNodes()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              disabled={nodes.length < 2}
            >
              <WrenchScrewdriverIcon className="w-5 h-5" />
              자동 정렬 (90도)
            </button>
            
            <button
              onClick={exportNodes}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              경로 저장 및 코드 생성
            </button>
            
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              모두 지우기
            </button>
            
            {selectedFacility && (
              <button
                onClick={() => {
                  // 선택된 시설의 경로 데이터만 삭제
                  const routes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
                  if (routes[selectedFacility]) {
                    routes[selectedFacility].nodes = [];
                    routes[selectedFacility].edges = [];
                    localStorage.setItem('facilityRoutes', JSON.stringify(routes));
                    
                    // 현재 화면도 초기화
                    setNodes([]);
                    setEdges([]);
                    setNodeIdCounter(1);
                    
                    alert(`${selectedFacility}의 저장된 경로가 삭제되었습니다!`);
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                {selectedFacility} 저장 데이터 삭제
              </button>
            )}
          </div>
        </div>
      </div>
      
      {selectedNode && (
        <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-64 z-20">
          <h3 className="font-bold mb-3">선택된 노드</h3>
          <div className="space-y-2 text-sm">
            <div>ID: {selectedNode.id}</div>
            <div>X: {selectedNode.x}</div>
            <div>Y: {selectedNode.y}</div>
            
            <input
              type="text"
              value={selectedNode.name}
              onChange={(e) => {
                setNodes(nodes.map(n => 
                  n.id === selectedNode.id 
                    ? { ...n, name: e.target.value }
                    : n
                ));
              }}
              className="w-full px-2 py-1 border rounded"
              placeholder="노드 이름"
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => startConnecting(selectedNode)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                연결하기
              </button>
              
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center justify-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isConnecting && (
        <div className="absolute left-4 top-20 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 z-20">
          <p className="text-sm font-medium">
            연결할 노드를 클릭하세요
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {connectingFrom.id} → ?
          </p>
          <button
            onClick={() => {
              setIsConnecting(false);
              setConnectingFrom(null);
            }}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            취소
          </button>
        </div>
      )}
      
      <div className="absolute left-4 bottom-4 bg-white rounded-lg shadow p-3 z-20">
        <div className="text-sm space-y-1">
          <div>노드: {nodes.length}개</div>
          <div>연결: {edges.length}개</div>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={svgContainerRef} 
          className="w-full h-full flex items-center justify-center bg-gray-50"
        />
      </div>
    </div>
  );
};

export default MapNodeEditor;