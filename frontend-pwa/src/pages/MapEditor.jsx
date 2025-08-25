import React, { useState } from 'react';
import MapNodeEditor from '../components/MapNodeEditor';

const MapEditor = () => {
  const [mode, setMode] = useState('normal'); // 'normal' or 'demo'
  const [selectedScenario, setSelectedScenario] = useState('');
  
  // 시연용 시나리오별 맵 선택
  const demoScenarios = [
    { id: '시연_P1_도착_원무과', name: 'P-1: 도착 → 원무과 접수', floor: '본관 1층', mapId: 'main_1f' },
    { id: '시연_P3_로비_채혈실', name: 'P-3: 로비 → 채혈실', floor: '본관 1층', mapId: 'main_1f' },
    { id: '시연_P4_채혈실_대기실', name: 'P-4: 채혈실 대기실', floor: '본관 1층', mapId: 'main_1f' },
    { id: '시연_P6_채혈실_소변검사실', name: 'P-6: 채혈실 → 소변검사실', floor: '본관 1층', mapId: 'main_1f' },
    { id: '시연_P6_소변검사실_엑스레이', name: 'P-6: 소변검사실 → X-ray', floor: '본관 2층', mapId: 'main_2f' },
    { id: '시연_P7_수납창구', name: 'P-7: 수납창구', floor: '본관 1층', mapId: 'main_1f' },
    { id: '시연_P7_수납_정문', name: 'P-7: 수납 → 정문', floor: '본관 1층', mapId: 'main_1f' },
  ];
  
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
              <h2 className="text-lg font-semibold mb-3">시연 시나리오 선택</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {demoScenarios.map((scenario, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedScenario === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">{scenario.name}</div>
                    <div className="text-xs text-gray-600">{scenario.floor}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 사용법 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-yellow-800 mb-2">📝 노드 편집 방법</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 지도 클릭: 새 노드 추가</li>
            <li>• 노드 클릭 → 다른 노드 클릭: 연결선 생성</li>
            <li>• 노드 우클릭: 삭제</li>
            <li>• 저장: 시연용 경로로 저장됨</li>
          </ul>
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