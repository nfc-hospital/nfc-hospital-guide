import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrashIcon, ArrowPathIcon, WrenchScrewdriverIcon, MapIcon } from '@heroicons/react/24/outline';
import { facilityRoutes, availableMaps } from '../data/facilityRoutes';
import { saveRoute, getFacilityRoute } from '../api/facilityRoutes';

const MapNodeEditor = ({ mapId: propMapId = 'main_1f', facilityName = '' }) => {
  const svgContainerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(facilityName || '');
  const [mapId, setMapId] = useState(propMapId);
  const [manualMapSelection, setManualMapSelection] = useState(false);

  // 🆕 출발/도착 시설 선택
  const [startFacility, setStartFacility] = useState('');
  const [endFacility, setEndFacility] = useState('');

  // 🆕 시설 위치 설정 모드
  const [facilityPositionMode, setFacilityPositionMode] = useState(false);
  const [selectedFacilityForPosition, setSelectedFacilityForPosition] = useState('');
  const [clickedFacilityX, setClickedFacilityX] = useState(null);
  const [clickedFacilityY, setClickedFacilityY] = useState(null);

  // 🔄 맵별로 독립적인 데이터 관리 (multi-floor 지원)
  const [mapData, setMapData] = useState({
    // 각 mapId별로 별도의 노드/엣지 저장
    // 'main_1f': {
    //   nodes: [],
    //   edges: [],
    //   startNode: null,
    //   endNode: null,
    //   nodeTypes: {},
    //   nodeTransitions: {},
    //   nodeMetadata: {}  // 🆕 추가 메타데이터 (시설 매핑 등)
    // }
  });

  // 현재 선택된 맵의 데이터만 추출 (computed values)
  const currentMapData = mapData[mapId] || {
    nodes: [],
    edges: [],
    startNode: null,
    endNode: null,
    nodeTypes: {},
    nodeTransitions: {},
    nodeMetadata: {}  // 🆕
  };

  const nodes = currentMapData.nodes;
  const edges = currentMapData.edges;
  const startNode = currentMapData.startNode;
  const endNode = currentMapData.endNode;
  const nodeTypes = currentMapData.nodeTypes;
  const nodeTransitions = currentMapData.nodeTransitions;
  const nodeMetadata = currentMapData.nodeMetadata;

  // 🔧 현재 맵의 데이터를 업데이트하는 헬퍼 함수들
  const updateCurrentMap = (updates) => {
    setMapData(prev => ({
      ...prev,
      [mapId]: {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {},
        ...prev[mapId],  // 기존 데이터 덮어쓰기
        ...updates       // 새 데이터 덮어쓰기
      }
    }));
  };

  // 🔧 수정: React 상태의 이전 값을 올바르게 참조하도록 변경
  const setNodes = (nodesOrUpdater) => {
    setMapData(prev => {
      const prevMapData = prev[mapId] || {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {}
      };

      const newNodes = typeof nodesOrUpdater === 'function'
        ? nodesOrUpdater(prevMapData.nodes)
        : nodesOrUpdater;

      console.log('🔧 setNodes 호출:', {
        이전노드수: prevMapData.nodes.length,
        새노드수: newNodes.length,
        mapId
      });

      return {
        ...prev,
        [mapId]: {
          ...prevMapData,
          nodes: newNodes
        }
      };
    });
  };

  const setEdges = (edgesOrUpdater) => {
    setMapData(prev => {
      const prevMapData = prev[mapId] || {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {}
      };

      const newEdges = typeof edgesOrUpdater === 'function'
        ? edgesOrUpdater(prevMapData.edges)
        : edgesOrUpdater;

      return {
        ...prev,
        [mapId]: {
          ...prevMapData,
          edges: newEdges
        }
      };
    });
  };

  const setStartNode = (value) => updateCurrentMap({ startNode: value });
  const setEndNode = (value) => updateCurrentMap({ endNode: value });

  const setNodeTypes = (typesOrUpdater) => {
    setMapData(prev => {
      const prevMapData = prev[mapId] || {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {}
      };

      const newTypes = typeof typesOrUpdater === 'function'
        ? typesOrUpdater(prevMapData.nodeTypes)
        : typesOrUpdater;

      return {
        ...prev,
        [mapId]: {
          ...prevMapData,
          nodeTypes: newTypes
        }
      };
    });
  };

  const setNodeTransitions = (transitionsOrUpdater) => {
    setMapData(prev => {
      const prevMapData = prev[mapId] || {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {}
      };

      const newTransitions = typeof transitionsOrUpdater === 'function'
        ? transitionsOrUpdater(prevMapData.nodeTransitions)
        : transitionsOrUpdater;

      return {
        ...prev,
        [mapId]: {
          ...prevMapData,
          nodeTransitions: newTransitions
        }
      };
    });
  };

  const setNodeMetadata = (metadataOrUpdater) => {
    setMapData(prev => {
      const prevMapData = prev[mapId] || {
        nodes: [],
        edges: [],
        startNode: null,
        endNode: null,
        nodeTypes: {},
        nodeTransitions: {},
        nodeMetadata: {}
      };

      const newMetadata = typeof metadataOrUpdater === 'function'
        ? metadataOrUpdater(prevMapData.nodeMetadata)
        : metadataOrUpdater;

      return {
        ...prev,
        [mapId]: {
          ...prevMapData,
          nodeMetadata: newMetadata
        }
      };
    });
  };

  // ✅ state와 동기화될 ref를 생성
  const stateRef = useRef({
    nodes,
    edges,
    isConnecting,
    connectingFrom,
    nodeIdCounter: 1,
    startNode,
    endNode,
    nodeTypes,
    nodeTransitions,
  });

  // ✅ state가 변경될 때마다 ref 업데이트
  useEffect(() => {
    stateRef.current = {
      nodes,
      edges,
      isConnecting,
      connectingFrom,
      nodeIdCounter: nodes.length > 0 ? Math.max(...nodes.map(n => parseInt(n.id.replace('node-', '') || 0)), 0) + 1 : 1,
      startNode,
      endNode,
      nodeTypes,
      nodeTransitions,
    };
  }, [nodes, edges, isConnecting, connectingFrom, startNode, endNode, nodeTypes, nodeTransitions]);

  // facilityName prop 변경 시 selectedFacility 업데이트
  useEffect(() => {
    if (facilityName && facilityName !== selectedFacility) {
      console.log('facilityName prop 변경 감지:', facilityName);
      setSelectedFacility(facilityName);
    }
  }, [facilityName]);

  // propMapId 변경 시 mapId 업데이트
  useEffect(() => {
    if (propMapId && propMapId !== mapId) {
      console.log('mapId prop 변경 감지:', propMapId);
      setMapId(propMapId);
    }
  }, [propMapId]);

  // 🔧 이전 시설을 추적하여 변경 시에만 초기화
  const prevSelectedFacilityRef = useRef(selectedFacility);

  // 시설 선택시 지도 변경 및 데이터 로드
  useEffect(() => {
    console.log('시설 변경:', selectedFacility, '이전:', prevSelectedFacilityRef.current);

    // 🔧 시설이 실제로 변경되었을 때만 초기화
    const facilityChanged = prevSelectedFacilityRef.current !== selectedFacility;
    if (facilityChanged && prevSelectedFacilityRef.current !== '') {
      console.log('시설 변경 감지 - 데이터 초기화');
      setMapData({});
      setSelectedNode(null);
      setIsConnecting(false);
      setConnectingFrom(null);
    }

    prevSelectedFacilityRef.current = selectedFacility;

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

        // 🔄 Multi-floor 데이터 구조로 변환
        if (savedRoute && savedRoute.maps) {
          // 새 형식: 각 맵별로 저장된 데이터
          console.log('✅ Multi-floor 경로 데이터 로드:', Object.keys(savedRoute.maps));
          setMapData(savedRoute.maps);
        } else if (savedRoute && savedRoute.nodes && savedRoute.nodes.length > 0) {
          // 🔄 구 형식 호환: 단일 맵 데이터를 현재 맵에 할당
          console.log('⚠️ 구 형식 데이터 감지 - 현재 맵으로 변환');

          const uniqueNodes = [];
          const seenIds = new Set();
          savedRoute.nodes.forEach(node => {
            if (!seenIds.has(node.id)) {
              seenIds.add(node.id);
              uniqueNodes.push(node);
            }
          });

          const currentMapId = savedRoute.map_id || facility.mapId || 'main_1f';
          setMapData({
            [currentMapId]: {
              nodes: uniqueNodes,
              edges: savedRoute.edges || [],
              startNode: savedRoute.startNode || null,
              endNode: savedRoute.endNode || null,
              nodeTypes: savedRoute.nodeTypes || {},
              nodeTransitions: savedRoute.nodeTransitions || {}
            }
          });
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

  // ✅ SVG 클릭 핸들러 (노드 추가 및 선택)
  const handleSvgClick = useCallback((e) => {
    console.log('🖱️ SVG 클릭 이벤트 발생!', e.target.tagName);

    const svg = svgContainerRef.current?.querySelector('svg');
    if (!svg) {
      console.error('SVG 요소를 찾을 수 없습니다');
      return;
    }

    try {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      console.log('📍 클릭 좌표:', { x: Math.round(svgP.x), y: Math.round(svgP.y) }, '현재 맵:', mapId);

      // 🆕 시설 위치 설정 모드일 경우
      if (facilityPositionMode) {
        setClickedFacilityX(Math.round(svgP.x));
        setClickedFacilityY(Math.round(svgP.y));
        console.log('📍 시설 위치 설정:', { x: Math.round(svgP.x), y: Math.round(svgP.y) });
        return; // 노드 추가 로직 스킵
      }

      // ref에서 항상 최신 상태를 가져옴
      const { nodes, isConnecting, connectingFrom, nodeIdCounter } = stateRef.current;

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
        console.log('🔵 기존 노드 클릭:', clickedNode.id);
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
        console.log('➕ 새 노드 추가:', { x: Math.round(svgP.x), y: Math.round(svgP.y) });
        const newNode = {
          id: `node-${nodeIdCounter}`,
          x: Math.round(svgP.x),
          y: Math.round(svgP.y),
          name: `노드 ${nodeIdCounter}`
        };
        setNodes(prev => [...prev, newNode]);
      } else {
        console.log('🔗 연결 모드 중 - 다른 노드를 클릭하세요');
      }
    } catch (error) {
      console.error('❌ 클릭 처리 중 오류:', error);
    }
  }, [mapId, facilityPositionMode]);

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

    // 🆕 출발지/도착지가 삭제된 노드였다면 초기화
    if (startNode === nodeId) setStartNode(null);
    if (endNode === nodeId) setEndNode(null);

    // 🆕 노드 타입 정보도 삭제
    setNodeTypes(prev => {
      const updated = { ...prev };
      delete updated[nodeId];
      return updated;
    });
    setNodeTransitions(prev => {
      const updated = { ...prev };
      delete updated[nodeId];
      return updated;
    });
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

  // 🆕 시설 위치 저장 함수
  const saveFacilityPosition = () => {
    if (!selectedFacilityForPosition) {
      alert('시설을 선택해주세요!');
      return;
    }

    if (clickedFacilityX === null || clickedFacilityY === null) {
      alert('지도에서 위치를 클릭해주세요!');
      return;
    }

    // localStorage에서 기존 데이터 로드
    const routes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');

    // 시설 좌표 업데이트
    if (!routes[selectedFacilityForPosition]) {
      routes[selectedFacilityForPosition] = {
        nodes: [],
        edges: [],
        mapId: mapId,
        svgElementId: facilityRoutes[selectedFacilityForPosition]?.svgElementId || ''
      };
    }

    routes[selectedFacilityForPosition] = {
      ...routes[selectedFacilityForPosition],
      x_coord: clickedFacilityX,
      y_coord: clickedFacilityY,
      mapId: mapId,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('facilityRoutes', JSON.stringify(routes));

    // facilityRoutes 객체도 업데이트 (메모리 내 데이터)
    if (facilityRoutes[selectedFacilityForPosition]) {
      facilityRoutes[selectedFacilityForPosition].x_coord = clickedFacilityX;
      facilityRoutes[selectedFacilityForPosition].y_coord = clickedFacilityY;
      facilityRoutes[selectedFacilityForPosition].mapId = mapId;
    }

    alert(`✅ ${facilityRoutes[selectedFacilityForPosition]?.description || selectedFacilityForPosition} 위치 저장 완료!\n\n좌표: (${clickedFacilityX}, ${clickedFacilityY})\n지도: ${availableMaps.find(m => m.id === mapId)?.name}`);

    // 모드 종료
    setFacilityPositionMode(false);
    setClickedFacilityX(null);
    setClickedFacilityY(null);
  };

  const exportNodes = async () => {
    // 최소 하나의 맵에라도 노드가 있는지 확인
    const hasNodes = Object.values(mapData).some(data => data.nodes && data.nodes.length > 0);
    if (!hasNodes) {
      alert('최소 하나의 맵에 노드를 추가해주세요!');
      return;
    }

    // 🆕 출발/도착 시설이 없으면 기본값 사용
    const effectiveStartFacility = startFacility || '출발지_미정';
    const effectiveEndFacility = endFacility || '도착지_미정';

    // 🔄 모든 맵의 데이터를 정리하고 저장
    const processedMapData = {};

    for (const [mapKey, data] of Object.entries(mapData)) {
      if (!data.nodes || data.nodes.length === 0) continue; // 빈 맵은 제외

      // 경로를 올바른 순서로 정렬하기
      const sortedEdges = [];
      if (data.edges && data.edges.length > 0) {
        const adj = new Map();
        data.nodes.forEach(node => adj.set(node.id, []));
        data.edges.forEach(([u, v]) => {
          adj.get(u).push(v);
          adj.get(v).push(u);
        });

        let startNodeId = data.nodes[0].id;
        for (const [nodeId, neighbors] of adj.entries()) {
          if (neighbors.length === 1) {
            startNodeId = nodeId;
            break;
          }
        }

        const path = [];
        const visited = new Set();
        let currentNode = startNodeId;

        while (path.length < data.nodes.length) {
          path.push(currentNode);
          visited.add(currentNode);

          const neighbors = adj.get(currentNode);
          const nextNode = neighbors?.find(neighbor => !visited.has(neighbor));

          if (nextNode) {
            sortedEdges.push([currentNode, nextNode]);
            currentNode = nextNode;
          } else {
            break;
          }
        }
      }

      processedMapData[mapKey] = {
        nodes: data.nodes,
        edges: sortedEdges.length > 0 ? sortedEdges : (data.edges || []),
        startNode: data.startNode || null,
        endNode: data.endNode || null,
        nodeTypes: data.nodeTypes || {},
        nodeTransitions: data.nodeTransitions || {}
      };
    }

    // 🆕 경로명 생성 (출발-도착 쌍)
    const routeName = `route_${effectiveStartFacility}_to_${effectiveEndFacility}`;
    const routeDisplayName = `${facilityRoutes[effectiveStartFacility]?.description || effectiveStartFacility} → ${facilityRoutes[effectiveEndFacility]?.description || effectiveEndFacility}`;

    // 🔄 Multi-floor 형식으로 저장
    const routeData = {
      routeName: routeName,
      startFacility: effectiveStartFacility,
      endFacility: effectiveEndFacility,
      maps: processedMapData,  // 각 맵별 데이터
      currentMap: mapId,       // 현재 편집 중인 맵
      createdAt: new Date().toISOString()
    };

    const success = await saveRoute(routeName, null, null, mapId, routeData);

    if (success) {
      // MapNavigator 컴포넌트용 코드 생성
      console.clear();
      console.log(`=== ${routeDisplayName} 경로 코드 생성 완료 ===`);
      console.log('\n// Multi-floor 경로 데이터:');
      console.log(`const ${routeName} = {`);
      console.log(`  startFacility: "${effectiveStartFacility}",`);
      console.log(`  endFacility: "${effectiveEndFacility}",`);
      console.log(`  maps: ${JSON.stringify(processedMapData, null, 2)}`);
      console.log('};');

      // 파일로도 저장
      const dataStr = JSON.stringify(routeData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${routeName}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      alert(`✅ ${routeDisplayName} 경로가 저장되었습니다!\n\n1. 파일 다운로드: ${exportFileDefaultName}\n2. localStorage 키: ${routeName}\n3. 콘솔에서 코드 확인 가능\n\n저장된 맵 개수: ${Object.keys(processedMapData).length}개`);
    } else {
      alert('저장 실패: 경로 정보를 확인해주세요.');
    }
  };

  const clearAll = () => {
    if (confirm('모든 노드와 연결을 삭제하시겠습니까?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setStartNode(null);
      setEndNode(null);
      setNodeTypes({});
      setNodeTransitions({});
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

    // 🆕 출발 시설 마커 표시
    if (startFacility && facilityRoutes[startFacility]) {
      const facility = facilityRoutes[startFacility];
      if (facility.mapId === mapId && facility.x_coord && facility.y_coord) {
        const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startMarker.setAttribute('cx', facility.x_coord);
        startMarker.setAttribute('cy', facility.y_coord);
        startMarker.setAttribute('r', '18');
        startMarker.setAttribute('fill', '#22c55e');
        startMarker.setAttribute('stroke', '#ffffff');
        startMarker.setAttribute('stroke-width', '4');
        startMarker.setAttribute('opacity', '0.8');

        const startLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        startLabel.setAttribute('x', facility.x_coord);
        startLabel.setAttribute('y', facility.y_coord - 28);
        startLabel.setAttribute('text-anchor', 'middle');
        startLabel.setAttribute('font-size', '13');
        startLabel.setAttribute('font-weight', 'bold');
        startLabel.setAttribute('fill', '#166534');
        startLabel.textContent = '🟢 출발: ' + (facility.description || startFacility);

        g.appendChild(startMarker);
        g.appendChild(startLabel);
      }
    }

    // 🆕 도착 시설 마커 표시
    if (endFacility && facilityRoutes[endFacility]) {
      const facility = facilityRoutes[endFacility];
      if (facility.mapId === mapId && facility.x_coord && facility.y_coord) {
        const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endMarker.setAttribute('cx', facility.x_coord);
        endMarker.setAttribute('cy', facility.y_coord);
        endMarker.setAttribute('r', '18');
        endMarker.setAttribute('fill', '#ef4444');
        endMarker.setAttribute('stroke', '#ffffff');
        endMarker.setAttribute('stroke-width', '4');
        endMarker.setAttribute('opacity', '0.8');

        const endLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        endLabel.setAttribute('x', facility.x_coord);
        endLabel.setAttribute('y', facility.y_coord - 28);
        endLabel.setAttribute('text-anchor', 'middle');
        endLabel.setAttribute('font-size', '13');
        endLabel.setAttribute('font-weight', 'bold');
        endLabel.setAttribute('fill', '#991b1b');
        endLabel.textContent = '🔴 도착: ' + (facility.description || endFacility);

        g.appendChild(endMarker);
        g.appendChild(endLabel);
      }
    }

    // 🆕 시설 위치 설정 모드 마커 표시
    if (facilityPositionMode && selectedFacilityForPosition) {
      const facility = facilityRoutes[selectedFacilityForPosition];

      // 현재 시설 위치 마커 (파란색) - 기존 좌표가 있는 경우
      if (facility?.x_coord && facility?.y_coord && facility.mapId === mapId) {
        const currentCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        currentCircle.setAttribute('cx', facility.x_coord);
        currentCircle.setAttribute('cy', facility.y_coord);
        currentCircle.setAttribute('r', '12');
        currentCircle.setAttribute('fill', '#3b82f6');
        currentCircle.setAttribute('stroke', '#ffffff');
        currentCircle.setAttribute('stroke-width', '3');
        currentCircle.setAttribute('opacity', '0.7');

        const currentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        currentText.setAttribute('x', facility.x_coord);
        currentText.setAttribute('y', facility.y_coord - 20);
        currentText.setAttribute('text-anchor', 'middle');
        currentText.setAttribute('font-size', '12');
        currentText.setAttribute('font-weight', 'bold');
        currentText.setAttribute('fill', '#1e40af');
        currentText.textContent = '현재 위치';

        g.appendChild(currentCircle);
        g.appendChild(currentText);
      }

      // 클릭한 새 위치 마커 (빨간색)
      if (clickedFacilityX !== null && clickedFacilityY !== null) {
        const clickedCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clickedCircle.setAttribute('cx', clickedFacilityX);
        clickedCircle.setAttribute('cy', clickedFacilityY);
        clickedCircle.setAttribute('r', '15');
        clickedCircle.setAttribute('fill', '#ef4444');
        clickedCircle.setAttribute('stroke', '#ffffff');
        clickedCircle.setAttribute('stroke-width', '4');

        const clickedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        clickedText.setAttribute('x', clickedFacilityX);
        clickedText.setAttribute('y', clickedFacilityY - 25);
        clickedText.setAttribute('text-anchor', 'middle');
        clickedText.setAttribute('font-size', '14');
        clickedText.setAttribute('font-weight', 'bold');
        clickedText.setAttribute('fill', '#dc2626');
        clickedText.textContent = '새 위치';

        g.appendChild(clickedCircle);
        g.appendChild(clickedText);
      }
    }

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

      // 🆕 노드 색상 결정 (출발지/도착지/선택된 노드/일반 노드/맵전환 노드)
      let fillColor = '#3b82f6'; // 기본 파란색 (일반 노드)
      let strokeColor = '#ffffff';
      let radius = 10;
      let label = node.id.replace('node-', '');

      if (node.id === startNode) {
        fillColor = '#22c55e'; // 녹색 (출발지)
        label = '🟢 ' + label;
        radius = 12;
      } else if (node.id === endNode) {
        fillColor = '#ef4444'; // 빨간색 (도착지)
        label = '🔴 ' + label;
        radius = 12;
      } else if (nodeTypes[node.id] === 'map_transition') {
        fillColor = '#a855f7'; // 보라색 (맵 전환 노드)
        label = '🟣 ' + label;
      } else if (selectedNode?.id === node.id) {
        fillColor = '#f59e0b'; // 주황색 (선택된 노드)
        strokeColor = '#fbbf24';
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', strokeColor);
      circle.setAttribute('stroke-width', '3');
      // 🔧 pointer-events를 'none'으로 설정하여 클릭 이벤트가 SVG로 전달되도록 함
      circle.style.pointerEvents = 'none';
      circle.style.cursor = 'pointer';

      // 노드 우클릭으로 삭제만 직접 등록
      circle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`노드 ${node.id}를 삭제하시겠습니까?`)) {
          deleteNode(node.id);
        }
      });

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - (radius + 8));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#1e40af');
      text.setAttribute('pointer-events', 'none'); // 텍스트는 클릭 이벤트 무시
      text.textContent = label;

      nodeGroup.appendChild(circle);
      nodeGroup.appendChild(text);
      g.appendChild(nodeGroup);
    });
    
    svg.appendChild(g);
  }, [nodes, edges, selectedNode, svgLoaded, startNode, endNode, nodeTypes, startFacility, endFacility, mapId, facilityPositionMode, selectedFacilityForPosition, clickedFacilityX, clickedFacilityY]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* 🆕 출발지/도착지 표시 바 */}
      {(startNode || endNode) && (
        <div className="bg-gradient-to-r from-green-50 to-red-50 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-center gap-6 text-sm font-medium">
            {startNode && (
              <div className="flex items-center gap-2">
                <span className="text-green-700">🟢 출발지:</span>
                <span className="text-green-900 font-bold">{startNode}</span>
                {nodes.find(n => n.id === startNode) && (
                  <span className="text-green-600">({nodes.find(n => n.id === startNode)?.name})</span>
                )}
                <button
                  onClick={() => setStartNode(null)}
                  className="ml-2 text-xs text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            )}
            {endNode && (
              <div className="flex items-center gap-2">
                <span className="text-red-700">🔴 도착지:</span>
                <span className="text-red-900 font-bold">{endNode}</span>
                {nodes.find(n => n.id === endNode) && (
                  <span className="text-red-600">({nodes.find(n => n.id === endNode)?.name})</span>
                )}
                <button
                  onClick={() => setEndNode(null)}
                  className="ml-2 text-xs text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border-b p-4 shadow-sm">
        {/* 🆕 출발/도착 시설 선택 바 */}
        <div className="max-w-7xl mx-auto mb-3 pb-3 border-b">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">경로 설정:</span>

            {/* 출발 시설 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">🟢 출발</span>
              <select
                value={startFacility}
                onChange={(e) => {
                  setStartFacility(e.target.value);
                  // 출발 시설의 맵으로 자동 전환
                  if (e.target.value && facilityRoutes[e.target.value]) {
                    setMapId(facilityRoutes[e.target.value].mapId);
                  }
                }}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              >
                <option value="">선택...</option>
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
              </select>
            </div>

            <span className="text-gray-400">→</span>

            {/* 도착 시설 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">🔴 도착</span>
              <select
                value={endFacility}
                onChange={(e) => setEndFacility(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              >
                <option value="">선택...</option>
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
              </select>
            </div>

            {/* 경로명 자동 생성 */}
            {startFacility && endFacility && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-600">경로명:</span>
                <span className="text-sm font-bold text-purple-700">
                  {(facilityRoutes[startFacility]?.description || startFacility)} → {(facilityRoutes[endFacility]?.description || endFacility)}
                </span>
              </div>
            )}
          </div>
        </div>

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

        {/* 🆕 세 번째 칸: 시설 위치 설정 */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">📍 시설 위치 설정:</span>

              {/* 시설 선택 */}
              <select
                value={selectedFacilityForPosition}
                onChange={(e) => {
                  setSelectedFacilityForPosition(e.target.value);
                  // 시설의 기존 맵으로 전환
                  if (e.target.value && facilityRoutes[e.target.value]) {
                    setMapId(facilityRoutes[e.target.value].mapId);
                  }
                  // 기존 클릭 좌표 초기화
                  setClickedFacilityX(null);
                  setClickedFacilityY(null);
                }}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                disabled={facilityPositionMode && !selectedFacilityForPosition}
              >
                <option value="">시설 선택...</option>
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
              </select>

              {/* 모드 토글 버튼 */}
              <button
                onClick={() => {
                  if (!selectedFacilityForPosition) {
                    alert('먼저 시설을 선택해주세요!');
                    return;
                  }
                  setFacilityPositionMode(!facilityPositionMode);
                  if (!facilityPositionMode) {
                    // 모드 진입 시 초기화
                    setClickedFacilityX(null);
                    setClickedFacilityY(null);
                  }
                }}
                disabled={!selectedFacilityForPosition}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  facilityPositionMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } ${!selectedFacilityForPosition ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {facilityPositionMode ? '🔴 위치 설정 모드 ON' : '📍 위치 설정 모드 시작'}
              </button>

              {/* 좌표 정보 표시 */}
              {facilityPositionMode && clickedFacilityX !== null && clickedFacilityY !== null && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-medium text-purple-900">
                    좌표: ({clickedFacilityX}, {clickedFacilityY}) - {availableMaps.find(m => m.id === mapId)?.name}
                  </span>
                </div>
              )}
            </div>

            {/* 저장/취소 버튼 */}
            {facilityPositionMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFacilityPositionMode(false);
                    setClickedFacilityX(null);
                    setClickedFacilityY(null);
                  }}
                  className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                >
                  ✕ 취소
                </button>
                <button
                  onClick={saveFacilityPosition}
                  disabled={clickedFacilityX === null || clickedFacilityY === null}
                  className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                    clickedFacilityX === null || clickedFacilityY === null
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  💾 위치 저장
                </button>
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          {facilityPositionMode && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-sm text-blue-800">
                📍 지도를 클릭하여 <strong>{facilityRoutes[selectedFacilityForPosition]?.description || selectedFacilityForPosition}</strong>의 위치를 설정하세요
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedNode && (
        <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-72 z-20">
          <h3 className="font-bold mb-3">선택된 노드</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <div>ID: <span className="font-mono font-bold">{selectedNode.id}</span></div>
              <div>X: <span className="font-mono">{selectedNode.x}</span></div>
              <div>Y: <span className="font-mono">{selectedNode.y}</span></div>
            </div>

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

            {/* 🆕 출발지/도착지 설정 버튼 */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-600 mb-2">경로 지정</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  disabled={startNode === selectedNode.id}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                    startNode === selectedNode.id
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {startNode === selectedNode.id ? '✓ 출발지' : '🟢 출발지로'}
                </button>

                <button
                  onClick={() => {
                    setEndNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  disabled={endNode === selectedNode.id}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                    endNode === selectedNode.id
                      ? 'bg-red-100 text-red-700 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {endNode === selectedNode.id ? '✓ 도착지' : '🔴 도착지로'}
                </button>
              </div>
            </div>

            {/* 🆕 노드 타입 선택 */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-600 mb-2">노드 타입</div>
              <select
                value={nodeTypes[selectedNode.id] || 'place'}
                onChange={(e) => {
                  setNodeTypes(prev => ({
                    ...prev,
                    [selectedNode.id]: e.target.value
                  }));
                }}
                className="w-full px-2 py-1.5 border rounded text-sm"
              >
                <option value="place">🔵 일반 장소</option>
                <option value="map_transition">🟣 맵 전환 (층 이동)</option>
              </select>

              {/* 맵 전환 노드일 경우 연결 설정 */}
              {nodeTypes[selectedNode.id] === 'map_transition' && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded space-y-2">
                  <div className="text-xs font-semibold text-purple-900">다음 맵 연결</div>
                  <select
                    value={nodeTransitions[selectedNode.id]?.targetMap || ''}
                    onChange={(e) => {
                      setNodeTransitions(prev => ({
                        ...prev,
                        [selectedNode.id]: {
                          ...prev[selectedNode.id],
                          targetMap: e.target.value
                        }
                      }));
                    }}
                    className="w-full px-2 py-1 border rounded text-xs"
                  >
                    <option value="">맵 선택...</option>
                    {availableMaps.filter(m => m.id !== mapId).map(map => (
                      <option key={map.id} value={map.id}>{map.name}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={nodeTransitions[selectedNode.id]?.targetNode || ''}
                    onChange={(e) => {
                      setNodeTransitions(prev => ({
                        ...prev,
                        [selectedNode.id]: {
                          ...prev[selectedNode.id],
                          targetNode: e.target.value
                        }
                      }));
                    }}
                    placeholder="다음 노드 ID (예: node-1)"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />

                  {/* 🆕 다음 맵으로 이동 버튼 */}
                  {nodeTransitions[selectedNode.id]?.targetMap && (
                    <button
                      onClick={() => {
                        const targetMapId = nodeTransitions[selectedNode.id].targetMap;
                        setMapId(targetMapId);
                        setSelectedNode(null);
                        alert(`✅ ${availableMaps.find(m => m.id === targetMapId)?.name}으로 전환했습니다!\n\n이제 이 맵에서 경로를 계속 그릴 수 있습니다.`);
                      }}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      🟣 {availableMaps.find(m => m.id === nodeTransitions[selectedNode.id]?.targetMap)?.name}으로 이동
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 border-t pt-3">
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
          style={{ cursor: isConnecting || facilityPositionMode ? 'crosshair' : 'default' }}
          onClick={handleSvgClick}
        />
      </div>
    </div>
  );
};

export default MapNodeEditor;