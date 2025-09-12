/**
 * 주요 시설 및 진료과 정보를 관리하는 중앙 데이터 파일
 * PublicGuide.jsx에서 시설 버튼 클릭 시 표시할 지도 정보 포함
 */

// 주요 시설 (원무과, 약국, 응급실, 안내데스크 등)
export const MAJOR_FACILITIES = [
  {
    id: 'emergency',
    name: '응급실',
    icon: '🚨',
    description: '24시간 진료',
    building: '본관',
    floor: '1층',
    room: '응급의료센터',
    mapFile: 'main_1f.svg', // public/images/maps/ 하위 파일
    svgId: 'dept-emergency', // SVG 내부에서 강조할 element ID
    coordinates: { x: 220, y: 280 },
    node_id: '188f6ed1-65a4-5b04-a2a9-be2a5406de84', // ✅ 응급의료센터 NavigationNode ID (SVG 자동생성)
    color: {
      primary: 'bg-red-500',
      light: 'bg-red-50',
      border: 'border-red-200',
      hover: 'hover:bg-red-100 hover:border-red-300'
    },
    category: 'emergency'
  },
  {
    id: 'pharmacy',
    name: '약국',
    icon: '💊',
    description: '처방전',
    building: '본관',
    floor: '1층',
    room: '원내약국',
    mapFile: 'main_1f.svg',
    svgId: 'store-pharmacy',
    coordinates: { x: 530, y: 460 }, // ✅ NavigationNode 좌표와 일치
    node_id: '409e37a4-aa63-5ada-9a27-017902feb440', // ✅ 약국 NavigationNode ID
    color: {
      primary: 'bg-emerald-500',
      light: 'bg-emerald-50',
      border: 'border-emerald-200',
      hover: 'hover:bg-emerald-100 hover:border-emerald-300'
    },
    category: 'facility'
  },
  {
    id: 'administration',
    name: '원무과',
    icon: '💳',
    description: '접수·수납',
    building: '본관',
    floor: '1층',
    room: '원무과',
    mapFile: 'main_1f.svg',
    svgId: 'room-storage',
    coordinates: { x: 380, y: 560 }, // ✅ NavigationNode 좌표와 일치
    node_id: 'b14fea41-016f-56b1-9493-a4db1da0bad3', // ✅ 원무과_입구 NavigationNode ID
    color: {
      primary: 'bg-amber-500',
      light: 'bg-amber-50',
      border: 'border-amber-200',
      hover: 'hover:bg-amber-100 hover:border-amber-300'
    },
    category: 'facility'
  },
  {
    id: 'info-desk',
    name: '안내데스크',
    icon: '💁‍♀️',
    description: '도움·안내',
    building: '본관',
    floor: '1층',
    room: '안내데스크',
    mapFile: 'main_1f.svg',
    svgId: 'room-storage',
    coordinates: { x: 400, y: 350 }, // ✅ 중앙교차점 근처로 설정 (안내데스크 위치)
    node_id: 'b3c54f66-110d-5b07-85d6-df68c3bd5a73', // ✅ 중앙교차점 NavigationNode ID
    color: {
      primary: 'bg-purple-500',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100 hover:border-purple-300'
    },
    category: 'facility'
  }
];

// 편의시설 (편의점, 카페, 은행 등)
export const CONVENIENCE_FACILITIES = [
  {
    id: 'convenience-store',
    name: '편의점',
    icon: '🏪',
    description: '생필품 구매',
    building: '본관',
    floor: '1층',
    room: '편의점',
    mapFile: 'main_1f.svg',
    svgId: 'store-convenience',
    coordinates: { x: 530, y: 350 }, // ✅ NavigationNode 좌표와 일치
    node_id: '5f350639-413d-5428-9ff4-792082209380', // ✅ 교차점_530_350 NavigationNode ID
    color: {
      primary: 'bg-blue-500',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100 hover:border-blue-300'
    },
    category: 'convenience'
  },
  {
    id: 'cafe',
    name: '카페',
    icon: '☕',
    description: '휴식 공간',
    building: '본관',
    floor: '1층',
    room: '카페',
    mapFile: 'main_1f.svg',
    svgId: 'store-cafe',
    coordinates: { x: 380, y: 480 }, // ✅ NavigationNode 좌표와 일치
    node_id: 'f49e3359-3d44-511b-97f3-b354e731b58b', // ✅ 교차점_380_480 NavigationNode ID
    color: {
      primary: 'bg-orange-500',
      light: 'bg-orange-50',
      border: 'border-orange-200',
      hover: 'hover:bg-orange-100 hover:border-orange-300'
    },
    category: 'convenience'
  },
  {
    id: 'bank',
    name: '은행',
    icon: '🏦',
    description: '금융 서비스',
    building: '본관',
    floor: '1층',
    room: '은행',
    mapFile: 'main_1f.svg',
    svgId: 'store-bank',
    coordinates: { x: 680, y: 460 }, // ✅ NavigationNode 좌표와 일치
    node_id: '24640c15-6af8-57b7-9b86-5273370a260f', // ✅ 은행_입구 NavigationNode ID
    color: {
      primary: 'bg-green-500',
      light: 'bg-green-50',
      border: 'border-green-200',
      hover: 'hover:bg-green-100 hover:border-green-300'
    },
    category: 'convenience'
  }
];

