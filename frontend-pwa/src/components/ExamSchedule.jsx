import React from 'react';
import Typography from './common/Typography';
import Button from './common/Button';

const StatusBadge = ({ status, text }) => {
  const statusStyles = {
    waiting: 'bg-gray-100 text-gray-600',
    current: 'bg-primary-blue-light text-primary-blue',
    completed: 'bg-success-green/10 text-success-green',
  };

  const statusIcons = {
    waiting: '⏳',
    current: '🔄',
    completed: '✅',
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusStyles[status]}`}>
      <span className="mr-1" role="img" aria-hidden="true">
        {statusIcons[status]}
      </span>
      <Typography variant="caption" component="span">
        {text}
      </Typography>
    </div>
  );
};

const WarningTag = ({ icon, text, priority = 'normal' }) => {
  const priorityStyles = {
    high: 'bg-danger-red/10 text-danger-red',
    normal: 'bg-warning-orange/10 text-warning-orange',
    info: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={`flex items-center p-2 rounded-lg ${priorityStyles[priority]}`}>
      <span className="text-xl mr-2" role="img" aria-hidden="true">
        {icon}
      </span>
      <Typography variant="caption">{text}</Typography>
    </div>
  );
};

const TimelineStep = ({ step, isCompleted, isCurrent }) => (
  <div className="flex items-center mb-4">
    <div
      className={`
        w-8 h-8 rounded-full flex items-center justify-center mr-4
        ${isCompleted ? 'bg-success-green text-white' : isCurrent ? 'bg-primary-blue text-white' : 'bg-gray-200'}
      `}
    >
      {isCompleted ? '✓' : step}
    </div>
    <div className="flex-1 h-1 bg-gray-200">
      <div
        className={`h-full ${isCompleted ? 'bg-success-green' : ''}`}
        style={{ width: isCompleted ? '100%' : '0%' }}
      />
    </div>
  </div>
);

const ProgressBar = ({ current, total }) => (
  <div className="mb-8">
    <div className="flex justify-between items-center mb-2">
      <span className="text-lg font-semibold text-text-primary">진행 상황</span>
      <span className="text-lg font-bold text-primary-blue">{current}/{total}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className="bg-gradient-to-r from-primary-blue to-success-green h-3 rounded-full transition-all duration-500"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  </div>
);

const ExamCard = ({ exam, status }) => {
  const statusConfig = {
    completed: {
      bg: 'bg-green-50 border-success-green border-2',
      badge: 'bg-success-green text-white',
      icon: '✅',
      label: '완료'
    },
    current: {
      bg: 'bg-primary-blue-light border-primary-blue border-2 ring-2 ring-primary-blue-light',
      badge: 'bg-primary-blue text-white animate-pulse',
      icon: '🔄',
      label: '진행 중'
    },
    pending: {
      bg: 'bg-gray-50 border-gray-200 border-2',
      badge: 'bg-gray-400 text-white',
      icon: '⏳',
      label: '대기 중'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`${config.bg} rounded-2xl p-6 mb-4 shadow-lg relative`}>
      {/* 상태 배지 */}
      <div className="flex justify-between items-start mb-4">
        <div className={`${config.badge} px-4 py-2 rounded-full font-bold text-lg flex items-center gap-2`}>
          <span className="text-xl">{config.icon}</span>
          {config.label}
        </div>
        <div className="text-right">
          <div className="text-sm text-text-secondary">예상 시간</div>
          <div className="text-xl font-bold text-text-primary">{exam.duration}분</div>
        </div>
      </div>

      {/* 검사 정보 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-md">
          <span className="text-3xl">{exam.icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-text-primary mb-1">{exam.title}</h3>
          <div className="flex items-center text-text-secondary text-lg">
            <span className="mr-2">📍</span>
            <span>{exam.location}</span>
          </div>
        </div>
      </div>

      {/* 준비사항 */}
      <div className="space-y-2 mb-6">
        {exam.preparations.map((prep, index) => (
          <div key={index} className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-100">
            <span className="text-xl mr-3">{prep.icon}</span>
            <span className="text-lg text-text-primary">{prep.text}</span>
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      {status === 'current' && (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-primary">
            <span>🧭</span>
            길 안내
          </button>
          <button className="btn btn-secondary">
            <span>🔊</span>
            음성 안내
          </button>
        </div>
      )}
    </div>
  );
};

const ExamSchedule = () => {
  const exams = [
    {
      id: 1,
      title: '심전도 검사',
      icon: '💓',
      location: '본관 2층 204호',
      duration: 15,
      preparations: [
        { icon: '⚠️', text: '금속 제거 필수' },
        { icon: '👕', text: '편안한 복장' }
      ],
      status: 'completed'
    },
    {
      id: 2,
      title: 'X-ray 검사',
      icon: '🩻',
      location: '본관 3층 304호',
      duration: 10,
      preparations: [
        { icon: '⚠️', text: '금속 제거 필수' },
        { icon: '👔', text: '검사복 착용' }
      ],
      status: 'current'
    },
    {
      id: 3,
      title: '혈액 검사',
      icon: '🩸',
      location: '신관 2층 209호',
      duration: 5,
      preparations: [
        { icon: '🚫', text: '8시간 금식' },
        { icon: '💧', text: '물 섭취 가능' }
      ],
      status: 'pending'
    }
  ];

  const completedCount = exams.filter(exam => exam.status === 'completed').length;

  return (
    <div className="mobile-container">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-blue to-primary-blue-dark rounded-2xl text-white p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">김환자님, 안녕하세요! 👋</h1>
        <p className="text-blue-100 text-lg">오늘의 검사 일정입니다</p>
      </div>

      {/* 진행률 */}
      <div className="card mb-6">
        <ProgressBar current={completedCount + 1} total={exams.length} />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-50 rounded-xl">
            <div className="text-2xl font-bold text-success-green">{completedCount}</div>
            <div className="text-sm text-text-secondary">완료</div>
          </div>
          <div className="p-3 bg-primary-blue-light rounded-xl">
            <div className="text-2xl font-bold text-primary-blue">1</div>
            <div className="text-sm text-text-secondary">진행 중</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-text-secondary">{exams.length - completedCount - 1}</div>
            <div className="text-sm text-text-secondary">대기</div>
          </div>
        </div>
      </div>

      {/* 검사 카드들 */}
      <div className="space-y-4">
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} status={exam.status} />
        ))}
      </div>

      {/* 도움말 버튼 */}
      <div className="mt-8 text-center">
        <button className="text-primary-blue font-semibold text-lg flex items-center justify-center gap-2 mx-auto">
          <span>❓</span>
          궁금한 것이 있으신가요?
        </button>
      </div>

      {/* 플로팅 음성 버튼 */}
      <button className="floating-button" aria-label="음성 안내 듣기">
        🔊
      </button>
    </div>
  );
};

export default ExamSchedule; 