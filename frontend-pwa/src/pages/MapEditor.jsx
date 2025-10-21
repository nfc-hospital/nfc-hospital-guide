import React, { useState, useEffect } from 'react';
import MapNodeEditor from '../components/MapNodeEditor';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getAllFacilityRoutes, getFacilityRoute } from '../api/facilityRoutes';

const MapEditor = () => {
  const [mode, setMode] = useState('normal'); // 'normal' or 'demo'
  const [selectedScenario, setSelectedScenario] = useState('');
  const [activeDemoRoute, setActiveDemoRoute] = useState(
    localStorage.getItem('activeDemoRoute') || '시연_P3_로비_채혈실'
  );
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);

  // 🆕 동적 시연 시나리오 관리 (DB 우선, localStorage 폴백)
  const [demoScenarios, setDemoScenarios] = useState([]);

  // 🆕 새 시연 시나리오 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newScenario, setNewScenario] = useState({
    id: '',
    name: '',
    floor: '본관 1층',
    mapId: 'main_1f'
  });

  // 🔄 DB에서 시연 경로 목록 불러오기
  useEffect(() => {
    loadDemoScenariosFromDB();
  }, []);

  const loadDemoScenariosFromDB = async () => {
    setIsLoadingScenarios(true);
    try {
      // 1️⃣ DB에서 모든 경로 가져오기
      const allRoutes = await getAllFacilityRoutes();

      // 2️⃣ "시연_"으로 시작하는 경로만 필터링
      const demoRoutes = allRoutes
        .filter(route => route.facility_name && route.facility_name.startsWith('시연_'))
        .map(route => {
          // metadata에서 정보 추출 (multi-floor 경로)
          const metadata = route.metadata || {};
          const isMultiFloor = metadata.isMultiFloor;

          // 첫 번째 맵 ID 찾기
          let firstMapId = 'main_1f';
          if (isMultiFloor && metadata.maps) {
            firstMapId = Object.keys(metadata.maps)[0] || 'main_1f';
          } else if (route.map_id) {
            firstMapId = route.map_id;
          }

          return {
            id: route.facility_name,
            name: metadata.routeName || route.facility_name.replace('시연_', ''),
            floor: getFloorName(firstMapId),
            mapId: firstMapId,
            isMultiFloor: isMultiFloor,
            mapsCount: isMultiFloor ? Object.keys(metadata.maps || {}).length : 1
          };
        });

      console.log(`✅ DB에서 시연 경로 ${demoRoutes.length}개 로드:`, demoRoutes.map(r => r.id));

      // 3️⃣ DB에서 가져온 경로가 있으면 사용, 없으면 localStorage 폴백
      if (demoRoutes.length > 0) {
        setDemoScenarios(demoRoutes);
      } else {
        // 폴백: localStorage에서 가져오기
        const saved = localStorage.getItem('demoScenarios');
        if (saved) {
          setDemoScenarios(JSON.parse(saved));
          console.log('⚠️ DB에 시연 경로 없음, localStorage 사용');
        } else {
          // 기본 시연 시나리오
          setDemoScenarios([
            { id: '시연_P1_도착_원무과', name: 'P-1: 도착 → 원무과 접수', floor: '본관 1층', mapId: 'main_1f' },
            { id: '시연_P3_로비_채혈실', name: 'P-3: 로비 → 채혈실', floor: '본관 1층', mapId: 'main_1f' },
          ]);
        }
      }
    } catch (error) {
      console.error('❌ DB에서 시연 경로 로드 실패:', error);
      // 에러 시 localStorage 폴백
      const saved = localStorage.getItem('demoScenarios');
      if (saved) {
        setDemoScenarios(JSON.parse(saved));
      }
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  // 맵 ID를 층 이름으로 변환
  const getFloorName = (mapId) => {
    const mapNames = {
      'main_1f': '본관 1층',
      'main_2f': '본관 2층',
      'main_3f': '본관 3층',
      'cancer_1f': '암센터 1층',
      'cancer_2f': '암센터 2층',
      'annex_1f': '별관 1층'
    };
    return mapNames[mapId] || mapId;
  };

  // 🆕 새 시연 시나리오 추가
  const addDemoScenario = () => {
    if (!newScenario.id || !newScenario.name) {
      alert('시나리오 ID와 이름을 입력해주세요!');
      return;
    }

    // ID 중복 체크
    if (demoScenarios.some(s => s.id === newScenario.id)) {
      alert('이미 존재하는 시나리오 ID입니다!');
      return;
    }

    setDemoScenarios([...demoScenarios, newScenario]);
    setNewScenario({ id: '', name: '', floor: '본관 1층', mapId: 'main_1f' });
    setShowAddForm(false);
    alert(`✅ 시연 시나리오 "${newScenario.name}" 추가 완료!`);
  };

  // 🆕 시연 경로 활성화 (DB → localStorage)
  const activateDemoScenario = async (scenarioId) => {
    try {
      // DB에서 경로 데이터 가져오기
      const routeData = await getFacilityRoute(scenarioId);

      if (!routeData) {
        alert('❌ 경로 데이터를 찾을 수 없습니다.');
        return;
      }

      // localStorage에 저장
      const facilityRoutes = JSON.parse(localStorage.getItem('facilityRoutes') || '{}');
      facilityRoutes[scenarioId] = routeData.maps ? {
        maps: routeData.maps,
        currentMap: routeData.currentMap || Object.keys(routeData.maps)[0],
        lastUpdated: new Date().toISOString()
      } : {
        nodes: routeData.nodes || [],
        edges: routeData.edges || [],
        mapId: routeData.map_id || 'main_1f',
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('facilityRoutes', JSON.stringify(facilityRoutes));

      // activeDemoRoute 설정
      localStorage.setItem('activeDemoRoute', scenarioId);
      setActiveDemoRoute(scenarioId);

      alert(`✅ "${demoScenarios.find(s => s.id === scenarioId)?.name}" 경로가 활성화되었습니다!\n\n/home 페이지에서 시연 경로를 확인할 수 있습니다.`);
    } catch (error) {
      console.error('❌ 시연 경로 활성화 실패:', error);
      alert(`❌ 경로 활성화 실패: ${error.message}`);
    }
  };

  // 🆕 시연 경로 비활성화
  const deactivateDemoScenario = () => {
    localStorage.removeItem('activeDemoRoute');
    setActiveDemoRoute('');
    alert('✅ 시연 경로가 비활성화되었습니다!\n\n이제 목적지 이름으로 자동 경로 검색이 작동합니다.');
  };

  // 🆕 시연 시나리오 삭제
  const deleteDemoScenario = (id) => {
    if (confirm(`시연 시나리오 "${demoScenarios.find(s => s.id === id)?.name}"를 삭제하시겠습니까?`)) {
      setDemoScenarios(demoScenarios.filter(s => s.id !== id));

      // 활성 경로가 삭제되면 초기화
      if (activeDemoRoute === id) {
        setActiveDemoRoute('');
        localStorage.removeItem('activeDemoRoute');
      }

      // 선택된 시나리오가 삭제되면 초기화
      if (selectedScenario === id) {
        setSelectedScenario('');
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">맵 경로 편집기</h1>
        
        {/* 모드 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => {
                setMode('normal');
                setSelectedScenario('');
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'normal' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              일반 시설 경로
            </button>
            <button
              onClick={() => setMode('demo')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'demo' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🎬 시연용 경로
            </button>
          </div>
          
          {mode === 'demo' && (
            <>
              {/* 현재 활성 시연 경로 표시 */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-green-800">현재 /home에서 사용 중인 시연 경로:</span>
                    <span className="ml-2 text-sm font-bold text-green-900">
                      {demoScenarios.find(s => s.id === activeDemoRoute)?.name || '선택되지 않음'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedScenario) {
                        localStorage.setItem('activeDemoRoute', selectedScenario);
                        setActiveDemoRoute(selectedScenario);
                        alert(`'${demoScenarios.find(s => s.id === selectedScenario)?.name}' 경로가 /home 시연 버튼에 적용되었습니다.`);
                      } else {
                        alert('먼저 시나리오를 선택해주세요.');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    선택한 경로를 /home에 적용
                  </button>
                </div>
              </div>

              {/* 🆕 시연 시나리오 추가 폼 */}
              {showAddForm && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-md font-semibold mb-3">🆕 새 시연 시나리오 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">시나리오 ID *</label>
                      <input
                        type="text"
                        value={newScenario.id}
                        onChange={(e) => setNewScenario({ ...newScenario, id: e.target.value })}
                        placeholder="예: 시연_P8_검사실_MRI"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">시나리오 이름 *</label>
                      <input
                        type="text"
                        value={newScenario.name}
                        onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                        placeholder="예: P-8: 검사실 → MRI"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">층 정보</label>
                      <input
                        type="text"
                        value={newScenario.floor}
                        onChange={(e) => setNewScenario({ ...newScenario, floor: e.target.value })}
                        placeholder="예: 본관 2층"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">지도 ID</label>
                      <select
                        value={newScenario.mapId}
                        onChange={(e) => setNewScenario({ ...newScenario, mapId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="main_1f">본관 1층</option>
                        <option value="main_2f">본관 2층</option>
                        <option value="main_3f">본관 3층</option>
                        <option value="cancer_1f">암센터 1층</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={addDemoScenario}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      ✅ 추가
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewScenario({ id: '', name: '', floor: '본관 1층', mapId: 'main_1f' });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                    >
                      ✕ 취소
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">시연 시나리오 선택</h2>
                  {isLoadingScenarios && (
                    <span className="text-sm text-gray-500">🔄 DB에서 로딩 중...</span>
                  )}
                  {!isLoadingScenarios && demoScenarios.length > 0 && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ DB에서 {demoScenarios.length}개 로드됨
                    </span>
                  )}
                </div>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    새 시나리오 추가
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {demoScenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      selectedScenario === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : activeDemoRoute === scenario.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedScenario(scenario.id)}
                      className="w-full text-left"
                    >
                      <div className="font-semibold text-sm">{scenario.name}</div>
                      <div className="text-xs text-gray-600">
                        {scenario.floor}
                        {scenario.isMultiFloor && ` • ${scenario.mapsCount}개 맵`}
                      </div>
                      {activeDemoRoute === scenario.id && (
                        <div className="text-xs text-green-600 font-bold mt-1">✓ 활성화됨</div>
                      )}
                    </button>

                    {/* 🆕 활성화/비활성화 토글 버튼 */}
                    {activeDemoRoute === scenario.id ? (
                      <button
                        onClick={deactivateDemoScenario}
                        className="mt-2 w-full px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                        title="이 경로를 비활성화 (자동 검색 모드로 전환)"
                      >
                        ❌ 비활성화
                      </button>
                    ) : (
                      <button
                        onClick={() => activateDemoScenario(scenario.id)}
                        className="mt-2 w-full px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                        title="이 경로를 /home에 활성화"
                      >
                        🚀 활성화
                      </button>
                    )}

                    {/* 🆕 삭제 버튼 (기본 시나리오가 아닌 경우만) */}
                    {!scenario.id.startsWith('시연_P') && (
                      <button
                        onClick={() => deleteDemoScenario(scenario.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="삭제"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 사용법 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            {mode === 'demo' ? '🎬 시연용 경로 그리기 가이드' : '📝 노드 편집 방법'}
          </h3>

          {mode === 'demo' ? (
            <div className="text-sm text-yellow-700 space-y-2">
              <div className="font-semibold">✨ 새 시연 시나리오 만들기</div>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>"새 시나리오 추가" 버튼 클릭 → 시나리오 정보 입력</li>
                <li>추가된 시나리오 선택 → MapNodeEditor에서 경로 그리기</li>
                <li>지도 클릭하여 노드 추가, 노드 연결하기</li>
                <li>"경로 저장 및 코드 생성" 버튼 클릭</li>
                <li>"/home에 적용" 버튼으로 활성화</li>
              </ol>

              <div className="mt-3 pt-3 border-t border-yellow-300">
                <div className="font-semibold mb-1">💡 Tip</div>
                <ul className="space-y-1">
                  <li>• 여러 층 경로: "맵 전환 노드" 설정으로 층간 이동 표현</li>
                  <li>• 자동 정렬: 노드 2개 이상 선택 후 "자동 정렬(90도)" 버튼</li>
                </ul>
              </div>
            </div>
          ) : (
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 지도 클릭: 새 노드 추가</li>
              <li>• 노드 클릭 → 다른 노드 클릭: 연결선 생성</li>
              <li>• 노드 우클릭: 삭제</li>
              <li>• 저장: 시설 경로로 저장됨</li>
            </ul>
          )}
        </div>
        
        {/* 맵 에디터 */}
        {mode === 'normal' ? (
          // 일반 모드: 기존처럼 시설 선택 가능
          <MapNodeEditor key="normal-mode" />
        ) : (
          // 시연 모드: 선택된 시나리오에 맞는 에디터
          selectedScenario ? (
            <MapNodeEditor 
              facilityName={selectedScenario}
              mapId={demoScenarios.find(s => s.id === selectedScenario)?.mapId} 
              key={selectedScenario} 
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">시나리오를 선택해주세요</h3>
              <p className="text-gray-600">위의 시연 시나리오 중 하나를 선택하여 경로를 그려주세요.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MapEditor;