import React, { useState } from 'react';
import MapNavigator from './MapNavigator';

// 예제: 본관 1층에서 암센터까지 가는 여정
const exampleJourney = {
  title: '정형외과 진료실까지 안내',
  totalStages: 5,
  stages: [
    {
      mapName: 'main_1f',
      title: '본관 1층 로비',
      description: '엘리베이터까지 이동하세요',
      estimatedTime: 2,
      isTransition: false,
      startPoint: { x: 450, y: 50 },  // 로비 위치
      endPoint: { x: 200, y: 300 },   // 엘리베이터 위치
      routeData: {
        nodes: [
          { id: 'node-1', x: 450, y: 50 },
          { id: 'node-2', x: 450, y: 150 },
          { id: 'node-3', x: 350, y: 150 },
          { id: 'node-4', x: 350, y: 300 },
          { id: 'node-5', x: 200, y: 300 }
        ],
        edges: [
          ['node-1', 'node-2'],
          ['node-2', 'node-3'],
          ['node-3', 'node-4'],
          ['node-4', 'node-5']
        ]
      }
    },
    {
      isTransition: true,
      transitionInstruction: '엘리베이터를 타고 2층으로 이동하세요.\n2층 버튼을 누르고 잠시 기다려주세요.'
    },
    {
      mapName: 'main_2f.interactive',
      title: '본관 2층',
      description: '연결 통로까지 이동하세요',
      estimatedTime: 3,
      isTransition: false,
      startPoint: { x: 200, y: 300 },  // 엘리베이터에서 나온 위치
      endPoint: { x: 600, y: 200 },    // 연결 통로 입구
      routeData: {
        nodes: [
          { id: 'node-1', x: 200, y: 300 },
          { id: 'node-2', x: 400, y: 300 },
          { id: 'node-3', x: 400, y: 200 },
          { id: 'node-4', x: 600, y: 200 }
        ],
        edges: [
          ['node-1', 'node-2'],
          ['node-2', 'node-3'],
          ['node-3', 'node-4']
        ]
      }
    },
    {
      isTransition: true,
      transitionInstruction: '연결 통로를 통해 별관으로 이동하세요.\n통로 끝까지 직진하세요.'
    },
    {
      mapName: 'cancer_1f',
      title: '암센터 1층',
      description: '정형외과 진료실까지 이동하세요',
      estimatedTime: 2,
      isTransition: false,
      startPoint: { x: 100, y: 200 },  // 연결 통로에서 나온 위치
      endPoint: { x: 500, y: 400 },    // 정형외과 진료실
      routeData: {
        nodes: [
          { id: 'node-1', x: 100, y: 200 },
          { id: 'node-2', x: 300, y: 200 },
          { id: 'node-3', x: 300, y: 400 },
          { id: 'node-4', x: 500, y: 400 }
        ],
        edges: [
          ['node-1', 'node-2'],
          ['node-2', 'node-3'],
          ['node-3', 'node-4']
        ]
      }
    }
  ]
};

const JourneyNavigator = () => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isJourneyComplete, setIsJourneyComplete] = useState(false);

  const journey = exampleJourney;
  const currentStage = journey.stages[currentStageIndex];
  const progress = ((currentStageIndex + 1) / journey.totalStages) * 100;

  const handleStageComplete = () => {
    if (currentStageIndex < journey.stages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    } else {
      setIsJourneyComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentStageIndex(0);
    setIsJourneyComplete(false);
  };

  // 여정 완료 화면
  if (isJourneyComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-32 h-32 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <span className="text-6xl">✅</span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800">
              도착 완료!
            </h1>
            
            <p className="text-xl text-gray-600">
              정형외과 진료실에 도착했습니다.
            </p>
            
            <div className="pt-4">
              <button
                onClick={handleRestart}
                className="px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                처음으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 여정 진행 화면
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 진행 상황 헤더 */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {journey.title}
            </h1>
            <span className="text-lg text-gray-600">
              {currentStageIndex + 1} / {journey.totalStages} 단계
            </span>
          </div>
          
          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 현재 단계 네비게이터 */}
        <MapNavigator 
          stage={currentStage}
          onStageComplete={handleStageComplete}
        />

        {/* 이전/다음 단계 미리보기 */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              {currentStageIndex > 0 ? (
                <>
                  <span className="font-semibold">이전:</span> {journey.stages[currentStageIndex - 1].title || '이동 안내'}
                </>
              ) : (
                <span>시작 단계</span>
              )}
            </div>
            <div className="text-gray-500 text-right">
              {currentStageIndex < journey.stages.length - 1 ? (
                <>
                  <span className="font-semibold">다음:</span> {journey.stages[currentStageIndex + 1].title || '이동 안내'}
                </>
              ) : (
                <span>마지막 단계</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyNavigator;