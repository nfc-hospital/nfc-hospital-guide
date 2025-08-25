// 사용 가능한 모든 지도 파일
export const availableMaps = [
  { id: 'main_1f', name: '본관 1층', file: 'main_1f.svg' },
  { id: 'main_2f', name: '본관 2층', file: 'main_2f.svg' },
  { id: 'annex_1f', name: '별관 1층', file: 'annex_1f.svg' },
  { id: 'cancer_1f', name: '암센터 1층', file: 'cancer_1f.svg' },
  { id: 'cancer_2f', name: '암센터 2층', file: 'cancer_2f.svg' },
  { id: 'overview_main_1f', name: '본관 1층 개요', file: 'overview_main_1f.svg' },
  { id: 'overview_main_2f', name: '본관 2층 개요', file: 'overview_main_2f.svg' },
  { id: 'overview_cancer_2f', name: '암센터 2층 개요', file: 'overview_cancer_2f.svg' }
];

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
    mapId: 'annex_1f',
    svgElementId: 'dept-orthopedic',
    description: '정형외과',
    x_coord: 300,
    y_coord: 200
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
    svgElementId: 'dept-rehabilitation',
    description: '재활의학과',
    x_coord: 500,
    y_coord: 200
  },
  '이비인후과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'dept-ent',
    description: '이비인후과',
    x_coord: 735,
    y_coord: 175
  },
  '건강검진센터': {
    nodes: [],
    edges: [],
    mapId: 'annex_2f',
    svgElementId: 'center-checkup'
  },
  
  // === 검사실 ===
  '검사_채혈실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'exam-blood',
    description: '채혈실',
    x_coord: 675,
    y_coord: 160
  },
  '검사_채혈실_대기실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'exam-blood-waiting',
    description: '채혈실 대기실',
    x_coord: 340,
    y_coord: 210
  },
  '검사_소변검사실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'exam-urine',
    description: '소변검사실',
    x_coord: 400,
    y_coord: 200
  },
  '검사_X-ray실': {
    nodes: [],
    edges: [],
    mapId: 'cancer_2f',
    svgElementId: 'exam-xray',
    description: 'X-ray실',
    x_coord: 145,
    y_coord: 435
  },
  '검사_CT실': {
    nodes: [],
    edges: [],
    mapId: 'cancer_2f',
    svgElementId: 'exam-ct',
    description: 'CT실',
    x_coord: 360,
    y_coord: 270
  },
  '검사_MRI실': {
    nodes: [],
    edges: [],
    mapId: 'cancer_2f',
    svgElementId: 'exam-mri',
    description: 'MRI실',
    x_coord: 560,
    y_coord: 270
  },
  '검사_초음파실': {
    nodes: [],
    edges: [],
    mapId: 'cancer_2f',
    svgElementId: 'exam-ultrasound',
    description: '초음파실',
    x_coord: 335,
    y_coord: 430
  },
  
  // === 편의시설 ===
  '편의_수납창구': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-payment',
    description: '수납창구',
    x_coord: 200,
    y_coord: 450
  },
  '편의_편의점': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-store',
    description: '편의점',
    x_coord: 570,
    y_coord: 280
  },
  '편의_카페': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-cafe',
    description: '카페',
    x_coord: 570,
    y_coord: 360
  },
  '편의_은행': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-bank',
    description: '은행',
    x_coord: 680,
    y_coord: 280
  },
  '편의_화장실_본관1F': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-restroom-main-1f',
    description: '화장실 (본관 1층)'
  },
  '편의_화장실_본관2F': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'facility-restroom-main-2f',
    description: '화장실 (본관 2층)'
  },
  '편의_주차장_입구': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'facility-parking-entrance',
    description: '주차장 입구'
  },
  // === 진료과/시설 구역 ===
  '진료과_구역_응급실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'zone-emergency',
    description: '응급실 구역'
  },
  '진료과_구역_영상의학과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'zone-radiology',
    description: '영상의학과 구역'
  },
  '진료과_구역_진단검사의학과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'zone-lab',
    description: '진단검사의학과 구역'
  },
  '진료과_구역_내과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'zone-internal',
    description: '내과 구역'
  },
  '진료과_구역_외과': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'zone-surgery',
    description: '외과 구역'
  },
  
  // === 네비게이션 노드 ===
  '네비게이션_노드_정문': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-main-entrance',
    description: '정문 입구'
  },
  '네비게이션_노드_엘리베이터_본관1F': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-elevator-main-1f',
    description: '본관 1층 엘리베이터'
  },
  '네비게이션_노드_엘리베이터_본관2F': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'nav-elevator-main-2f',
    description: '본관 2층 엘리베이터'
  },
  '네비게이션_노드_계단_본관_동': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-stairs-main-east',
    description: '본관 동쪽 계단'
  },
  '네비게이션_노드_계단_본관_서': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-stairs-main-west',
    description: '본관 서쪽 계단'
  },
  '네비게이션_노드_연결통로_본관_별관': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-bridge-main-annex',
    description: '본관-별관 연결통로'
  },
  '네비게이션_노드_연결통로_본관_암센터': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'nav-bridge-main-cancer',
    description: '본관-암센터 연결통로'
  },
  
  // 시연용 경로 (P-1 ~ P-7)
  '시연_P1_도착_원무과': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'room-reception',
    description: 'P-1: 도착 → 원무과 접수'
  },
  '시연_P3_로비_채혈실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'room-blood-collection',
    description: 'P-3: 로비 → 채혈실'
  },
  '시연_P4_채혈실_대기실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'waiting-area-blood',
    description: 'P-4: 채혈실 대기실'
  },
  '시연_P6_채혈실_소변검사실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'room-urine-test',
    description: 'P-6: 채혈실 → 소변검사실'
  },
  '시연_P6_소변검사실_엑스레이': {
    nodes: [],
    edges: [],
    mapId: 'main_2f',
    svgElementId: 'room-xray',
    description: 'P-6: 소변검사실 → X-ray'
  },
  '시연_P7_수납창구': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'payment-desk',
    description: 'P-7: 수납창구'
  },
  '시연_P7_수납_정문': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'main-entrance',
    description: 'P-7: 수납 → 정문'
  },
  '채혈실': {
    nodes: [],
    edges: [],
    mapId: 'main_1f',
    svgElementId: 'room-blood-collection'
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
  const facilityData = routes[facilityName];
  
  // 저장된 데이터가 있고 유효한 경우만 반환
  if (facilityData && facilityData.nodes && facilityData.nodes.length > 0) {
    return {
      nodes: facilityData.nodes,
      edges: facilityData.edges || []
    };
  }
  
  // 저장된 경로가 없으면 빈 배열 반환
  return {
    nodes: [],
    edges: []
  };
};