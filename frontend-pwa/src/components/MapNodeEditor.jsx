import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrashIcon, ArrowPathIcon, WrenchScrewdriverIcon, MapIcon } from '@heroicons/react/24/outline';
import { facilityRoutes, availableMaps } from '../data/facilityRoutes';
import { saveRoute, getFacilityRoute } from '../api/facilityRoutes';

const MapNodeEditor = ({ mapId: propMapId = 'main_1f', facilityName = '' }) => {
  const svgContainerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(facilityName);  // facilityName으로 초기화
  const [mapId, setMapId] = useState(propMapId);
  const [manualMapSelection, setManualMapSelection] = useState(false); // 수동 지도 선택 모드

  // ✅ state와 동기화될 ref를 생성
  const stateRef = useRef({
    nodes,
    edges,
    isConnecting,
    connectingFrom,
    nodeIdCounter: 1,
  });

  // ✅ state가 변경될 때마다 ref 업데이트
  useEffect(() => {
    stateRef.current = {
      nodes,
      edges,
      isConnecting,
      connectingFrom,
      nodeIdCounter: nodes.length > 0 ? Math.max(...nodes.map(n => parseInt(n.id.replace('node-', '') || 0)), 0) + 1 : 1,
    };
  }, [nodes, edges, isConnecting, connectingFrom]);

  // 시설 선택시 지도 변경 및 데이터 초기화
  useEffect(() => {
    console.log('시설 변경:', selectedFacility);
    
    // 먼저 모든 상태 초기화
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setIsConnecting(false);
    setConnectingFrom(null);
    
    if (selectedFacility && facilityRoutes[selectedFacility]) {
      const facility = facilityRoutes[selectedFacility];
      console.log('선택된 시설 정보:', facility);
      
      // 수동 지도 선택이 아닌 경우에만 자동으로 지도 변경
      if (!manualMapSelection) {
        console.log('지도 ID 변경:', facility.mapId);
        setMapId(facility.mapId);
      }
      
      // 저장된 경로가 있으면 불러오기 (비동기)
      const loadSavedRoute = async () => {
        const savedRoute = await getFacilityRoute(selectedFacility);
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
          
          // nodeIdCounter는 stateRef에서 자동 계산됨
        }
      };
      
      loadSavedRoute();
    }
  }, [selectedFacility]);

  // 지도 이미지 경로
  const mapSrc = `/images/maps/${mapId}.svg`;

  useEffect(() => {
    loadSvg();
  }, [mapId]);
  
  // SVG 로드 완료 후 - 이벤트 리스너는 제거하고 onClick만 사용

  const loadSvg = useCallback(async () => {
    if (!svgContainerRef.current) return;
    
    // SVG 로드 전에 로드 상태를 false로 설정
    setSvgLoaded(false);
    
    try {
      const response = await fetch(mapSrc);
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.statusText}`);
      }
      
      const svgText = await response.text();
      
      // XML 파싱 에러 체크
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      
      // 파싱 에러 확인
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) {
        console.error('SVG 파싱 에러:', parserError.textContent);
        // 대체 방법: innerHTML로 직접 삽입
        svgContainerRef.current.innerHTML = svgText;
        const svgElement = svgContainerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svgElement.style.pointerEvents = 'all'; // 클릭 이벤트 활성화
          
          setSvgLoaded(true);
        }
        return;
      }
      
      const svgElement = svgDoc.documentElement;
      
      // SVG가 아닌 경우 처리
      if (svgElement.tagName.toLowerCase() !== 'svg') {
        console.error('로드된 파일이 SVG가 아닙니다:', svgElement.tagName);
        return;
      }
      
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgElement.style.pointerEvents = 'all'; // 클릭 이벤트 활성화
      
      svgContainerRef.current.innerHTML = '';
      svgContainerRef.current.appendChild(svgElement);
      
      setSvgLoaded(true);
    } catch (error) {
      console.error('SVG 로드 오류:', error);
      // 에러 발생 시 기본 이미지 표시
      svgContainerRef.current.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-gray-500">
          <svg class="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
          <p class="text-lg font-medium">지도를 불러올 수 없습니다</p>
          <p class="text-sm mt-2">${mapId}</p>
        </div>
      `;
    }
  }, [mapId]);

  // ✅ 모든 클릭을 처리하는 단일 핸들러
  const handleContainerClick = useCallback((e) => {
    const svg = svgContainerRef.current?.querySelector('svg');
    if (!svg) return;

    // ref에서 항상 최신 상태를 가져옴
    const { nodes, isConnecting, connectingFrom, nodeIdCounter } = stateRef.current;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 클릭된 노드가 있는지 확인
    let clickedNode = null;
    for (const node of nodes) {
      const dist = Math.sqrt(Math.pow(node.x - svgP.x, 2) + Math.pow(node.y - svgP.y, 2));
      if (dist < 15) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      // 노드 클릭 시
      if (isConnecting && connectingFrom) {
        if (connectingFrom.id !== clickedNode.id) {
          const newEdge = [connectingFrom.id, clickedNode.id];
          const edgeExists = stateRef.current.edges.some(edge =>
            (edge[0] === newEdge[0] && edge[1] === newEdge[1]) ||
            (edge[0] === newEdge[1] && edge[1] === newEdge[0])
          );
          if (!edgeExists) {
            setEdges(prev => [...prev, newEdge]);
          }
        }
        setIsConnecting(false);
        setConnectingFrom(null);
      } else {
        setSelectedNode(clickedNode);
      }
    } else if (!isConnecting) {
      // 빈 공간 클릭 시 (노드 추가)
      const newNode = {
        id: `node-${nodeIdCounter}`,
        x: Math.round(svgP.x),
        y: Math.round(svgP.y),
        name: `노드 ${nodeIdCounter}`
      };
      setNodes(prev => [...prev, newNode]);
    }
  }, []);

  const handleSvgClick = (e) => {
    console.log('🖱️ SVG 클릭 이벤트 발생!', e.target);
    
    if (!svgContainerRef.current) {
      console.error('svgContainerRef.current가 없습니다');
      return;
    }
    
    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) {
      console.error('SVG 요소를 찾을 수 없습니다');
      return;
    }
    
    try {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      
      // 스크린 좌표를 SVG 좌표로 변환
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      console.log('📍 클릭 좌표:', { x: Math.round(svgP.x), y: Math.round(svgP.y) }, '현재 맵:', mapId);
      
      // 기존 노드 클릭 확인
      const clickedNode = nodes.find(node => {
        const dist = Math.sqrt(Math.pow(node.x - svgP.x, 2) + Math.pow(node.y - svgP.y, 2));
        return dist < 15;
      });
      
      if (clickedNode) {
        console.log('🔵 기존 노드 클릭:', clickedNode.id);
        handleNodeClick(clickedNode);
      } else if (!isConnecting) {
        // 빈 공간 클릭시 노드 추가
        console.log('➕ 새 노드 추가 시도:', { x: Math.round(svgP.x), y: Math.round(svgP.y) });
        addNode(svgP.x, svgP.y);
      } else {
        console.log('🔗 연결 모드 중 - 다른 노드를 클릭하세요');
      }
    } catch (error) {
      console.error('❌ 클릭 처리 중 오류:', error);
    }
  };

  const addNode = (x, y) => {
    // stateRef에서 현재 nodeIdCounter 가져오기
    const currentId = stateRef.current.nodeIdCounter;
    const newNode = {
      id: `node-${currentId}`,
      x: Math.round(x),
      y: Math.round(y),
      name: `노드 ${currentId}`
    };
    
    console.log('노드 추가:', newNode.id, '현재 카운터:', currentId);
    
    // 중복 체크
    if (stateRef.current.nodes.some(n => n.id === newNode.id)) {
      console.error('중복된 노드 ID 발견:', newNode.id);
      return;
    }
    
    setNodes(prevNodes => [...prevNodes, newNode]);
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

  const exportNodes = async () => {
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
    const success = await saveRoute(selectedFacility, nodes, sortedEdges.length > 0 ? sortedEdges : edges, mapId);
    
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
    // pointer-events를 none으로 설정하여 클릭 이벤트가 SVG로 전달되도록 함
    g.style.pointerEvents = 'none';
    
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
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('class', 'node-group');
      nodeGroup.style.cursor = 'pointer';
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', selectedNode?.id === node.id ? '#ef4444' : '#3b82f6');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '3');
      circle.style.pointerEvents = 'auto'; // 노드는 클릭 가능하도록 설정
      circle.style.cursor = 'pointer';
      
      // 노드 클릭 이벤트 직접 등록
      circle.addEventListener('click', (e) => {
        e.stopPropagation(); // SVG 클릭 이벤트 전파 방지
        handleNodeClick(node);
      });
      
      // 노드 우클릭으로 삭제
      circle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`노드 ${node.id}를 삭제하시겠습니까?`)) {
          deleteNode(node.id);
        }
      });
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#1e40af');
      text.setAttribute('pointer-events', 'none'); // 텍스트는 클릭 이벤트 무시
      text.textContent = node.id.replace('node-', '');
      
      nodeGroup.appendChild(circle);
      nodeGroup.appendChild(text);
      g.appendChild(nodeGroup);
    });
    
    svg.appendChild(g);
  }, [nodes, edges, selectedNode, svgLoaded]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">맵 경로 편집기</h2>
            {!facilityName ? (
              <select 
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setManualMapSelection(false); // 시설 선택시 수동 지도 선택 모드 해제
                }}
                className="px-4 py-2 border-2 rounded-lg text-sm font-medium bg-white"
              >
                <option value="">시설을 선택하세요</option>
                <optgroup label="🏥 진료과">
                  {Object.keys(facilityRoutes)
                    .filter(name => !name.startsWith('시연_') && !name.startsWith('진료과_구역_') && 
                            !name.startsWith('네비게이션_노드_') && !name.startsWith('검사_') && 
                            !name.startsWith('편의_') && name.includes('과'))
                    .map(name => (
                      <option key={name} value={name}>{facilityRoutes[name].description || name}</option>
                    ))}
                </optgroup>
                <optgroup label="🔬 검사실">
                  {Object.keys(facilityRoutes)
                    .filter(name => name.startsWith('검사_'))
                    .map(name => (
                      <option key={name} value={name}>
                        {facilityRoutes[name].description || name.replace('검사_', '')}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🏪 편의시설">
                  {Object.keys(facilityRoutes)
                    .filter(name => name.startsWith('편의_'))
                    .map(name => (
                      <option key={name} value={name}>
                        {facilityRoutes[name].description || name.replace('편의_', '')}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🏢 일반 시설">
                  {Object.keys(facilityRoutes)
                    .filter(name => !name.startsWith('시연_') && !name.startsWith('진료과_구역_') && 
                            !name.startsWith('네비게이션_노드_') && !name.startsWith('검사_') && 
                            !name.startsWith('편의_') && !name.includes('과'))
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </optgroup>
                <optgroup label="📍 진료과/시설 구역">
                  {Object.keys(facilityRoutes)
                    .filter(name => name.startsWith('진료과_구역_'))
                    .map(name => (
                      <option key={name} value={name}>
                        {facilityRoutes[name].description || name.replace('진료과_구역_', '')}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🔗 네비게이션 노드">
                  {Object.keys(facilityRoutes)
                    .filter(name => name.startsWith('네비게이션_노드_'))
                    .map(name => (
                      <option key={name} value={name}>
                        {facilityRoutes[name].description || name.replace('네비게이션_노드_', '')}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🎬 시연용 경로">
                  {Object.keys(facilityRoutes)
                    .filter(name => name.startsWith('시연_'))
                    .map(name => (
                      <option key={name} value={name}>
                        {facilityRoutes[name].description || name.replace('시연_', '')}
                      </option>
                    ))}
                </optgroup>
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">
                  {facilityRoutes[selectedFacility]?.description || selectedFacility}
                </span>
              </div>
            )}
            
            {/* 지도 선택 드롭다운 */}
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-gray-600" />
              <select
                value={mapId}
                onChange={(e) => {
                  setMapId(e.target.value);
                  setManualMapSelection(true); // 수동으로 지도를 선택했음을 표시
                }}
                className="px-3 py-1.5 border rounded-lg text-sm font-medium bg-white hover:bg-gray-50"
              >
                {availableMaps.map(map => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedFacility && selectedFacility.startsWith('시연_') && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                🎬 시연 모드
              </span>
            )}
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
          style={{ cursor: isConnecting ? 'crosshair' : 'default' }}
          onClick={handleContainerClick}
        />
      </div>
    </div>
  );
};

export default MapNodeEditor;