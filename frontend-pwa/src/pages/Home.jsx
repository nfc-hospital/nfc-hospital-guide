import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 실시간 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock 데이터 - 실제로는 API에서 가져올 데이터
  const patientInfo = {
    name: '김환자',
    patientId: 'P2025001234'
  };

  const todayExams = [
    {
      id: 1,
      time: '09:30',
      title: '심전도 검사',
      department: '순환기내과',
      location: '본관 2층 204호',
      status: 'completed',
      icon: '💓'
    },
    {
      id: 2,
      time: '11:00',
      title: 'X-ray 검사',
      department: '영상의학과',
      location: '본관 3층 304호',
      status: 'current',
      waitingCount: 3,
      estimatedTime: 15,
      icon: '🩻'
    },
    {
      id: 3,
      time: '14:30',
      title: '혈액 검사',
      department: '진단검사의학과',
      location: '신관 2층 209호',
      status: 'upcoming',
      icon: '🩸'
    }
  ];

  const currentExam = todayExams.find(exam => exam.status === 'current');
  const completedCount = todayExams.filter(exam => exam.status === 'completed').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'current': return 'bg-blue-50 border-blue-200 ring-2 ring-blue-300';
      case 'upcoming': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✓ 완료</span>;
      case 'current': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">● 진행중</span>;
      case 'upcoming': return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">⏳ 대기</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">안녕하세요, {patientInfo.name}님! 👋</h1>
            <p className="text-blue-100 text-lg">오늘도 건강한 하루 되세요</p>
          </div>
          <div className="text-right text-blue-100">
            <div className="text-lg font-medium">
              {currentTime.toLocaleDateString('ko-KR', { 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
              })}
            </div>
            <div className="text-2xl font-bold">
              {currentTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white/20 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-100">오늘의 검사 진행률</span>
            <span className="text-white font-bold">{completedCount}/{todayExams.length}</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-3">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / todayExams.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 pb-20">
        {/* 현재 검사 카드 */}
        {currentExam && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{currentExam.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentExam.title}</h2>
                  <p className="text-gray-600">{currentExam.time} • {currentExam.department}</p>
                </div>
              </div>
              {getStatusBadge(currentExam.status)}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">📍</span>
                <span className="font-medium text-gray-900">{currentExam.location}</span>
              </div>
              
              {currentExam.waitingCount && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentExam.waitingCount}명</div>
                    <div className="text-sm text-gray-600">앞에 대기</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentExam.estimatedTime}분</div>
                    <div className="text-sm text-gray-600">예상 대기</div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => navigate(`/exam/${currentExam.id}`)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
            >
              🧭 검사실로 가기
            </button>
          </div>
        )}

        {/* 오늘의 검사 일정 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">오늘의 검사 일정</h3>
          
          <div className="space-y-3">
            {todayExams.map((exam) => (
              <div 
                key={exam.id}
                className={`border-2 rounded-xl p-4 transition-all ${getStatusColor(exam.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{exam.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{exam.title}</span>
                        {getStatusBadge(exam.status)}
                      </div>
                      <p className="text-gray-600 text-sm">{exam.time} • {exam.location}</p>
                    </div>
                  </div>
                  
                  {exam.status !== 'completed' && (
                    <button 
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                    >
                      상세보기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <span className="text-2xl mb-2 block">🗺️</span>
            <span className="font-bold text-gray-900">병원 지도</span>
          </button>
          <button className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <span className="text-2xl mb-2 block">📋</span>
            <span className="font-bold text-gray-900">검사 결과</span>
          </button>
        </div>

        {/* 응급상황 안내 */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <h4 className="font-bold text-red-800 mb-1">응급상황이신가요?</h4>
              <p className="text-red-600 text-sm">응급실: 1층 • 전화: 02-1234-5678</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;