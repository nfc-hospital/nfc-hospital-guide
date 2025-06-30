import React from 'react';
import Typography from './common/Typography';
import Button from './common/Button';

const CircularProgress = ({ value, maxValue = 100, size = 200, strokeWidth = 8, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / maxValue) * 100;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* 배경 원 */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* 진행 원 */}
        <circle
          className="text-primary-blue transition-all duration-500 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

const CheckItem = ({ text, completed, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center p-4 rounded-lg transition-all duration-200
      ${completed ? 'bg-success-green/10' : 'bg-gray-50'}
    `}
  >
    <span
      className={`
        flex items-center justify-center w-8 h-8 rounded-full mr-3
        ${completed ? 'bg-success-green text-white' : 'bg-gray-200'}
      `}
    >
      {completed ? '✓' : icon}
    </span>
    <Typography
      variant="body1"
      className={completed ? 'line-through text-gray-500' : ''}
    >
      {text}
    </Typography>
  </button>
);

const WaitingStatus = () => {
  const waitingInfo = {
    position: 3,
    totalWaiting: 8,
    estimatedTime: 15,
    examName: 'X-ray 검사',
    location: '본관 3층 304호',
    preparations: [
      { id: 1, text: '금속 제거하기', icon: '⚠️', completed: true },
      { id: 2, text: '검사복으로 갈아입기', icon: '👕', completed: false },
      { id: 3, text: '접수증 지참하기', icon: '📄', completed: true },
      { id: 4, text: '보호자 동행 확인', icon: '👥', completed: false },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Typography variant="h1" className="mb-8">
          대기 현황
        </Typography>

        <div className="bg-white rounded-xl p-6 mb-8">
          <div className="flex flex-col items-center mb-8">
            <CircularProgress value={waitingInfo.position} maxValue={waitingInfo.totalWaiting}>
              <div className="text-center">
                <Typography variant="h2" className="text-primary-blue mb-1">
                  {waitingInfo.position}명
                </Typography>
                <Typography variant="body2" color="secondary">
                  앞에 대기
                </Typography>
              </div>
            </CircularProgress>

            <div className="mt-6 text-center">
              <Typography variant="h3" className="mb-2">
                예상 대기 시간
              </Typography>
              <Typography variant="h4" color="secondary">
                약 {waitingInfo.estimatedTime}분
              </Typography>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <Typography variant="h3" className="mb-4">
              {waitingInfo.examName}
            </Typography>
            <Typography variant="body2" color="secondary" className="flex items-center mb-6">
              <span className="text-xl mr-2" role="img" aria-label="위치">
                📍
              </span>
              {waitingInfo.location}
            </Typography>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6">
          <Typography variant="h3" className="mb-6">
            준비사항 체크리스트
          </Typography>
          
          <div className="space-y-3">
            {waitingInfo.preparations.map((prep) => (
              <CheckItem
                key={prep.id}
                text={prep.text}
                completed={prep.completed}
                icon={prep.icon}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="fixed bottom-4 right-4 flex gap-4">
          <Button
            variant="secondary"
            icon="🔔"
            size="large"
            onClick={() => {}}
            ariaLabel="알림 설정"
          >
            알림 받기
          </Button>
          <Button
            variant="primary"
            icon="🔊"
            size="large"
            onClick={() => {}}
            ariaLabel="음성 안내 듣기"
          >
            음성 안내
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WaitingStatus; 