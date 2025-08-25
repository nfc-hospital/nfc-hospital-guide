import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, MapIcon, PencilIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import apiService from '../../api/apiService';

const MapManager = () => {
  const [mapsData, setMapsData] = useState({
    available_maps: [],
    facility_routes: [],
    department_zones: [],
    hospital_maps: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // 지도 데이터 불러오기
  const fetchMapsData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getMaps();
      if (response.success) {
        setMapsData(response.data);
      }
    } catch (error) {
      console.error('지도 데이터 로드 실패:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMapsData();
  }, []);

  // 지도 미리보기 모달
  const MapPreviewModal = ({ map, onClose }) => {
    if (!map) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">{map.name}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-auto">
            <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              {map.svg_url ? (
                <img 
                  src={map.svg_url} 
                  alt={map.name}
                  className="max-w-full h-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <div style={{ display: 'none' }} className="text-gray-500 text-center">
                <MapIcon className="w-20 h-20 mx-auto mb-2" />
                <p>지도 이미지를 불러올 수 없습니다</p>
                <p className="text-sm mt-2">{map.svg_url}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">지도 정보</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex">
                    <dt className="font-medium w-20">ID:</dt>
                    <dd className="text-gray-600">{map.id}</dd>
                  </div>
                  <div className="flex">
                    <dt className="font-medium w-20">건물:</dt>
                    <dd className="text-gray-600">{map.building}</dd>
                  </div>
                  <div className="flex">
                    <dt className="font-medium w-20">층:</dt>
                    <dd className="text-gray-600">{map.floor}</dd>
                  </div>
                  <div className="flex">
                    <dt className="font-medium w-20">타입:</dt>
                    <dd className="text-gray-600">{map.type}</dd>
                  </div>
                </dl>
              </div>
              
              {/* 연결된 경로 정보 */}
              <div>
                <h4 className="font-semibold mb-2">연결된 경로</h4>
                <div className="text-sm space-y-1">
                  {mapsData.facility_routes
                    .filter(route => route.map_id === map.id)
                    .map(route => (
                      <div key={route.facility_name} className="flex items-center gap-2">
                        <span className="text-blue-600">📍</span>
                        <span>{route.facility_name}</span>
                        <span className="text-gray-400 text-xs">
                          (노드 {route.nodes?.length || 0}개)
                        </span>
                      </div>
                    ))}
                  {mapsData.facility_routes.filter(route => route.map_id === map.id).length === 0 && (
                    <p className="text-gray-400">연결된 경로 없음</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/admin/test-data"
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">지도 관리</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchMapsData}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="새로고침"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
              <Link
                to="/map-editor"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                경로 편집기
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-blue-600">
              {mapsData.available_maps.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">사용 가능한 지도</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">
              {mapsData.facility_routes.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">등록된 경로</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-purple-600">
              {mapsData.department_zones.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">진료과/시설</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-orange-600">
              {mapsData.hospital_maps.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">DB 저장 지도</div>
          </div>
        </div>

        {/* 지도 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">지도 목록</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4">지도 데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mapsData.available_maps.map((map) => {
                  const routes = mapsData.facility_routes.filter(r => r.map_id === map.id);
                  const zones = mapsData.department_zones.filter(z => 
                    z.building === map.building && z.floor === map.floor.replace('층', 'F')
                  );
                  
                  return (
                    <div key={map.id} className="border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-lg overflow-hidden">
                        <div className="flex items-center justify-center h-40">
                          <MapIcon className="w-20 h-20 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{map.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {map.building} · {map.floor}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-gray-500">
                            타입: <span className="font-medium">
                              {map.type === 'overview' ? '개요도' : '층별 지도'}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            경로: <span className="font-medium">{routes.length}개</span>
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedMap(map)}
                            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            미리보기
                          </button>
                          <Link
                            to={`/map-editor?mapId=${map.id}`}
                            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                          >
                            <PencilIcon className="w-4 h-4" />
                            편집
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 시설 경로 목록 */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">등록된 시설 경로</h2>
          </div>
          
          <div className="p-4">
            {mapsData.facility_routes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        시설명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        지도
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        노드/엣지
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        수정일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mapsData.facility_routes.map((route) => {
                      const mapInfo = mapsData.available_maps.find(m => m.id === route.map_id);
                      return (
                        <tr key={route.facility_name}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{route.facility_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {mapInfo?.name || route.map_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              노드 {route.nodes?.length || 0}개 / 엣지 {route.edges?.length || 0}개
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {new Date(route.updated_at).toLocaleDateString('ko-KR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              to={`/map-editor?facility=${encodeURIComponent(route.facility_name)}`}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              편집
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapIcon className="w-12 h-12 mx-auto mb-2" />
                <p>등록된 경로가 없습니다</p>
                <Link
                  to="/map-editor"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  경로 편집기로 이동
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지도 미리보기 모달 */}
      {selectedMap && (
        <MapPreviewModal 
          map={selectedMap} 
          onClose={() => setSelectedMap(null)} 
        />
      )}
    </div>
  );
};

export default MapManager;