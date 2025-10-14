/**
 * Navigation API 서비스 레이어
 * 경로 계산, NFC 태그 정보, 병원 지도 관련 API 호출 함수들
 */

import { api } from './client';

// 공통 에러 처리 함수
const handleApiError = (error, operation) => {
  console.error(`${operation} 오류:`, error);
  
  if (error.response) {
    // 서버 응답이 있는 경우
    const status = error.response.status;
    let errorMessage = error.response.data?.message || '서버 오류가 발생했습니다.';
    
    // 특정 상태 코드에 대한 사용자 친화적 메시지
    if (status === 404) {
      if (operation.includes('경로 계산')) {
        errorMessage = '경로를 찾을 수 없습니다. 출발지나 목적지를 다시 확인해주세요.';
      } else {
        errorMessage = '요청한 리소스를 찾을 수 없습니다.';
      }
    } else if (status === 500) {
      errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    return {
      success: false,
      error: errorMessage,
      status: status,
      data: null
    };
  } else if (error.request) {
    // 요청은 보내졌지만 응답이 없는 경우
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
      status: 0,
      data: null
    };
  } else {
    // 요청 설정 중 오류가 발생한 경우
    return {
      success: false,
      error: '요청 처리 중 오류가 발생했습니다.',
      status: 0,
      data: null
    };
  }
};

// ===========================
// NFC 태그 관련 API
// ===========================

/**
 * NFC 태그 목록 조회 (MockNFC 패널용)
 * @returns {Promise<Object>} 태그 목록 및 메타데이터
 */
export const getNfcTags = async () => {
  try {
    const response = await api.get('nfc/tags/');
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        count: response.data.data?.length || 0
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'NFC 태그 목록 조회 실패',
        data: []
      };
    }
  } catch (error) {
    return handleApiError(error, 'NFC 태그 목록 조회');
  }
};

/**
 * 특정 NFC 태그의 위치 정보 조회
 * @param {string} tagId - NFC 태그 ID
 * @returns {Promise<Object>} 태그 위치 정보
 */
export const getNfcLocation = async (tagId) => {
  try {
    if (!tagId) {
      throw new Error('태그 ID가 필요합니다.');
    }
    
    const response = await api.get(`nfc/tags/${tagId}/location/`);
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'NFC 태그 위치 조회 실패',
        data: null
      };
    }
  } catch (error) {
    return handleApiError(error, 'NFC 태그 위치 조회');
  }
};

// ===========================
// 경로 계산 API
// ===========================

/**
 * 두 노드 간 최단 경로 계산
 * @param {string} startNodeId - 출발지 노드 ID  
 * @param {string} endNodeId - 목적지 노드 ID
 * @param {Object} options - 경로 계산 옵션
 * @param {boolean} options.avoidStairs - 계단 회피 여부
 * @param {boolean} options.isAccessible - 접근성 경로만 사용 여부
 * @returns {Promise<Object>} 계산된 경로 정보
 */
export const calculateRoute = async (startNodeId, endNodeId, options = {}) => {
  try {
    if (!startNodeId || !endNodeId) {
      throw new Error('출발지와 목적지 노드 ID가 필요합니다.');
    }
    
    const requestData = {
      start_node_id: startNodeId,
      end_node_id: endNodeId,
      avoid_stairs: options.avoidStairs || false,
      is_accessible: options.isAccessible || false
    };
    
    const response = await api.post('navigation/path/', requestData);
    
    // client.js 인터셉터가 이미 response.data를 반환하므로 직접 접근
    if (response.success) {
      const pathData = response.data;  // 이미 data 필드가 추출된 상태
      
      return {
        success: true,
        data: {
          coordinates: pathData.coordinates || [],  // 백엔드는 coordinates 키 사용
          path_coordinates: pathData.coordinates || [], // MapStore 호환성
          distance: pathData.distance || 0,
          estimatedTime: pathData.estimatedTime || 0,
          steps: pathData.steps || [],
          nodes: pathData.nodes || [],
          edges: pathData.edges || []
        },
        message: response.message || '경로 계산이 완료되었습니다.'
      };
    } else {
      return {
        success: false,
        error: response.message || '경로 계산 실패',
        data: null
      };
    }
  } catch (error) {
    return handleApiError(error, '경로 계산');
  }
};

/**
 * NFC 태그 기반 경로 계산 (태그 코드 사용)
 * @param {string} startTagCode - 출발지 NFC 태그 코드
 * @param {string} endTagCode - 목적지 NFC 태그 코드  
 * @param {Object} options - 경로 계산 옵션
 * @returns {Promise<Object>} 계산된 경로 정보
 */