// 주요 진료과 (실제 존재하는 지도 파일 기반)
export const MAJOR_DEPARTMENTS = [
  {
    id: 'internal-medicine',
    name: '내과',
    icon: '🏥',
    description: '감기·소화기 질환',
    building: '본관',
    floor: '2층',
    room: '내과 진료실',
    mapFile: 'main_2f.svg', // 2층 지도 사용 - 실제 내과가 있음
    svgId: 'clinic-internal-1', // 실제 존재하는 ID
    coordinates: { x: 215, y: 290 },
    waitingPatients: '15명',
    category: 'department'
  },
  {
    id: 'orthopedics',
    name: '정형외과',
    icon: '🦴',
    description: '관절·척추 질환',
    building: '별관',
    floor: '1층',
    room: '정형외과',
    mapFile: 'annex_1f.svg', // 별관 1층 - 실제 정형외과가 있음
    svgId: 'dept-orthopedics', // 실제 존재하는 ID
    coordinates: { x: 300, y: 200 },
    waitingPatients: '8명',
    category: 'department'
  },
  {
    id: 'rehabilitation',
    name: '재활의학과',
    icon: '🏃‍♂️',
    description: '물리·운동 치료',
    building: '별관',
    floor: '1층',
    room: '재활의학과',
    mapFile: 'annex_1f.svg', // 별관 1층 - 실제 재활의학과가 있음
    svgId: 'dept-rehab', // 실제 존재하는 ID
    coordinates: { x: 500, y: 200 },
    waitingPatients: '6명',
    category: 'department'
  },
  {
    id: 'radiology',
    name: '영상의학과',
    icon: '📷',
    description: 'CT·MRI 촬영',
    building: '암센터',
    floor: '2층',
    room: '영상의학과',
    mapFile: 'cancer_2f.svg', // 암센터 2층 - 실제 영상의학과가 있음
    svgId: 'reception-radiology', // 실제 존재하는 ID
    coordinates: { x: 150, y: 110 },
    waitingPatients: '12명',
    category: 'department'
  },
  {
    id: 'ent',
    name: '이비인후과',
    icon: '👂',
    description: '귀·코·목 질환',
    building: '본관',
    floor: '2층',
    room: '이비인후과',
    mapFile: 'overview_main_2f.svg', // overview_main_2f.svg 파일 사용
    svgId: 'dept-ent', // 수정된 SVG ID
    coordinates: { x: 735, y: 175 },
    waitingPatients: '10명',
    category: 'department'
  }
];

