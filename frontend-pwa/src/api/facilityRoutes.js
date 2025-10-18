import { api } from './client';

// 시설별 경로 가져오기 (multi-floor 지원)
export const getFacilityRoute = async (facilityName) => {
  // 먼저 localStorage 확인
  const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');

  if (localRoutes[facilityName]) {
    console.log(`✅ localStorage에서 경로 로드 (${facilityName}):`, localRoutes[facilityName]);

    // 🔄 Multi-floor 형식인지 확인
    if (localRoutes[facilityName].maps) {
      // 새 형식: 맵별 데이터
      return {
        facility_name: facilityName,
        maps: localRoutes[facilityName].maps,
        currentMap: localRoutes[facilityName].currentMap || 'main_1f'
      };
    } else {
      // 구 형식: 단일 맵 (호환성)
      return {
        facility_name: facilityName,
        nodes: localRoutes[facilityName].nodes || [],
        edges: localRoutes[facilityName].edges || [],
        map_id: localRoutes[facilityName].mapId || 'main_1f',
        startNode: localRoutes[facilityName].startNode || null,
        endNode: localRoutes[facilityName].endNode || null,
        nodeTypes: localRoutes[facilityName].nodeTypes || {},
        nodeTransitions: localRoutes[facilityName].nodeTransitions || {},
      };
    }
  }

  // localStorage에 없으면 API 호출
  try {
    const response = await api.get('/nfc/facility-routes/by_facility/', {
      params: { facility_name: facilityName }
    });

    console.log(`✅ API 응답 (${facilityName}):`, response.data);

    // API가 유효한 데이터를 반환했는지 확인
    if (response.data) {
      // 🔄 Multi-floor 형식 확인
      if (response.data.maps) {
        return {
          facility_name: response.data.facility_name || facilityName,
          maps: response.data.maps,
          currentMap: response.data.currentMap || 'main_1f'
        };
      } else if (response.data.nodes && response.data.nodes.length > 0) {
        // 구 형식 (호환성)
        return {
          facility_name: response.data.facility_name || facilityName,
          nodes: response.data.nodes,
          edges: response.data.edges || [],
          map_id: response.data.map_id || 'main_1f',
          startNode: response.data.startNode || null,
          endNode: response.data.endNode || null,
          nodeTypes: response.data.nodeTypes || {},
          nodeTransitions: response.data.nodeTransitions || {},
        };
      }
    }

    // 데이터가 없으면 에러 발생 (mapStore에서 처리하도록)
    throw new Error('API returned empty or invalid data');

  } catch (error) {
    console.warn(`❌ getFacilityRoute 실패 (${facilityName}):`, error.message);
    throw error; // 에러를 상위로 전파
  }
};

// 데모 경로 가져오기 (시연용)
export const getDemoRoute = (facilityName) => {
  // 시연용 데모 경로 (하드코딩)
  const demoRoutes = {
    "정문 로비_채혈실": {
      nodes: [
        { id: "node-1", x: 150, y: 400, name: "정문 로비" },
        { id: "node-2", x: 250, y: 350, name: "복도1" },
        { id: "node-3", x: 320, y: 280, name: "복도2" },
        { id: "node-4", x: 340, y: 210, name: "채혈실" }
      ],
      edges: [
        ["node-1", "node-2"],
        ["node-2", "node-3"],
        ["node-3", "node-4"]
      ]
    },
    "채혈실": {
      nodes: [
        { id: "node-1", x: 250, y: 400, name: "현재 위치" },
        { id: "node-2", x: 300, y: 350, name: "복도" },
        { id: "node-3", x: 340, y: 210, name: "채혈실" }
      ],
      edges: [
        ["node-1", "node-2"],
        ["node-2", "node-3"]
      ]
    }
  };
  
  return demoRoutes[facilityName] || null;
};

