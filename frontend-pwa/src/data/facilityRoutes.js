// 시설별 경로 데이터 관리
export const facilityRoutes = {
  '응급실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'dept-emergency'
  },
  '약국': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'store-pharmacy'
  },
  '원무과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'room-storage'
  },
  '영상의학과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'dept-radiology'
  },
  '진단검사의학과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'dept-lab'
  },
  '내과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'dept-internal'
  },
  '정형외과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'dept-orthopedic'
  },
  '소아청소년과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'dept-pediatric'
  },
  '산부인과': {
    nodes: [],
    edges: [],
    mapId: 'main_3f',
    svgElementId: 'dept-obgyn'
  },
  '신경과': {
    nodes: [],
    edges: [],
    mapId: 'main_3f',
    svgElementId: 'dept-neurology'
  },
  '정신건강의학과': {
    nodes: [],
    edges: [],
    mapId: 'main_3f',
    svgElementId: 'dept-psychiatry'
  },
  '재활의학과': {
    nodes: [],
    edges: [],
    mapId: 'annex_1f',
    svgElementId: 'dept-rehabilitation'
  },
  '건강검진센터': {
    nodes: [],
    edges: [],
    mapId: 'annex_2f',
    svgElementId: 'center-checkup'
  }
};

// localStorage에서 저장된 경로 불러오기
export const loadSavedRoutes = () => {
  const saved = localStorage.getItem('facilityRoutes');
  if (saved) {
    return JSON.parse(saved);
  }
  return facilityRoutes;
};

// 경로 저장 (이전 데이터 덮어쓰기)
export const saveRoute = (facilityName, nodes, edges) => {
  // 기본 구조 유지하면서 해당 시설의 경로만 업데이트
  const routes = { ...facilityRoutes };
  
  // localStorage에 이미 저장된 데이터가 있으면 가져오기
  const saved = localStorage.getItem('facilityRoutes');
  if (saved) {
    Object.assign(routes, JSON.parse(saved));
  }
  
  // 해당 시설의 경로를 새로운 데이터로 완전히 교체
  if (routes[facilityName]) {
    routes[facilityName] = {
      ...routes[facilityName],
      nodes: nodes,  // 이전 nodes 완전 교체
      edges: edges,  // 이전 edges 완전 교체
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('facilityRoutes', JSON.stringify(routes));
    return true;
  }
  return false;
};

// 특정 시설의 경로 삭제
export const clearRoute = (facilityName) => {
  const routes = loadSavedRoutes();
  if (routes[facilityName]) {
    routes[facilityName].nodes = [];
    routes[facilityName].edges = [];
    localStorage.setItem('facilityRoutes', JSON.stringify(routes));
    return true;
  }
  return false;
};

// 모든 저장된 경로 삭제
export const clearAllRoutes = () => {
  localStorage.removeItem('facilityRoutes');
};

// 특정 시설의 경로 가져오기
export const getFacilityRoute = (facilityName) => {
  const routes = loadSavedRoutes();
  return routes[facilityName] || null;
};