export const calculateRouteByTags = async (startTagCode, endTagCode, options = {}) => {
  try {
    if (!startTagCode || !endTagCode) {
      throw new Error('출발지와 목적지 태그 코드가 필요합니다.');
    }
    
    const requestData = {
      start_tag_code: startTagCode,
      end_tag_code: endTagCode,
      avoid_stairs: options.avoidStairs || false,
      is_accessible: options.isAccessible || false
    };
    
    const response = await api.post('navigation/route-by-tags/', requestData);
    
    // client.js 인터셉터가 이미 response.data를 반환하므로 직접 접근
    if (response.success) {
      const pathData = response.data;  // 이미 data 필드가 추출된 상태
      
      return {
        success: true,
        data: {
          coordinates: pathData.coordinates || [],
          path_coordinates: pathData.coordinates || [],
          distance: pathData.distance || 0,
          estimatedTime: pathData.estimatedTime || 0,
          steps: pathData.steps || [],
          nodes: pathData.nodes || [],
          edges: pathData.edges || []
        },
        message: response.message || '태그 기반 경로 계산이 완료되었습니다.'
      };
    } else {
      return {
        success: false,
        error: response.message || '태그 기반 경로 계산 실패',
        data: null
      };
    }
  } catch (error) {
    return handleApiError(error, '태그 기반 경로 계산');
  }
};

// ===========================
// 병원 지도 및 위치 정보 API
// ===========================

/**
 * 병원 지도 메타데이터 조회
 * @returns {Promise<Object>} 지도 메타데이터
 */
export const getHospitalMaps = async () => {
  try {
    const response = await api.get('navigation/maps/');
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: '지도 정보 조회가 완료되었습니다.'
      };
    } else {
      return {
        success: false,
        error: response.data.message || '지도 정보 조회 실패',
        data: []
      };
    }
  } catch (error) {
    return handleApiError(error, '병원 지도 조회');
  }
};

/**
 * 진료과/시설 존 목록 조회
 * @returns {Promise<Object>} 진료과 및 시설 존 목록
 */
export const getDepartmentZones = async () => {
  try {
    const response = await api.get('navigation/zones/');
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: '진료과 정보 조회가 완료되었습니다.'
      };
    } else {
      return {
        success: false,
        error: response.data.message || '진료과 정보 조회 실패',
        data: []
      };
    }
  } catch (error) {
    return handleApiError(error, '진료과 정보 조회');
  }
};

/**
 * 특정 진료과/시설 존 상세 정보 조회
 * @param {number} zoneId - 존 ID
 * @returns {Promise<Object>} 존 상세 정보
 */
export const getDepartmentZoneDetail = async (zoneId) => {
  try {
    if (!zoneId) {
      throw new Error('존 ID가 필요합니다.');
    }
    
    const response = await api.get(`navigation/zones/${zoneId}/`);
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: '존 상세 정보 조회가 완료되었습니다.'
      };
    } else {
      return {
        success: false,
        error: response.data.message || '존 상세 정보 조회 실패',
        data: null
      };
    }
  } catch (error) {
    return handleApiError(error, '존 상세 정보 조회');
  }
};

// ===========================
// 유틸리티 함수들
// ===========================

/**
 * LocationStore 상태를 기반으로 목적지까지의 경로 계산
 * @param {Object} currentLocation - 현재 위치 정보
 * @param {string} destinationNodeId - 목적지 노드 ID
 * @param {Object} options - 경로 옵션
 * @returns {Promise<Object>} 경로 정보
 */
export const calculateRouteFromCurrentLocation = async (currentLocation, destinationNodeId, options = {}) => {
  try {
    if (!currentLocation?.nodeId) {
      throw new Error('현재 위치가 설정되지 않았습니다.');
    }
    
    if (!destinationNodeId) {
      throw new Error('목적지가 지정되지 않았습니다.');
    }
    
    console.log('🗺️ 현재 위치에서 경로 계산:', {
      from: currentLocation.nodeId,
      to: destinationNodeId,
      options
    });
    
    const result = await calculateRoute(currentLocation.nodeId, destinationNodeId, options);
    
    if (result.success) {
      console.log('✅ 경로 계산 성공:', {
        coordinateCount: result.data.coordinates.length,
        distance: result.data.distance,
        time: result.data.estimatedTime
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ 경로 계산 실패:', error);
    return {
      success: false,
      error: error.message || '경로 계산 중 오류가 발생했습니다.',
      data: null
    };
  }
};

/**
 * 거리 단위 포맷팅 (미터 → 표시용)
 * @param {number} meters - 미터 단위 거리
 * @returns {string} 포맷된 거리 문자열
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

/**
 * 시간 단위 포맷팅 (초 → 표시용)
 * @param {number} seconds - 초 단위 시간
 * @returns {string} 포맷된 시간 문자열
 */
export const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}초`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes}분`;
    } else {
      return `${minutes}분 ${Math.round(remainingSeconds)}초`;
    }
  }
};

/**
 * API 응답의 성공 여부 확인
 * @param {Object} response - API 응답 객체
 * @returns {boolean} 성공 여부
 */
export const isApiSuccess = (response) => {
  return response && response.success === true;
};

/**
 * API 기본 설정 업데이트 (인증 토큰 추가 등)
 * @param {Object} config - Axios 설정 객체
 */
export const updateApiConfig = (config) => {
  Object.assign(api.defaults, config);
  console.log('📡 Navigation API 설정 업데이트:', config);
};

export default {
  // NFC 관련
  getNfcTags,
  getNfcLocation,
  
  // 경로 계산
  calculateRoute,
  calculateRouteByTags,
  calculateRouteFromCurrentLocation,
  
  // 병원 정보
  getHospitalMaps,
  getDepartmentZones,
  getDepartmentZoneDetail,
  
  // 유틸리티
  formatDistance,
  formatTime,
  isApiSuccess,
  updateApiConfig
};