// 경로 저장 (DB와 localStorage 모두) - multi-floor 지원
export const saveRoute = async (facilityName, nodes, edges, mapId = 'main_1f', routeData = null) => {
  // 🔄 Multi-floor 형식 확인
  const isMultiFloor = routeData && routeData.maps;

  try {
    // DB에 저장 시도
    if (isMultiFloor) {
      // 새 형식: 맵별 데이터
      const response = await api.post('/nfc/facility-routes/save_route/', {
        facility_name: facilityName,
        maps: routeData.maps,
        current_map: routeData.currentMap,
        svg_element_id: facilityMapping[facilityName] || '',
      });
      console.log('✅ Multi-floor 경로 DB 저장 성공:', response.data);
    } else {
      // 구 형식 (호환성)
      const startNode = routeData?.startNode || null;
      const endNode = routeData?.endNode || null;
      const nodeTypes = routeData?.nodeTypes || {};
      const nodeTransitions = routeData?.nodeTransitions || {};

      const response = await api.post('/nfc/facility-routes/save_route/', {
        facility_name: facilityName,
        nodes: nodes,
        edges: edges,
        map_id: mapId,
        svg_element_id: facilityMapping[facilityName] || '',
        start_node: startNode,
        end_node: endNode,
        node_types: nodeTypes,
        node_transitions: nodeTransitions,
      });
      console.log('DB에 경로 저장 성공:', response.data);
    }
  } catch (error) {
    console.error('DB 저장 실패, localStorage에만 저장:', error);
  }

  // localStorage에도 저장 (백업)
  const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');

  if (isMultiFloor) {
    // 새 형식: 맵별 데이터
    localRoutes[facilityName] = {
      maps: routeData.maps,
      currentMap: routeData.currentMap,
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ Multi-floor localStorage 저장 완료 (${facilityName}):`, {
      mapsCount: Object.keys(routeData.maps).length,
      maps: Object.keys(routeData.maps),
      currentMap: routeData.currentMap
    });
  } else {
    // 구 형식 (호환성)
    const startNode = routeData?.startNode || null;
    const endNode = routeData?.endNode || null;
    const nodeTypes = routeData?.nodeTypes || {};
    const nodeTransitions = routeData?.nodeTransitions || {};

    localRoutes[facilityName] = {
      nodes: nodes,
      edges: edges,
      mapId: mapId,
      startNode: startNode,
      endNode: endNode,
      nodeTypes: nodeTypes,
      nodeTransitions: nodeTransitions,
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ localStorage에 경로 저장 완료 (${facilityName}):`, {
      nodes: nodes?.length || 0,
      edges: edges?.length || 0,
      mapId: mapId
    });
  }

  localStorage.setItem('facilityRoutes', JSON.stringify(localRoutes));
  return true;
};

// 시설별 SVG element ID 매핑
const facilityMapping = {
  '응급실': 'dept-emergency',
  '약국': 'store-pharmacy',
  '원무과': 'room-storage',
  '영상의학과': 'dept-radiology',
  '진단검사의학과': 'dept-lab',
  '채혈실': 'room-blood-collection',
  // 시연용 경로
  '시연_P1_도착_원무과': 'room-reception',
  '시연_P3_로비_채혈실': 'room-blood-collection',
  '시연_P4_채혈실_대기실': 'waiting-area-blood',
  '시연_P6_채혈실_소변검사실': 'room-urine-test',
  '시연_P6_소변검사실_엑스레이': 'room-xray',
  '시연_P7_수납창구': 'payment-desk',
  '시연_P7_수납_정문': 'main-entrance'
};

// 모든 시설 경로 가져오기 (단순화된 버전)
export const getAllFacilityRoutes = async () => {
  try {
    const response = await api.get('/nfc/facility-routes/');
    console.log('✅ 전체 경로 목록 API 응답:', response.data);
    
    // response.data가 배열인지 확인
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      // 페이지네이션 응답인 경우
      return response.data.results;
    }
    
    // 배열이 아니면 빈 배열 반환
    console.warn('⚠️ API 응답이 배열 형태가 아님:', response.data);
    return [];
  } catch (error) {
    console.error('❌ 전체 경로 목록 조회 실패:', error);
    return []; // 에러 시 빈 배열 반환
  }
};

// 경로 삭제
export const clearRoute = async (facilityName) => {
  try {
    // DB에서 삭제하려면 ID가 필요하므로, 먼저 조회
    const response = await api.get('/nfc/facility-routes/by_facility/', {
      params: { facility_name: facilityName }
    });
    
    if (response.data && response.data.id) {
      await api.delete(`/nfc/facility-routes/${response.data.id}/`);
      console.log('DB에서 경로 삭제 성공');
    }
  } catch (error) {
    console.error('DB 삭제 실패:', error);
  }
  
  // localStorage에서도 삭제
  const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
  if (localRoutes[facilityName]) {
    localRoutes[facilityName].nodes = [];
    localRoutes[facilityName].edges = [];
    localStorage.setItem('facilityRoutes', JSON.stringify(localRoutes));
  }
  
  return true;
};