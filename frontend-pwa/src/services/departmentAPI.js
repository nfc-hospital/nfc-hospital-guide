import axiosInstance from './axiosInstance';

/**
 * 진료과/시설 존 관련 API 서비스
 * 비로그인 사용자를 위한 병원 개요 정보 제공
 */
class DepartmentAPI {
  /**
   * 모든 진료과/시설 존 목록 조회
   * @param {Object} filters - 필터 옵션
   * @param {string} filters.type - 'DEPARTMENT' 또는 'FACILITY'
   * @param {string} filters.building - 건물명
   * @param {string} filters.floor - 층수
   * @returns {Promise<Object>} API 응답
   */
  async getDepartmentZones(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.building) params.append('building', filters.building);
      if (filters.floor) params.append('floor', filters.floor);
      
      const queryString = params.toString();
      const url = `/api/v1/navigation/zones/${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosInstance.get(url);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.zones,
          totalCount: response.data.data.total_count
        };
      } else {
        throw new Error(response.data.message || '진료과 정보 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('getDepartmentZones error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || error.message || '진료과 정보 조회 중 오류가 발생했습니다.',
        code: error.response?.data?.code || 'ZONES_FETCH_ERROR'
      };
    }
  }

  /**
   * 특정 진료과/시설 존 상세 정보 조회
   * @param {number} zoneId - 존 ID
   * @returns {Promise<Object>} API 응답
   */
  async getDepartmentZoneDetail(zoneId) {
    try {
      const response = await axiosInstance.get(`/api/v1/navigation/zones/${zoneId}/`);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || '진료과 상세 정보 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('getDepartmentZoneDetail error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || error.message || '진료과 상세 정보 조회 중 오류가 발생했습니다.',
        code: error.response?.data?.code || 'ZONE_DETAIL_ERROR'
      };
    }
  }

  /**
   * 진료과 타입별 그룹화된 데이터 조회
   * @returns {Promise<Object>} 타입별로 그룹화된 진료과 데이터
   */
  async getGroupedDepartmentZones() {
    try {
      const allZones = await this.getDepartmentZones();
      
      const grouped = {
        departments: [],
        facilities: []
      };
      
      allZones.data.forEach(zone => {
        if (zone.zone_type === 'DEPARTMENT') {
          grouped.departments.push(zone);
        } else if (zone.zone_type === 'FACILITY') {
          grouped.facilities.push(zone);
        }
      });
      
      return {
        success: true,
        data: grouped,
        totalCount: allZones.totalCount
      };
    } catch (error) {
      console.error('getGroupedDepartmentZones error:', error);
      throw error;
    }
  }

  /**
   * 자주 찾는 진료과 목록 조회 (display_order 기준)
   * @param {number} limit - 반환할 최대 개수
   * @returns {Promise<Object>} 인기 진료과 목록
   */
  async getPopularDepartments(limit = 6) {
    try {
      const departments = await this.getDepartmentZones({ type: 'DEPARTMENT' });
      
      // display_order가 낮은 순으로 정렬 (이미 백엔드에서 정렬되지만 확실히)
      const sortedDepartments = departments.data
        .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
        .slice(0, limit);
      
      return {
        success: true,
        data: sortedDepartments
      };
    } catch (error) {
      console.error('getPopularDepartments error:', error);
      throw error;
    }
  }

  /**
   * 건물별 진료과 목록 조회
   * @param {string} building - 건물명
   * @returns {Promise<Object>} 해당 건물의 진료과 목록
   */
  async getDepartmentsByBuilding(building) {
    try {
      return await this.getDepartmentZones({ building });
    } catch (error) {
      console.error('getDepartmentsByBuilding error:', error);
      throw error;
    }
  }

  /**
   * 층별 진료과 목록 조회
   * @param {string} building - 건물명
   * @param {string} floor - 층수
   * @returns {Promise<Object>} 해당 층의 진료과 목록
   */
  async getDepartmentsByFloor(building, floor) {
    try {
      return await this.getDepartmentZones({ building, floor });
    } catch (error) {
      console.error('getDepartmentsByFloor error:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const departmentAPI = new DepartmentAPI();

export default departmentAPI;