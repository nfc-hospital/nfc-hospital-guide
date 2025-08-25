import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, MapIcon, PencilIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import apiService from '../../api/apiService';
import { mapService } from '../../api/mapService';

const MapManager = () => {
  const [mapsData, setMapsData] = useState({
    available_maps: [],
    facility_routes: [],
    department_zones: [],
    hospital_maps: []
  });
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedTab, setSelectedTab] = useState('maps'); // 'maps', 'nodes', 'edges', 'routes'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 지도 데이터 불러오기
  const fetchMapsData = async () => {
    setLoading(true);
    try {
      const response = await mapService.getMaps();
      if (response) {
        setMapsData(response);
        
        // hospital_maps가 없으면 HospitalMap 모델에서 가져오기
        if (!response.hospital_maps || response.hospital_maps.length === 0) {
          try {
            const hospitalMapsResponse = await apiService.navigation.getMapsMetadata();
            if (hospitalMapsResponse?.data) {
              setMapsData(prev => ({
                ...prev,
                hospital_maps: hospitalMapsResponse.data
              }));
            }
          } catch (err) {
            console.log('HospitalMap 데이터 로드 실패:', err);
          }
        }
      }
    } catch (error) {
      console.error('지도 데이터 로드 실패:', error);
    }
    setLoading(false);
  };

  // 노드 데이터 불러오기
  const fetchNodes = async (mapId) => {
    try {
      const response = await apiService.navigation.getNodes(mapId);
      setNodes(response.data || []);
    } catch (error) {
      console.error('노드 데이터 로드 실패:', error);
    }
  };

  // 엣지 데이터 불러오기
  const fetchEdges = async (mapId) => {
    try {
      const response = await apiService.navigation.getEdges(mapId);
      setEdges(response.data || []);
    } catch (error) {
      console.error('엣지 데이터 로드 실패:', error);
    }
  };

  // 경로 데이터 불러오기
  const fetchRoutes = async (mapId) => {
    try {
      const response = await apiService.navigation.getRoutes(mapId);
      setRoutes(response.data || []);
    } catch (error) {
      console.error('경로 데이터 로드 실패:', error);
    }
  };

  // 아이템 저장 핸들러
  const handleSaveItem = async (formData) => {
    try {
      if (editingItem?.type === 'node') {
        if (editingItem.data) {
          // 수정
          await apiService.navigation.updateNode(editingItem.data.node_id, {
            ...formData,
            map: selectedMap.map_id
          });
        } else {
          // 추가
          await apiService.navigation.createNode({
            ...formData,
            map: selectedMap.map_id
          });
        }
        fetchNodes(selectedMap.map_id);
      } else if (editingItem?.type === 'edge') {
        if (editingItem.data) {
          // 수정
          await apiService.navigation.updateEdge(editingItem.data.edge_id, formData);
        } else {
          // 추가
          await apiService.navigation.createEdge(formData);
        }
        fetchEdges(selectedMap.map_id);
      }
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 아이템 삭제 핸들러
  const handleDeleteItem = async (type, id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      if (type === 'node') {
        await apiService.navigation.deleteNode(id);
        fetchNodes(selectedMap.map_id);
      } else if (type === 'edge') {
        await apiService.navigation.deleteEdge(id);
        fetchEdges(selectedMap.map_id);
      } else if (type === 'route') {
        await apiService.navigation.deleteRoute(id);
        fetchRoutes(selectedMap.map_id);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 경로 자동 계산
  const handleCalculateRoute = async () => {
    if (!selectedMap) {
      alert('먼저 지도를 선택해주세요.');
      return;
    }
    
    // 시작 노드와 종료 노드를 선택하는 UI가 필요
    const startNodeId = prompt('시작 노드 ID를 입력하세요:');
    const endNodeId = prompt('종료 노드 ID를 입력하세요:');
    
    if (!startNodeId || !endNodeId) return;
    
    try {
      await apiService.navigation.calculateRoutes({
        start_node_id: startNodeId,
        end_node_id: endNodeId
      });
      fetchRoutes(selectedMap.map_id);
      alert('경로 계산이 완료되었습니다.');
    } catch (error) {
      console.error('경로 계산 실패:', error);
      alert('경로 계산에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchMapsData();
  }, []);

  // 지도 선택 시 노드, 엣지, 경로 로드
  useEffect(() => {
    if (selectedMap?.map_id) {
      fetchNodes(selectedMap.map_id);
      fetchEdges(selectedMap.map_id);
      fetchRoutes(selectedMap.map_id);
    }
  }, [selectedMap]);

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

        {/* 지도 선택 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">지도 선택:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMap?.id || ''}
                onChange={(e) => {
                  const map = mapsData.available_maps.find(m => m.id === e.target.value);
                  setSelectedMap(map);
                }}
              >
                <option value="">지도를 선택하세요</option>
                {mapsData.available_maps.map(map => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
              {selectedMap && (
                <span className="text-sm text-gray-500">
                  ({selectedMap.building} {selectedMap.floor}, 노드: {nodes.length}, 엣지: {edges.length})
                </span>
              )}
            </div>
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              onClick={() => fetchMapsData()}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-4" aria-label="Tabs">
              <button
                onClick={() => setSelectedTab('maps')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'maps'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapIcon className="w-5 h-5 inline-block mr-2" />
                지도 관리
              </button>
              <button
                onClick={() => setSelectedTab('nodes')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'nodes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                노드 관리
              </button>
              <button
                onClick={() => setSelectedTab('edges')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'edges'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                엣지 관리
              </button>
              <button
                onClick={() => setSelectedTab('routes')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'routes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                경로 관리
              </button>
            </nav>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {selectedTab === 'maps' && (
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
                        <div className="relative h-40">
                          {map.svg_url ? (
                            <img 
                              src={map.svg_url} 
                              alt={map.name}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="flex items-center justify-center h-full" style={{ display: map.svg_url ? 'none' : 'flex' }}>
                            <MapIcon className="w-20 h-20 text-gray-400" />
                          </div>
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
                            onClick={() => {
                              setSelectedMap(map);
                              setShowPreview(true);
                            }}
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
        )}

        {/* 노드 관리 탭 */}
        {selectedTab === 'nodes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">노드 관리</h2>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setEditingItem({ type: 'node', data: null });
                  setShowEditModal(true);
                }}
              >
                노드 추가
              </button>
            </div>
            
            <div className="p-4">
              {nodes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">노드명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">좌표</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">연결된 NFC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">접근성</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nodes.map((node) => (
                        <tr key={node.node_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{node.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                              {node.node_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            ({node.x_coord}, {node.y_coord})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {node.nfc_tag || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {node.is_accessible ? '✅' : '❌'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-2"
                              onClick={() => {
                                setEditingItem({ type: 'node', data: node });
                                setShowEditModal(true);
                              }}
                            >
                              수정
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteItem('node', node.node_id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">선택된 지도의 노드가 없습니다</p>
              )}
            </div>
          </div>
        )}

        {/* 엣지 관리 탭 */}
        {selectedTab === 'edges' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">엣지 관리</h2>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setEditingItem({ type: 'edge', data: null });
                  setShowEditModal(true);
                }}
              >
                엣지 추가
              </button>
            </div>
            
            <div className="p-4">
              {edges.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시작 노드</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">종료 노드</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">거리(m)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">소요시간</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">접근성</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {edges.map((edge) => (
                        <tr key={edge.edge_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{edge.from_node_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{edge.to_node_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                              {edge.edge_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{edge.distance}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{edge.walk_time}초</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {edge.is_accessible ? '✅' : '❌'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-2"
                              onClick={() => {
                                setEditingItem({ type: 'edge', data: edge });
                                setShowEditModal(true);
                              }}
                            >
                              수정
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteItem('edge', edge.edge_id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">선택된 지도의 엣지가 없습니다</p>
              )}
            </div>
          </div>
        )}

        {/* 경로 관리 탭 */}
        {selectedTab === 'routes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">경로 관리</h2>
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={handleCalculateRoute}
              >
                경로 자동 계산
              </button>
            </div>
            
            <div className="p-4">
              {routes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경로명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시작점</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">종료점</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경유 노드 수</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총 거리</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">예상 시간</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routes.map((route) => (
                        <tr key={route.route_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.start_point}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.end_point}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.node_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.total_distance}m</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{route.estimated_time}분</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-2"
                              onClick={() => console.log('경로 상세보기', route)}
                            >
                              상세
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">계산된 경로가 없습니다</p>
              )}
            </div>
          </div>
        )}

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
      {selectedMap && showPreview && (
        <MapPreviewModal 
          map={selectedMap} 
          onClose={() => setShowPreview(false)} 
        />
      )}

      {/* 편집 모달 */}
      {showEditModal && (
        <EditModal
          item={editingItem}
          nodes={nodes}
          selectedMap={selectedMap}
          onSave={handleSaveItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

// 편집 모달 컴포넌트
const EditModal = ({ item, nodes, selectedMap, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    node_type: 'junction',
    x_coord: 0,
    y_coord: 0,
    is_accessible: true,
    description: '',
    // 엣지용 필드
    from_node: '',
    to_node: '',
    edge_type: 'corridor',
    distance: 0,
    walk_time: 0,
    is_bidirectional: true,
    ...(item?.data || {})
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">
            {item?.data ? `${item.type === 'node' ? '노드' : '엣지'} 수정` : `새 ${item?.type === 'node' ? '노드' : '엣지'} 추가`}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          {item?.type === 'node' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">노드 이름</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">노드 타입</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.node_type}
                  onChange={(e) => setFormData({...formData, node_type: e.target.value})}
                >
                  <option value="nfc_tag">NFC 태그 위치</option>
                  <option value="exam_room">검사실</option>
                  <option value="elevator">엘리베이터</option>
                  <option value="stairs">계단</option>
                  <option value="restroom">화장실</option>
                  <option value="junction">교차점</option>
                  <option value="entrance">출입구</option>
                  <option value="waiting_area">대기 구역</option>
                  <option value="facility">편의시설</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">X 좌표</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.x_coord}
                    onChange={(e) => setFormData({...formData, x_coord: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Y 좌표</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.y_coord}
                    onChange={(e) => setFormData({...formData, y_coord: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">시작 노드</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.from_node}
                  onChange={(e) => setFormData({...formData, from_node: e.target.value})}
                  required
                >
                  <option value="">선택하세요</option>
                  {nodes.map(node => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">종료 노드</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.to_node}
                  onChange={(e) => setFormData({...formData, to_node: e.target.value})}
                  required
                >
                  <option value="">선택하세요</option>
                  {nodes.map(node => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">엣지 타입</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.edge_type}
                  onChange={(e) => setFormData({...formData, edge_type: e.target.value})}
                >
                  <option value="corridor">복도</option>
                  <option value="elevator">엘리베이터</option>
                  <option value="stairs">계단</option>
                  <option value="escalator">에스컬레이터</option>
                  <option value="outdoor">실외 통로</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">거리 (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.distance}
                    onChange={(e) => setFormData({...formData, distance: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">소요시간 (초)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.walk_time}
                    onChange={(e) => setFormData({...formData, walk_time: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              {item?.type === 'edge' && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.is_bidirectional}
                      onChange={(e) => setFormData({...formData, is_bidirectional: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-700">양방향 통행 가능</span>
                  </label>
                </div>
              )}
            </>
          )}
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.is_accessible}
                onChange={(e) => setFormData({...formData, is_accessible: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700">휠체어 접근 가능</span>
            </label>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MapManager;