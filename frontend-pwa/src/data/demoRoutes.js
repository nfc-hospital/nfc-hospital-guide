// 시연용 경로 데이터
// MapNodeEditor에서 생성한 경로를 각 화면에서 사용할 수 있도록 매핑

import { getFacilityRoute } from './facilityRoutes';

// 각 화면(P-0 ~ P-7)에 매핑되는 시연 경로
export const getDemoRouteForScreen = (screenId) => {
  const routeMapping = {
    // P-0: 도착 전 (경로 없음)
    'P-0': null,
    
    // P-1: 도착 → 원무과 접수
    'P-1': '시연_P1_도착_원무과',
    'ARRIVED': '시연_P1_도착_원무과',
    
    // P-2: 로그인/접수 (경로 없음)
    'P-2': null,
    'REGISTERED_INITIAL': null,
    
    // P-3: 로비 → 채혈실
    'P-3': '시연_P3_로비_채혈실',
    'REGISTERED': '시연_P3_로비_채혈실',
    
    // P-4: 채혈실 대기
    'P-4': '시연_P4_채혈실_대기실',
    'WAITING': '시연_P4_채혈실_대기실',
    
    // P-5: 호출됨 (같은 위치)
    'P-5': '시연_P4_채혈실_대기실',
    'CALLED': '시연_P4_채혈실_대기실',
    
    // P-6: 검사 진행 중 (채혈 → 소변 → X-ray)
    'P-6': '시연_P6_채혈실_소변검사실',
    'P-6-URINE': '시연_P6_채혈실_소변검사실',
    'P-6-XRAY': '시연_P6_소변검사실_엑스레이',
    'ONGOING': '시연_P6_채혈실_소변검사실',
    'COMPLETED': '시연_P6_소변검사실_엑스레이',
    
    // P-7: 수납
    'P-7': '시연_P7_수납창구',
    'P-7-EXIT': '시연_P7_수납_정문',
    'PAYMENT': '시연_P7_수납창구',
    'FINISHED': '시연_P7_수납_정문',
  };
  
  const facilityName = routeMapping[screenId];
  if (!facilityName) return null;
  
  // localStorage에서 저장된 경로 가져오기
  const route = getFacilityRoute(facilityName);
  
  // 경로가 없으면 기본 샘플 경로 반환
  if (!route || route.nodes.length === 0) {
    return getDefaultDemoRoute(screenId);
  }
  
  return {
    facilityName,
    nodes: route.nodes,
    edges: route.edges,
    mapId: getMapIdForScreen(screenId)
  };
};

// 지도 ID 매핑
const getMapIdForScreen = (screenId) => {
  const mapMapping = {
    'P-1': 'main_1f',
    'P-3': 'main_1f',
    'P-4': 'main_1f',
    'P-5': 'main_1f',
    'P-6': 'main_1f',
    'P-6-XRAY': 'main_2f',
    'P-7': 'main_1f',
    'P-7-EXIT': 'main_1f',
    'ARRIVED': 'main_1f',
    'REGISTERED': 'main_1f',
    'WAITING': 'main_1f',
    'CALLED': 'main_1f',
    'ONGOING': 'main_1f',
    'COMPLETED': 'main_2f',
    'PAYMENT': 'main_1f',
    'FINISHED': 'main_1f'
  };
  
  return mapMapping[screenId] || 'main_1f';
};

// 기본 샘플 경로 (사용자가 아직 그리지 않은 경우)
const getDefaultDemoRoute = (screenId) => {
  const defaultRoutes = {
    'P-1': {
      nodes: [
        { id: 'node-1', x: 100, y: 300, name: '정문' },
        { id: 'node-2', x: 200, y: 300, name: '로비' },
        { id: 'node-3', x: 300, y: 300, name: '원무과' }
      ],
      edges: [['node-1', 'node-2'], ['node-2', 'node-3']]
    },
    'P-3': {
      nodes: [
        { id: 'node-1', x: 200, y: 300, name: '로비' },
        { id: 'node-2', x: 400, y: 300, name: '복도' },
        { id: 'node-3', x: 500, y: 300, name: '채혈실' }
      ],
      edges: [['node-1', 'node-2'], ['node-2', 'node-3']]
    },
    'P-4': {
      nodes: [
        { id: 'node-1', x: 500, y: 300, name: '채혈실 대기실' }
      ],
      edges: []
    },
    'P-6': {
      nodes: [
        { id: 'node-1', x: 500, y: 300, name: '채혈실' },
        { id: 'node-2', x: 500, y: 200, name: '복도' },
        { id: 'node-3', x: 600, y: 200, name: '소변검사실' }
      ],
      edges: [['node-1', 'node-2'], ['node-2', 'node-3']]
    },
    'P-7': {
      nodes: [
        { id: 'node-1', x: 200, y: 300, name: '로비' },
        { id: 'node-2', x: 200, y: 400, name: '수납창구' }
      ],
      edges: [['node-1', 'node-2']]
    }
  };
  
  const route = defaultRoutes[screenId] || defaultRoutes['P-1'];
  return {
    facilityName: `default_${screenId}`,
    nodes: route.nodes,
    edges: route.edges,
    mapId: getMapIdForScreen(screenId)
  };
};

// 현재 검사에 따른 경로 결정
export const getDemoRouteForExam = (examId, state) => {
  const examRouteMapping = {
    'blood_test': {
      'WAITING': 'P-4',
      'CALLED': 'P-5',
      'ONGOING': 'P-6'
    },
    'urine_test': {
      'WAITING': 'P-6-URINE',
      'ONGOING': 'P-6-URINE'
    },
    'chest_xray': {
      'WAITING': 'P-6-XRAY',
      'ONGOING': 'P-6-XRAY'
    }
  };
  
  const screenId = examRouteMapping[examId]?.[state];
  return screenId ? getDemoRouteForScreen(screenId) : null;
};