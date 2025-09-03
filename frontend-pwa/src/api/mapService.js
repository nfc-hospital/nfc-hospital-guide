/**
 * 지도 및 경로 관련 API 서비스
 */
import { api } from './client';

export const mapService = {
  /**
   * 모든 지도 정보 조회
   * @returns {Promise} 지도 데이터 (available_maps, facility_routes, department_zones 등)
   */
  async getMaps() {
    try {
      const response = await api.get('/test/maps/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch maps:', error);
      throw error;
    }
  },

  /**
   * 특정 시설의 경로 정보 조회
   * @param {string} facilityName - 시설 이름
   * @returns {Promise} 경로 데이터
   */
  async getFacilityRoute(facilityName) {
    try {
      const response = await api.get(`/test/facility-route/${encodeURIComponent(facilityName)}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch route for ${facilityName}:`, error);
      throw error;
    }
  },

  /**
   * 시설 경로 저장/업데이트
   * @param {Object} routeData - 경로 데이터
   * @returns {Promise} 저장 결과
   */
  async saveFacilityRoute(routeData) {
    try {
      const response = await api.post('/test/save-facility-route/', routeData);
      return response.data;
    } catch (error) {
      console.error('Failed to save facility route:', error);
      throw error;
    }
  },

  /**
   * [삭제 예정] 지도 SVG 파일 URL 생성 (이제 사용하지 않음)
   * @deprecated API를 통해 SVG 내용을 직접 가져오는 방식으로 변경되었습니다.
   * @param {string} mapId - 지도 ID (예: main_1f, cancer_2f)
   * @returns {string} SVG 파일 URL
   */
  getMapSvgUrl(mapId) {
    console.warn("getMapSvgUrl is deprecated. Use getMapSvgContent instead.");
    return `/images/maps/${mapId}.svg`;
  },

  /**
   * [삭제 예정] Interactive 지도 SVG 파일 URL 생성 (이제 사용하지 않음)
   * @deprecated API를 통해 SVG 내용을 직접 가져오는 방식으로 변경되었습니다.
   * @param {string} mapId - 지도 ID
   * @returns {string} Interactive SVG 파일 URL
   */
  getInteractiveMapSvgUrl(mapId) {
    console.warn("getInteractiveMapSvgUrl is deprecated. Use getMapSvgContent instead.");
    return `/images/maps/${mapId}.interactive.svg`;
  },

  /**
   * [신규] API를 통해 지도 SVG 내용을 직접 가져옵니다.
   * @param {string} mapName - 지도 파일 이름 (예: main_1f.svg)
   * @returns {Promise<string>} SVG 파일의 텍스트 내용
   */
  async getMapSvgContent(mapName) {
    try {
      // 기존 'api' 클라이언트를 사용합니다.
      const response = await api.get(`/maps/${mapName}/`, {
        responseType: 'text',
      });
      return response;
    } catch (error) {
      console.error(`Error fetching SVG content for map: ${mapName}`, error);
      return '<svg viewBox="0 0 100 100"><text x="10" y="50">Map not found</text></svg>';
    }
  },

  /**
   * 지도 ID로 건물과 층 정보 추출
   * @param {string} mapId - 지도 ID
   * @returns {Object} {building, floor}
   */
  parseMapId(mapId) {
    const mapInfo = {
      'main_1f': { building: '본관', floor: '1층' },
      'main_2f': { building: '본관', floor: '2층' },
      'cancer_1f': { building: '암센터', floor: '1층' },
      'cancer_2f': { building: '암센터', floor: '2층' },
      'annex_1f': { building: '별관', floor: '1층' },
      'overview_main_1f': { building: '본관', floor: '1층' },
      'overview_main_2f': { building: '본관', floor: '2층' },
      'overview_cancer_2f': { building: '암센터', floor: '2층' }
    };
    
    return mapInfo[mapId] || { building: '알 수 없음', floor: '알 수 없음' };
  }
};

export default mapService;