// 검사실 및 진단 부서 (실제 존재하는 지도 파일 기반)
export const DIAGNOSTIC_FACILITIES = [
  {
    id: 'laboratory',
    name: '진단검사의학과',
    icon: '🧪',
    description: '피·소변 검사',
    building: '본관',
    floor: '1층',
    room: '진단검사의학과',
    mapFile: 'main_1f.svg',
    svgId: 'dept-laboratory',
    coordinates: { x: 480, y: 220 }, // ✅ NavigationNode 좌표와 일치
    node_id: '68e7ba27-d46c-5a4f-b1bd-45062c325509', // ✅ 진단검사의학과_입구 NavigationNode ID
    category: 'diagnostic'
  },
  {
    id: 'blood-collection',
    name: '채혈실',
    icon: '🩸',
    description: '피 검사',
    building: '본관',
    floor: '1층',
    room: '채혈실',
    mapFile: 'main_1f.svg',
    svgId: 'room-blood-collection',
    coordinates: { x: 680, y: 220 }, // ✅ NavigationNode 좌표와 일치
    node_id: '9ff1e084-24e9-5a47-8432-f9f0b2b17d08', // ✅ 채혈실_입구 NavigationNode ID
    category: 'diagnostic'
  },
  {
    id: 'ct-room',
    name: 'CT실',
    icon: '🔍',
    description: '정밀 엑스레이 검사',
    building: '암센터',
    floor: '2층',
    room: 'CT실',
    mapFile: 'cancer_2f.svg', // 암센터 2층에 실제 CT실이 있음
    svgId: 'room-ct', // 실제 존재하는 ID
    coordinates: { x: 360, y: 270 },
    category: 'diagnostic'
  },
  {
    id: 'mri-room',
    name: 'MRI실',
    icon: '🧲',
    description: '정밀 신체 검사',
    building: '암센터',
    floor: '2층',
    room: 'MRI실',
    mapFile: 'cancer_2f.svg', // 암센터 2층에 실제 MRI실이 있음
    svgId: 'room-mri', // 실제 존재하는 ID
    coordinates: { x: 560, y: 270 },
    category: 'diagnostic'
  },
  {
    id: 'xray-room',
    name: 'X-ray실',
    icon: '📷',
    description: '엑스레이 촬영',
    building: '암센터',
    floor: '2층',
    room: 'X-ray실',
    mapFile: 'cancer_2f.svg', // 암센터 2층에 실제 X-ray실이 있음
    svgId: 'room-xray', // 실제 존재하는 ID
    coordinates: { x: 145, y: 435 },
    category: 'diagnostic'
  },
  {
    id: 'ultrasound-room',
    name: '초음파실',
    icon: '📡',
    description: '초음파 검사',
    building: '암센터',
    floor: '2층',
    room: '초음파실',
    mapFile: 'cancer_2f.svg', // 암센터 2층에 실제 초음파실이 있음
    svgId: 'room-ultrasound', // 실제 존재하는 ID
    coordinates: { x: 335, y: 430 },
    category: 'diagnostic'
  }
];

// 전체 시설 정보를 통합한 배열 (검색용)
export const ALL_FACILITIES = [
  ...MAJOR_FACILITIES,
  ...CONVENIENCE_FACILITIES,
  ...MAJOR_DEPARTMENTS,
  ...DIAGNOSTIC_FACILITIES
];

// 시설 ID로 정보를 검색하는 헬퍼 함수
export const getFacilityById = (id) => {
  return ALL_FACILITIES.find(facility => facility.id === id);
};

// 시설 이름으로 정보를 검색하는 헬퍼 함수 (음성 인식 등에서 사용)
export const getFacilityByName = (name) => {
  return ALL_FACILITIES.find(facility => 
    facility.name.toLowerCase().includes(name.toLowerCase()) ||
    facility.description.toLowerCase().includes(name.toLowerCase())
  );
};

// 카테고리별로 시설을 그룹화하는 함수
export const getFacilitiesByCategory = (category) => {
  return ALL_FACILITIES.filter(facility => facility.category === category);
};

// 건물과 층으로 시설을 필터링하는 함수
export const getFacilitiesByFloor = (building, floor) => {
  return ALL_FACILITIES.filter(facility => 
    facility.building === building && facility.floor === floor
  );
};

// 지도 파일별로 시설을 그룹화하는 함수
export const getFacilitiesByMapFile = (mapFile) => {
  return ALL_FACILITIES.filter(facility => facility.mapFile === mapFile);
};

// PublicGuide.jsx에서 사용할 기본 시설 목록 (주요 시설 + 편의시설)
export const DEFAULT_DISPLAY_FACILITIES = [
  ...MAJOR_FACILITIES,
  ...CONVENIENCE_FACILITIES.slice(0, 2) // 편의점, 카페만 표시
];

// PublicGuide.jsx에서 사용할 기본 진료과 목록 (4개만 표시 - 영상의학과 대신 이비인후과)
export const DEFAULT_DISPLAY_DEPARTMENTS = [
  MAJOR_DEPARTMENTS.find(d => d.id === 'internal-medicine'),
  MAJOR_DEPARTMENTS.find(d => d.id === 'orthopedics'),
  MAJOR_DEPARTMENTS.find(d => d.id === 'rehabilitation'),
  MAJOR_DEPARTMENTS.find(d => d.id === 'ent')
].filter(Boolean);

// PublicGuide.jsx에서 사용할 기본 검사실 목록 (주요 검사실만 표시)
export const DEFAULT_DISPLAY_DIAGNOSTICS = [
  DIAGNOSTIC_FACILITIES.find(f => f.id === 'laboratory'),
  DIAGNOSTIC_FACILITIES.find(f => f.id === 'blood-collection'),
  DIAGNOSTIC_FACILITIES.find(f => f.id === 'ct-room'),
  DIAGNOSTIC_FACILITIES.find(f => f.id === 'mri-room')
].filter(Boolean); // undefined 제거