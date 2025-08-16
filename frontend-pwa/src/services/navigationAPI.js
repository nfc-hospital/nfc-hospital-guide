import axiosInstance from './axiosInstance';

/**
 * Navigation API 서비스
 * 병원 내 경로 안내 관련 API 호출
 */
class NavigationAPI {
  /**
   * 지도 메타데이터 조회
   * @returns {Promise} 지도 정보 및 노드 데이터
   */
  async getMapsMetadata() {
    try {
      const response = await axiosInstance.get('/api/v1/navigation/maps/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch maps metadata:', error);
      throw error;
    }
  }

  /**
   * 특정 층 지도 정보 조회
   * @param {string} floorId - 층 ID (예: main_1f, cancer_2f)
   * @returns {Promise} 층별 지도 정보
   */
  async getFloorMap(floorId) {
    try {
      const response = await axiosInstance.get(`/api/hospital/map/${floorId}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch floor map for ${floorId}:`, error);
      throw error;
    }
  }

  /**
   * NFC 스캔 기반 경로 안내
   * @param {Object} params - 요청 파라미터
   * @param {string} params.tag_id - NFC 태그 ID
   * @param {string} [params.target_exam_id] - 목적지 검사실 ID
   * @param {string} [params.target_location] - 목적지 위치명
   * @param {boolean} [params.is_accessible] - 접근성 경로 여부
   * @param {boolean} [params.avoid_stairs] - 계단 회피 여부
   * @param {boolean} [params.avoid_crowded] - 혼잡 구역 회피 여부
   * @returns {Promise} 계산된 경로 정보
   */
  async scanAndNavigate(params) {
    try {
      const response = await axiosInstance.post('/api/nfc/scan/navigate/', params);
      return response.data;
    } catch (error) {
      console.error('Failed to calculate navigation route:', error);
      throw error;
    }
  }

  /**
   * 경로 계산 요청
   * @param {Object} params - 경로 계산 파라미터
   * @param {string} [params.start_node_id] - 시작 노드 ID
   * @param {string} [params.end_node_id] - 도착 노드 ID
   * @param {string} [params.start_tag_id] - 시작 NFC 태그 ID
   * @param {string} [params.end_tag_id] - 도착 NFC 태그 ID
   * @param {boolean} [params.is_accessible] - 접근성 경로
   * @param {boolean} [params.avoid_stairs] - 계단 회피
   * @param {boolean} [params.avoid_crowded] - 혼잡 회피
   * @returns {Promise} 계산된 경로
   */
  async calculateRoute(params) {
    // [NAVIGATION-API]: calculateRoute() 구현
    try {
      // 임시 구현 - 실제 API 엔드포인트로 교체 필요
      console.log('Calculating route with params:', params);
      
      // 테스트용 더미 경로 반환
      return {
        success: true,
        data: {
          route_id: 'dummy-route-id',
          path_nodes: params.start_node_id ? [params.start_node_id, params.end_node_id] : [],
          total_distance: 150,
          estimated_time: 180,
          steps: [
            {
              step_number: 1,
              instruction: '엘리베이터를 타고 2층으로 이동하세요',
              distance: 50,
              walk_time: 60
            },
            {
              step_number: 2,  
              instruction: '복도를 따라 직진하세요',
              distance: 100,
              walk_time: 120
            }
          ]
        }
      };
    } catch (error) {
      console.error('Failed to calculate route:', error);
      throw error;
    }
  }

  /**
   * 경로 완료/취소 처리
   * @param {string} routeId - 경로 ID
   * @param {string} [completionType='completed'] - 완료 타입 (completed/cancelled/expired)
   * @param {string} [notes] - 메모
   * @returns {Promise} 처리 결과
   */
  async completeNavigation(routeId, completionType = 'completed', notes = '') {
    try {
      const response = await axiosInstance.post('/api/navigation/complete/', {
        route_id: routeId,
        completion_type: completionType,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Failed to complete navigation:', error);
      throw error;
    }
  }

  /**
   * 위치 검색
   * @param {Object} params - 검색 파라미터
   * @param {string} [params.from_location] - 출발지 검색어
   * @param {string} [params.to_location] - 도착지 검색어
   * @param {string} [params.location_type] - 위치 타입 (all/exam_room/facility/restroom/elevator)
   * @param {string} [params.building] - 건물명
   * @param {number} [params.floor] - 층
   * @param {boolean} [params.is_accessible] - 접근성 시설만
   * @returns {Promise} 검색 결과
   */
  async searchRoutes(params) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/routes/search/?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search routes:', error);
      throw error;
    }
  }

  /**
   * 내 경로 목록 조회
   * @returns {Promise} 사용자의 경로 목록
   */
  async getMyRoutes() {
    try {
      const response = await axiosInstance.get('/api/navigation/routes/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch my routes:', error);
      throw error;
    }
  }

  /**
   * 경로 통계 조회 (관리자용)
   * @returns {Promise} 경로 통계 정보
   */
  async getStatistics() {
    try {
      const response = await axiosInstance.get('/api/navigation/routes/statistics/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch navigation statistics:', error);
      throw error;
    }
  }

  /**
   * SVG 경로 문자열 생성
   * @param {Array} nodes - 경로 노드 배열
   * @returns {string} SVG path 문자열
   */
  generateSVGPath(nodes) {
    if (!nodes || nodes.length < 2) return '';
    
    let path = `M ${nodes[0].x_coord} ${nodes[0].y_coord}`;
    for (let i = 1; i < nodes.length; i++) {
      path += ` L ${nodes[i].x_coord} ${nodes[i].y_coord}`;
    }
    return path;
  }

  /**
   * 두 노드 간 직선 거리 계산
   * @param {Object} node1 - 시작 노드
   * @param {Object} node2 - 도착 노드
   * @returns {number} 거리 (미터)
   */
  calculateDistance(node1, node2) {
    const dx = node2.x_coord - node1.x_coord;
    const dy = node2.y_coord - node1.y_coord;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const navigationAPI = new NavigationAPI();
export default navigationAPI;