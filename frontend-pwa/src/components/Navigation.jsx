import React, { useState } from 'react';
import Typography from './common/Typography';
import Button from './common/Button';
import useJourneyStore from '../store/journeyStore';

const AccessibilityOptions = ({ options, onChange }) => (
  <div className="bg-white rounded-xl p-4 mb-6">
    <Typography variant="h4" className="mb-4">
      이동 옵션
    </Typography>
    <div className="space-y-4">
      <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
        <div className="flex items-center">
          <span className="text-2xl mr-2" role="img" aria-hidden="true">
            👨‍🦽
          </span>
          <Typography>휠체어 경로</Typography>
        </div>
        <input
          type="checkbox"
          checked={options.wheelchair}
          onChange={(e) => onChange({ ...options, wheelchair: e.target.checked })}
          className="w-6 h-6 rounded text-primary-blue focus:ring-primary-blue"
        />
      </label>
      <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
        <div className="flex items-center">
          <span className="text-2xl mr-2" role="img" aria-hidden="true">
            🔊
          </span>
          <Typography>상세 음성 안내</Typography>
        </div>
        <input
          type="checkbox"
          checked={options.voiceGuide}
          onChange={(e) => onChange({ ...options, voiceGuide: e.target.checked })}
          className="w-6 h-6 rounded text-primary-blue focus:ring-primary-blue"
        />
      </label>
    </div>
  </div>
);

const NavigationStep = ({ number, icon, text, distance, time, isCurrent, isCompleted }) => (
  <div
    className={`
      relative flex items-start p-4 rounded-lg
      ${isCurrent ? 'bg-primary-blue-light' : isCompleted ? 'bg-gray-50' : 'bg-white'}
    `}
  >
    <div className="mr-4">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-lg
          ${isCurrent ? 'bg-primary-blue text-white' : isCompleted ? 'bg-success-green text-white' : 'bg-gray-200'}
        `}
      >
        {isCompleted ? '✓' : number}
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2" role="img" aria-hidden="true">
          {icon}
        </span>
        <Typography variant="body1" className="flex-1">
          {text}
        </Typography>
      </div>
      <div className="flex items-center text-gray-500">
        <Typography variant="caption" className="mr-4">
          {distance}
        </Typography>
        <Typography variant="caption">
          {time}
        </Typography>
      </div>
    </div>
    <Button
      variant="secondary"
      icon="🔊"
      size="small"
      onClick={() => {}}
      ariaLabel="음성으로 듣기"
    />
  </div>
);

const Navigation = () => {
  const [accessibilityOptions, setAccessibilityOptions] = useState({
    wheelchair: false,
    voiceGuide: false,
  });

  // journeyStore에서 현재 위치 정보 가져오기
  const { currentLocation, taggedLocationInfo } = useJourneyStore();
  
  // 현재 위치 표시 로직
  const getCurrentLocationText = () => {
    if (taggedLocationInfo) {
      return `${taggedLocationInfo.building || ''} ${taggedLocationInfo.floor || ''}층 ${taggedLocationInfo.room || ''}`.trim();
    }
    if (currentLocation) {
      return `${currentLocation.building || ''} ${currentLocation.floor || ''}층 ${currentLocation.room || ''}`.trim();
    }
    return '위치를 확인 중...';
  };

  const navigationSteps = [
    {
      number: 1,
      icon: '🚶‍♂️',
      text: '1층 로비에서 우측 엘리베이터로 이동',
      distance: '20m',
      time: '약 1분',
      isCompleted: true,
    },
    {
      number: 2,
      icon: '🛗',
      text: '엘리베이터를 타고 3층으로 이동',
      distance: '',
      time: '약 2분',
      isCurrent: true,
    },
    {
      number: 3,
      icon: '🚶‍♂️',
      text: '3층 복도를 따라 304호로 이동',
      distance: '30m',
      time: '약 1분',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Typography variant="h1" className="mb-8">
          길 안내
        </Typography>

        <AccessibilityOptions
          options={accessibilityOptions}
          onChange={setAccessibilityOptions}
        />

        <div className="bg-white rounded-xl p-6 mb-8">
          <div className="aspect-w-4 aspect-h-3 mb-6">
            <div className="bg-gray-100 rounded-lg w-full h-full flex items-center justify-center">
              {/* 3D 아이소메트릭 지도가 들어갈 자리 */}
              <Typography variant="body1" color="secondary">
                3D 지도 영역
              </Typography>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <Typography variant="h3">
              현재 위치: {getCurrentLocationText()}
            </Typography>
            <Button
              variant="secondary"
              icon="🔄"
              onClick={() => {}}
              ariaLabel="현재 위치 새로고침"
            >
              새로고침
            </Button>
          </div>

          <Typography variant="body2" color="secondary" className="mb-6">
            목적지: 3층 304호 X-ray실
          </Typography>

          <div className="space-y-4">
            {navigationSteps.map((step) => (
              <NavigationStep key={step.number} {...step} />
            ))}
          </div>
        </div>

        <div className="fixed bottom-4 right-4">
          <Button
            variant="primary"
            icon="🎯"
            size="large"
            onClick={() => {}}
            ariaLabel="AR 내비게이션 시작"
          >
            AR 내비게이션
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navigation; 