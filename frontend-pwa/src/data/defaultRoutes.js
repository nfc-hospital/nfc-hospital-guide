// 기본 경로 데이터 (배포 시 초기값)
export const defaultRoutes = {
  '응급실': {
    nodes: [
      { id: 'node-1', x: 450, y: 100, name: '정문' },
      { id: 'node-2', x: 450, y: 250, name: '중앙 홀' },
      { id: 'node-3', x: 200, y: 250, name: '응급실 앞' }
    ],
    edges: [
      ['node-1', 'node-2'],
      ['node-2', 'node-3']
    ],
    mapId: 'main_1f',
    svgElementId: 'dept-emergency'
  },
  '약국': {
    nodes: [
      { id: 'node-1', x: 450, y: 100, name: '정문' },
      { id: 'node-2', x: 450, y: 250, name: '중앙 홀' },
      { id: 'node-3', x: 530, y: 250, name: '약국 앞' }
    ],
    edges: [
      ['node-1', 'node-2'],
      ['node-2', 'node-3']
    ],
    mapId: 'main_1f',
    svgElementId: 'store-pharmacy'
  },
  '원무과': {
    nodes: [
      { id: 'node-1', x: 450, y: 100, name: '정문' },
      { id: 'node-2', x: 450, y: 250, name: '중앙 홀' },
      { id: 'node-3', x: 380, y: 250, name: '원무과 앞' }
    ],
    edges: [
      ['node-1', 'node-2'],
      ['node-2', 'node-3']
    ],
    mapId: 'main_1f',
    svgElementId: 'room-storage'
  }
};

// localStorage에 기본값 설정 (최초 1회만)
export const initializeDefaultRoutes = () => {
  const existingRoutes = localStorage.getItem('facilityRoutes');
  if (!existingRoutes) {
    localStorage.setItem('facilityRoutes', JSON.stringify(defaultRoutes));
    console.log('기본 경로 데이터가 설정되었습니다.');
    return true;
  }
  return false;
};