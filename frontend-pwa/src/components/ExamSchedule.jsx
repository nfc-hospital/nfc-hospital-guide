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

const ExamCard = ({ exam, status }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
    <div className="flex justify-between items-start mb-4">
      <StatusBadge status={status} text={
        status === 'waiting' ? '대기 중' :
        status === 'current' ? '진행 중' :
        '완료'
      } />
      <Typography variant="caption" color="secondary">
        {exam.estimatedTime}분 소요
      </Typography>
    </div>

    <Typography variant="h3" className="mb-4">
      <span className="mr-2" role="img" aria-label={exam.type}>
        {exam.icon}
      </span>
      {exam.title}
    </Typography>

    <div className="mb-4">
      <Typography variant="body2" color="secondary" className="flex items-center">
        <span className="text-xl mr-2" role="img" aria-label="위치">
          📍
        </span>
        {exam.location}
      </Typography>
    </div>

    <div className="space-y-2 mb-6">
      {exam.warnings.map((warning, index) => (
        <WarningTag
          key={index}
          icon={warning.icon}
          text={warning.text}
          priority={warning.priority}
        />
      ))}
    </div>

    <div className="flex gap-4">
      <Button
        variant="primary"
        icon="🧭"
        fullWidth
        onClick={() => {}}
        ariaLabel="길 안내 보기"
      >
        길 안내
      </Button>
      <Button
        variant="secondary"
        icon="🔊"
        onClick={() => {}}
        ariaLabel="음성 안내 듣기"
      >
        음성 안내
      </Button>
    </div>
  </div>
);

const ExamSchedule = () => {
  const exams = [
    {
      id: 1,
      title: 'X-ray 검사',
      icon: '🏥',
      type: '영상 검사',
      location: '본관 3층 304호',
      estimatedTime: 10,
      warnings: [
        { icon: '⚠️', text: '금속 제거 필수', priority: 'high' },
        { icon: '👕', text: '검사복 착용 필요', priority: 'normal' },
        { icon: '⏱️', text: '5-10분 소요', priority: 'info' },
      ],
      status: 'current',
    },
    // 더미 데이터 추가 가능
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Typography variant="h1" className="mb-8">
          검사 일정
        </Typography>

        <div className="mb-8">
          <Typography variant="h3" className="mb-4">
            진행 상황
          </Typography>
          <div className="bg-white rounded-xl p-6">
            {[1, 2, 3].map((step) => (
              <TimelineStep
                key={step}
                step={step}
                isCompleted={step < 2}
                isCurrent={step === 2}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              status={exam.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExamSchedule; 