import React, { useState, useEffect } from 'react';
import MapNodeEditor from '../components/MapNodeEditor';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const MapEditor = () => {
  const [mode, setMode] = useState('normal'); // 'normal' or 'demo'
  const [selectedScenario, setSelectedScenario] = useState('');
  const [activeDemoRoute, setActiveDemoRoute] = useState(
    localStorage.getItem('activeDemoRoute') || '시연_P3_로비_채혈실'
  );

  // 🆕 동적 시연 시나리오 관리
  const [demoScenarios, setDemoScenarios] = useState(() => {
    const saved = localStorage.getItem('demoScenarios');
    if (saved) {
      return JSON.parse(saved);
    }
    // 기본 시연 시나리오
    return [
      { id: '시연_P1_도착_원무과', name: 'P-1: 도착 → 원무과 접수', floor: '본관 1층', mapId: 'main_1f' },
      { id: '시연_P3_로비_채혈실', name: 'P-3: 로비 → 채혈실', floor: '본관 1층', mapId: 'main_1f' },
      { id: '시연_P4_채혈실_대기실', name: 'P-4: 채혈실 대기실', floor: '본관 1층', mapId: 'main_1f' },
      { id: '시연_P6_채혈실_소변검사실', name: 'P-6: 채혈실 → 소변검사실', floor: '본관 1층', mapId: 'main_1f' },
      { id: '시연_P6_소변검사실_엑스레이', name: 'P-6: 소변검사실 → X-ray', floor: '본관 2층', mapId: 'main_2f' },
      { id: '시연_P7_수납창구', name: 'P-7: 수납창구', floor: '본관 1층', mapId: 'main_1f' },
      { id: '시연_P7_수납_정문', name: 'P-7: 수납 → 정문', floor: '본관 1층', mapId: 'main_1f' },
    ];
  });

  // 🆕 새 시연 시나리오 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newScenario, setNewScenario] = useState({
    id: '',
    name: '',
    floor: '본관 1층',
    mapId: 'main_1f'
  });

  // localStorage에 시연 시나리오 저장
  useEffect(() => {
    localStorage.setItem('demoScenarios', JSON.stringify(demoScenarios));
  }, [demoScenarios]);

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
                <h2 className="text-lg font-semibold">시연 시나리오 선택</h2>
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
                      <div className="text-xs text-gray-600">{scenario.floor}</div>
                      {activeDemoRoute === scenario.id && (
                        <div className="text-xs text-green-600 font-bold mt-1">✓ 활성</div>
                      )}
                    </button>

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