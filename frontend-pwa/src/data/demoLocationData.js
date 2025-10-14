/**
 * 데모/오프라인 모드용 위치 정보 데이터
 */

export const demoLocations = {
  // 주요 진료과
  내과: {
    name: '내과 진료실',
    building: '본관',
    floor: '2',
    room: '201호',
    description: '내과 진료 및 검사',
    mapFile: 'main_2f.svg',
    coordinates: { x: 350, y: 200 }
  },
  외과: {
    name: '외과 진료실',
    building: '본관',
    floor: '3',
    room: '305호',
    description: '외과 진료 및 수술 상담',
    mapFile: 'main_3f.svg',
    coordinates: { x: 450, y: 250 }
  },
  영상의학과: {
    name: '영상의학과',
    building: '별관',
    floor: '1',
    room: 'B101호',
    description: 'CT, MRI, X-ray 검사',
    mapFile: 'annex_1f.svg',
    coordinates: { x: 200, y: 150 }
  },

  // 검사실
  CT실: {
    name: 'CT 검사실',
    building: '별관',
    floor: '1',
    room: 'B102호',
    description: 'CT 촬영',
    mapFile: 'annex_1f.svg',
    coordinates: { x: 250, y: 180 }
  },
  채혈실: {
    name: '채혈실',
    building: '본관',
    floor: '1',
    room: '105호',
    description: '혈액 검사',
    mapFile: 'main_1f.svg',
    coordinates: { x: 150, y: 220 }
  },

  // 편의시설
  원무과: {
    name: '원무과',
    building: '본관',
    floor: '1',
    room: '접수/수납',
    description: '접수 및 수납',
    mapFile: 'main_1f.svg',
    coordinates: { x: 100, y: 100 }
  },
  약국: {
    name: '약국',
    building: '본관',
    floor: '1',
    room: '약제실',
    description: '처방전 수령',
    mapFile: 'main_1f.svg',
    coordinates: { x: 100, y: 300 }
  }
};

/**
 * 환자 상태별 기본 목적지 반환
 */
export function getDefaultLocationForState(patientState) {
  switch(patientState) {
    case 'UNREGISTERED':
    case 'ARRIVED':
      return demoLocations.원무과;

    case 'REGISTERED':
      return demoLocations.내과;

    case 'WAITING':
      return demoLocations.CT실;

    case 'COMPLETED':
      return demoLocations.원무과;

    case 'PAYMENT':
      return demoLocations.약국;

    default:
      return demoLocations.원무과;
  }
}

/**
 * 데모 일정 데이터 생성
 */
export function generateDemoSchedule() {
  const now = new Date();
  return [
    {
      id: 'demo-1',
      examName: '내과 진료',
      location: '본관 2층 201호',
      status: 'completed',
      description: '일반 내과 진료',
      duration: 20,
      scheduled_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      exam: {
        title: '내과 진료',
        room: '201호',
        building: '본관',
        floor: '2'
      }
    },
    {
      id: 'demo-2',
      examName: 'CT 검사',
      location: '별관 1층 B102호',
      status: 'waiting',
      description: '흉부 CT 촬영',
      duration: 30,
      scheduled_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      exam: {
        title: 'CT 검사',
        room: 'B102호',
        building: '별관',
        floor: '1'
      }
    },
    {
      id: 'demo-3',
      examName: '혈액 검사',
      location: '본관 1층 105호',
      status: 'pending',
      description: '기본 혈액 검사',
      duration: 15,
      scheduled_at: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      exam: {
        title: '혈액 검사',
        room: '105호',
        building: '본관',
        floor: '1'
      }
    }
  ];
}

/**
 * 데모 대기 정보 생성
 */
export function generateDemoWaitingInfo() {
  return {
    peopleAhead: Math.floor(Math.random() * 10) + 1,
    estimatedTime: Math.floor(Math.random() * 30) + 10,
    queueNumber: Math.floor(Math.random() * 50) + 1,
    priority: 'normal'
  };
}