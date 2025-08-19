import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * 시설 경로 서비스
 * 경로 데이터를 백엔드 DB에 저장하고 불러오는 기능
 */
class FacilityRouteService {
  /**
   * 경로 데이터 저장
   * @param {Object} routeData - 저장할 경로 데이터
   * @returns {Promise} API 응답
   */
  async saveRoute(routeData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/nfc/facility-routes/save_route/`,
        routeData
      );
      return response.data;
    } catch (error) {
      console.error('경로 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 시설명으로 경로 조회
   * @param {string} facilityName - 시설 이름
   * @returns {Promise} 경로 데이터
   */
  async getRouteByFacility(facilityName) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/nfc/facility-routes/by_facility/`,
        { params: { facility_name: facilityName } }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // 경로가 없으면 null 반환
        return null;
      }
      console.error('경로 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 저장된 시설 목록 조회
   * @returns {Promise} 시설 목록
   */
  async getAllFacilities() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/nfc/facility-routes/all_facilities/`
      );
      return response.data.facilities;
    } catch (error) {
      console.error('시설 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 여러 경로 한번에 저장
   * @param {Array} routesData - 저장할 경로 데이터 배열
   * @returns {Promise} API 응답
   */
  async batchSaveRoutes(routesData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/nfc/facility-routes/batch_save/`,
        { routes: routesData }
      );
      return response.data;
    } catch (error) {
      console.error('경로 일괄 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 기본 경로 데이터 초기화
   * 배포 시 기본 경로들을 DB에 저장
   */
  async initializeDefaultRoutes() {
    const defaultRoutes = [
      {
        facility_name: "응급실",
        nodes: [
          { id: "node-1", x: 450, y: 100, name: "정문" },
          { id: "node-2", x: 450, y: 250, name: "중앙 홀" },
          { id: "node-3", x: 200, y: 250, name: "응급실 앞" }
        ],
        edges: [["node-1", "node-2"], ["node-2", "node-3"]],
        map_id: "main_1f",
        svg_element_id: "dept-emergency"
      },
      {
        facility_name: "X-Ray실",
        nodes: [
          { id: "node-1", x: 450, y: 100, name: "정문" },
          { id: "node-2", x: 450, y: 250, name: "중앙 홀" },
          { id: "node-3", x: 600, y: 250, name: "영상의학과" },
          { id: "node-4", x: 600, y: 350, name: "X-Ray실" }
        ],
        edges: [["node-1", "node-2"], ["node-2", "node-3"], ["node-3", "node-4"]],
        map_id: "main_1f",
        svg_element_id: "dept-radiology"
      },
      {
        facility_name: "채혈실",
        nodes: [
          { id: "node-1", x: 450, y: 100, name: "정문" },
          { id: "node-2", x: 450, y: 250, name: "중앙 홀" },
          { id: "node-3", x: 300, y: 250, name: "진단검사의학과" },
          { id: "node-4", x: 300, y: 150, name: "채혈실" }
        ],
        edges: [["node-1", "node-2"], ["node-2", "node-3"], ["node-3", "node-4"]],
        map_id: "main_1f",
        svg_element_id: "dept-lab"
      },
      {
        facility_name: "약국",
        nodes: [
          { id: "node-1", x: 450, y: 100, name: "정문" },
          { id: "node-2", x: 450, y: 250, name: "중앙 홀" },
          { id: "node-3", x: 350, y: 350, name: "약국" }
        ],
        edges: [["node-1", "node-2"], ["node-2", "node-3"]],
        map_id: "main_1f",
        svg_element_id: "dept-pharmacy"
      },
      {
        facility_name: "화장실",
        nodes: [
          { id: "node-1", x: 450, y: 100, name: "정문" },
          { id: "node-2", x: 450, y: 250, name: "중앙 홀" },
          { id: "node-3", x: 550, y: 250, name: "화장실" }
        ],
        edges: [["node-1", "node-2"], ["node-2", "node-3"]],
        map_id: "main_1f",
        svg_element_id: "facility-restroom"
      }
    ];

    try {
      const result = await this.batchSaveRoutes(defaultRoutes);
      console.log('기본 경로 초기화 완료:', result);
      return result;
    } catch (error) {
      console.error('기본 경로 초기화 실패:', error);
      throw error;
    }
  }
}

export default new FacilityRouteService();