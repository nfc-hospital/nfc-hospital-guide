import axios from 'axios';

// 프로덕션 환경에서는 현재 도메인 사용
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/v1' 
    : `${window.location.protocol}//${window.location.host}/api/v1`);

// 시설별 경로 가져오기 (DB에서)
export const getFacilityRoute = async (facilityName) => {
  try {
    const response = await axios.get(`${API_URL}/nfc/facility-routes/by_facility/`, {
      params: { facility_name: facilityName }
    });
    
    if (response.data && response.data.nodes) {
      return {
        nodes: response.data.nodes,
        edges: response.data.edges || []
      };
    }
    
    // DB에 없으면 localStorage 확인 (fallback)
    const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
    if (localRoutes[facilityName]) {
      return {
        nodes: localRoutes[facilityName].nodes || [],
        edges: localRoutes[facilityName].edges || []
      };
    }
    
    return { nodes: [], edges: [] };
  } catch (error) {
    console.error('경로 데이터 로드 실패:', error);
    
    // API 실패시 localStorage에서 가져오기
    const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
    if (localRoutes[facilityName]) {
      return {
        nodes: localRoutes[facilityName].nodes || [],
        edges: localRoutes[facilityName].edges || []
      };
    }
    
    return { nodes: [], edges: [] };
  }
};

// 경로 저장 (DB와 localStorage 모두)
export const saveRoute = async (facilityName, nodes, edges) => {
  try {
    // DB에 저장 시도
    const response = await axios.post(`${API_URL}/nfc/facility-routes/save_route/`, {
      facility_name: facilityName,
      nodes: nodes,
      edges: edges,
      map_id: 'main_1f',
      svg_element_id: facilityMapping[facilityName] || ''
    });
    
    console.log('DB에 경로 저장 성공:', response.data);
  } catch (error) {
    console.error('DB 저장 실패, localStorage에만 저장:', error);
  }
  
  // localStorage에도 저장 (백업)
  const localRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
  localRoutes[facilityName] = {
    nodes: nodes,
    edges: edges,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem('facilityRoutes', JSON.stringify(localRoutes));
  
  return true;
};

// 시설별 SVG element ID 매핑
const facilityMapping = {
  '응급실': 'dept-emergency',
  '약국': 'store-pharmacy',
  '원무과': 'room-storage',
  '영상의학과': 'dept-radiology',
  '진단검사의학과': 'dept-lab'
};

// 모든 시설 경로 가져오기
export const getAllFacilityRoutes = async () => {
  try {
    const response = await axios.get(`${API_URL}/nfc/facility-routes/`);
    return response.data;
  } catch (error) {
    console.error('전체 경로 데이터 로드 실패:', error);
    return [];
  }
};

// 경로 삭제
export const clearRoute = async (facilityName) => {
  try {
    // DB에서 삭제하려면 ID가 필요하므로, 먼저 조회
    const response = await axios.get(`${API_URL}/nfc/facility-routes/by_facility/`, {
      params: { facility_name: facilityName }
    });
    
    if (response.data && response.data.id) {
      await axios.delete(`${API_URL}/nfc/facility-routes/${response.data.id}/`);
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