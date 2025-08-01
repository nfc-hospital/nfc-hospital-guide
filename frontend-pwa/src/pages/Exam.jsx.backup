import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatbotButton from '../components/ChatbotButton';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [waitingInfo, setWaitingInfo] = useState({ position: 3, etaMin: 7 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examCompleted, setExamCompleted] = useState(false);
  const [preparationChecked, setPreparationChecked] = useState({});
  const [activeTab, setActiveTab] = useState('info');
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  
  useEffect(() => {
    document.title = 'X-ray 검사 - 서울 대학 병원';
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchExamDetails();
    
    const waitingInterval = setInterval(fetchWaitingInfo, 30000);
    
    return () => {
      clearInterval(waitingInterval);
    };
  }, [examId, isAuthenticated, navigate]);
  
  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      
      const mockData = {
        id: examId,
        title: 'X-ray 검사',
        subtitle: '흉부 X-ray 촬영',
        icon: '🩻',
        location: {
          building: '본관',
          floor: '3층',
          department: '영상의학과',
          roomNumber: '304호'
        },
        preparations: [
          { id: 1, text: '금속류 제거 필수', icon: '⚠️', checked: false },
          { id: 2, text: '검사복 착용 필요', icon: '👕', checked: false },
          { id: 3, text: '임산부 사전 고지', icon: '🤰', checked: false }
        ],
        estimatedDuration: 15,
        status: '진행 예정'
      };
      
      setExam(mockData);
      
      const initialChecked = {};
      mockData.preparations.forEach(prep => {
        initialChecked[prep.id] = prep.checked;
      });
      setPreparationChecked(initialChecked);
      
    } catch (err) {
      setError('검사 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWaitingInfo = async () => {
    try {
      const mockWaitingInfo = {
        position: Math.max(1, Math.floor(Math.random() * 5)),
        etaMin: Math.max(3, Math.floor(Math.random() * 20))
      };
      setWaitingInfo(mockWaitingInfo);
    } catch (err) {
      console.error('대기 정보를 가져오는데 실패했습니다:', err);
    }
  };
  
  const handlePreparationCheck = (prepId) => {
    setPreparationChecked(prev => ({
      ...prev,
      [prepId]: !prev[prepId]
    }));
  };
  
  const handleExamComplete = async () => {
    try {
      setExamCompleted(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      alert('검사 완료 처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const startVoiceGuide = () => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance();
      speech.text = `${exam.title}는 ${exam.location.building} ${exam.location.floor} ${exam.location.roomNumber}에서 진행됩니다. 현재 ${waitingInfo.position}명이 앞에 대기 중이며, 예상 대기시간은 ${waitingInfo.etaMin}분입니다.`;
      speech.lang = 'ko-KR';
      speech.rate = 0.7; // 더 천천히
      speech.volume = 1.0;
      window.speechSynthesis.speak(speech);
    }
  };

  const textSizeClass = largeText ? 'text-2xl' : 'text-xl';
  const buttonSizeClass = largeText ? 'p-5 text-xl' : 'p-4 text-lg';
  const containerClass = `min-h-screen flex flex-col ${highContrast ? 'bg-black text-white' : 'bg-gray-50'}`;
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className={`${highContrast ? 'bg-red-900 border-red-500' : 'bg-red-50 border-red-400'} border-l-4 p-6 rounded-xl max-w-sm`}>
          <div className="flex items-center">
            <span className="text-3xl mr-4">⚠️</span>
            <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-red-200' : 'text-red-700'} font-medium`}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!exam) {
    return null;
  }
  
  return (
    <div className={containerClass}>
      {examCompleted ? (
        // 검사 완료 화면
        <div className="flex-1 flex items-center justify-center p-6">
          <div className={`${highContrast ? 'bg-gray-900 border-2 border-white' : 'bg-white'} rounded-2xl p-8 text-center shadow-lg max-w-sm w-full`}>
            <div className={`w-20 h-20 ${highContrast ? 'bg-green-800' : 'bg-green-100'} rounded-full mx-auto flex items-center justify-center mb-6`}>
              <span className="text-5xl">✅</span>
            </div>
            <h2 className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold ${highContrast ? 'text-white' : 'text-gray-900'} mb-4`}>
              검사가 완료되었습니다!
            </h2>
            <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
              잠시 후 메인 화면으로 이동합니다...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 접근성 설정 버튼 */}
          <div className={`${highContrast ? 'bg-gray-900 border-b border-white' : 'bg-white border-b'} p-2 flex justify-end gap-2`}>
            <button
              onClick={() => setLargeText(!largeText)}
              className={`p-2 rounded-lg ${highContrast ? 'bg-yellow-600 text-black' : 'bg-gray-100 text-gray-700'} font-bold text-sm`}
              title="글자 크기 조절"
            >
              {largeText ? '가' : '가+'}
            </button>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`p-2 rounded-lg ${highContrast ? 'bg-yellow-600 text-black' : 'bg-gray-100 text-gray-700'} font-bold text-sm`}
              title="고대비 모드"
            >
              👁️
            </button>
            <button
              onClick={startVoiceGuide}
              className={`p-2 rounded-lg ${highContrast ? 'bg-blue-600' : 'bg-blue-600'} text-white font-bold text-sm`}
              title="음성 안내"
            >
              🔊
            </button>
          </div>

          {/* 상단 헤더 - 검사 정보 */}
          <div className={`${highContrast ? 'bg-blue-800 border-b-2 border-white' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${highContrast ? 'bg-yellow-600' : 'bg-white/20'} rounded-xl flex items-center justify-center`}>
                  <span className="text-4xl">{exam.icon}</span>
                </div>
                <div>
                  <h1 className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold`}>{exam.title}</h1>
                  <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-blue-200' : 'text-blue-100'}`}>
                    {exam.subtitle}
                  </p>
                </div>
              </div>
              <div className={`${highContrast ? 'bg-yellow-600 text-black' : 'bg-white/20'} px-4 py-2 rounded-full`}>
                <span className={`${largeText ? 'text-lg' : 'text-base'} font-bold`}>{exam.status}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={`${highContrast ? 'bg-gray-800 border border-white' : 'bg-white/10'} rounded-xl p-4`}>
                <p className={`${largeText ? 'text-lg' : 'text-base'} ${highContrast ? 'text-blue-200' : 'text-blue-100'} font-medium`}>위치</p>
                <p className={`${largeText ? 'text-xl' : 'text-lg'} font-bold`}>{exam.location.building}</p>
                <p className={`${largeText ? 'text-xl' : 'text-lg'} font-bold`}>{exam.location.floor}</p>
              </div>
              <div className={`${highContrast ? 'bg-gray-800 border border-white' : 'bg-white/10'} rounded-xl p-4`}>
                <p className={`${largeText ? 'text-lg' : 'text-base'} ${highContrast ? 'text-blue-200' : 'text-blue-100'} font-medium`}>대기</p>
                <p className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold text-yellow-300`}>{waitingInfo.position}명</p>
              </div>
              <div className={`${highContrast ? 'bg-gray-800 border border-white' : 'bg-white/10'} rounded-xl p-4`}>
                <p className={`${largeText ? 'text-lg' : 'text-base'} ${highContrast ? 'text-blue-200' : 'text-blue-100'} font-medium`}>예상시간</p>
                <p className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold text-yellow-300`}>{waitingInfo.etaMin}분</p>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className={`${highContrast ? 'bg-gray-900 border-b-2 border-white' : 'bg-white border-b'} flex`}>
            {[
              { key: 'info', label: '준비사항', icon: '📋' },
              { key: 'location', label: '위치안내', icon: '📍' },
              { key: 'waiting', label: '대기현황', icon: '⏱️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 ${buttonSizeClass} text-center border-b-4 transition-all font-bold ${
                  activeTab === tab.key
                    ? `${highContrast ? 'border-yellow-400 text-yellow-400 bg-gray-800' : 'border-blue-600 text-blue-600 bg-blue-50'}`
                    : `${highContrast ? 'border-transparent text-white' : 'border-transparent text-gray-600'}`
                }`}
              >
                <div className="text-2xl mb-1">{tab.icon}</div>
                <div className={`${largeText ? 'text-lg' : 'text-sm'} font-bold`}>{tab.label}</div>
              </button>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <h2 className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold ${highContrast ? 'text-white' : 'text-gray-900'} mb-4`}>
                  검사 준비사항
                </h2>
                {exam.preparations.map((prep) => (
                  <button
                    key={prep.id}
                    onClick={() => handlePreparationCheck(prep.id)}
                    className={`w-full flex items-center ${buttonSizeClass} rounded-2xl border-4 transition-all ${
                      preparationChecked[prep.id]
                        ? `${highContrast ? 'bg-green-800 border-green-400' : 'bg-green-50 border-green-400'}`
                        : `${highContrast ? 'bg-gray-800 border-white hover:border-yellow-400' : 'bg-gray-50 border-gray-300 hover:border-blue-500'}`
                    }`}
                  >
                    <span className="text-3xl mr-4">{prep.icon}</span>
                    <span className={`flex-1 text-left ${largeText ? 'text-2xl' : 'text-xl'} font-medium ${
                      preparationChecked[prep.id] 
                        ? `line-through ${highContrast ? 'text-green-300' : 'text-gray-500'}`
                        : `${highContrast ? 'text-white' : 'text-gray-900'}`
                    }`}>
                      {prep.text}
                    </span>
                    <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center ${
                      preparationChecked[prep.id]
                        ? `${highContrast ? 'bg-green-400 border-green-400' : 'bg-green-500 border-green-500'}`
                        : `${highContrast ? 'border-white' : 'border-gray-400'}`
                    }`}>
                      {preparationChecked[prep.id] && (
                        <span className={`${highContrast ? 'text-black' : 'text-white'} text-lg font-bold`}>✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-6">
                <h2 className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
                  위치 안내
                </h2>
                
                <div className={`${highContrast ? 'bg-blue-900 border-2 border-blue-400' : 'bg-blue-50'} rounded-2xl p-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📍</span>
                    <div>
                      <p className={`${largeText ? 'text-2xl' : 'text-xl'} font-bold ${highContrast ? 'text-blue-200' : 'text-blue-900'}`}>
                        {exam.location.building} {exam.location.floor} {exam.location.roomNumber}
                      </p>
                      <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-blue-300' : 'text-blue-700'} font-medium`}>
                        {exam.location.department}
                      </p>
                    </div>
                  </div>
                  <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-blue-200' : 'text-blue-800'} font-medium`}>
                    🚶 엘리베이터에서 우측으로 30m 이동
                  </p>
                </div>

                <div className={`${highContrast ? 'bg-gray-800 border-2 border-white' : 'bg-gray-100'} rounded-2xl p-8 text-center`}>
                  <span className="text-6xl mb-4 block">🗺️</span>
                  <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-white' : 'text-gray-600'} font-medium`}>
                    층별 안내도
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'waiting' && (
              <div className="space-y-6">
                <h2 className={`${largeText ? 'text-3xl' : 'text-2xl'} font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
                  현재 대기 현황
                </h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className={`${highContrast ? 'bg-blue-800 border-2 border-blue-400' : 'bg-blue-50'} rounded-2xl p-6 text-center`}>
                    <div className={`${largeText ? 'text-5xl' : 'text-4xl'} font-bold ${highContrast ? 'text-yellow-300' : 'text-blue-600'} mb-2`}>
                      {waitingInfo.position}명
                    </div>
                    <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-blue-200' : 'text-gray-600'} font-medium`}>
                      앞에 대기
                    </p>
                  </div>
                  <div className={`${highContrast ? 'bg-blue-800 border-2 border-blue-400' : 'bg-blue-50'} rounded-2xl p-6 text-center`}>
                    <div className={`${largeText ? 'text-5xl' : 'text-4xl'} font-bold ${highContrast ? 'text-yellow-300' : 'text-blue-600'} mb-2`}>
                      {waitingInfo.etaMin}분
                    </div>
                    <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-blue-200' : 'text-gray-600'} font-medium`}>
                      예상 대기
                    </p>
                  </div>
                </div>

                <div className={`${highContrast ? 'bg-yellow-800 border-2 border-yellow-400' : 'bg-yellow-50 border border-yellow-200'} rounded-2xl p-4`}>
                  <p className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-yellow-200' : 'text-yellow-800'} text-center font-medium`}>
                    💡 예상 시간은 실제와 다를 수 있습니다
                  </p>
                </div>

                <div className="space-y-4">
                  <div className={`flex items-center justify-between ${buttonSizeClass} ${highContrast ? 'bg-gray-800 border border-white' : 'bg-gray-50'} rounded-xl`}>
                    <span className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-white' : 'text-gray-700'} font-medium`}>
                      현재 진행중
                    </span>
                    <span className={`${largeText ? 'text-2xl' : 'text-xl'} ${highContrast ? 'text-green-400' : 'text-green-600'} font-bold`}>
                      1명
                    </span>
                  </div>
                  <div className={`flex items-center justify-between ${buttonSizeClass} ${highContrast ? 'bg-gray-800 border border-white' : 'bg-gray-50'} rounded-xl`}>
                    <span className={`${largeText ? 'text-xl' : 'text-lg'} ${highContrast ? 'text-white' : 'text-gray-700'} font-medium`}>
                      대기 중
                    </span>
                    <span className={`${largeText ? 'text-2xl' : 'text-xl'} ${highContrast ? 'text-yellow-400' : 'text-blue-600'} font-bold`}>
                      {waitingInfo.position}명
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 고정 버튼 */}
          <div className={`${highContrast ? 'bg-gray-900 border-t-2 border-white' : 'bg-white border-t'} p-6 space-y-4`}>
            <button
              onClick={handleExamComplete}
              className={`w-full ${buttonSizeClass} rounded-2xl font-bold flex items-center justify-center gap-3 ${
                Object.values(preparationChecked).every(checked => checked)
                  ? `${highContrast ? 'bg-green-600 text-white border-2 border-green-400' : 'bg-green-600 text-white'}`
                  : `${highContrast ? 'bg-gray-600 text-gray-300 border-2 border-gray-500' : 'bg-gray-300 text-gray-500'}`
              }`}
              disabled={!Object.values(preparationChecked).every(checked => checked)}
            >
              <span className={largeText ? 'text-2xl' : 'text-xl'}>검사 완료</span>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                className={`${buttonSizeClass} ${highContrast ? 'bg-gray-600 text-white border-2 border-gray-400' : 'bg-gray-100 text-gray-900'} rounded-2xl flex items-center justify-center gap-3 font-bold`}
                onClick={() => navigate('/')}
              >
                <span className="text-2xl">🏠</span>
                <span className={largeText ? 'text-xl' : 'text-lg'}>홈으로</span>
              </button>
              <button className={`${buttonSizeClass} ${highContrast ? 'bg-gray-600 text-white border-2 border-gray-400' : 'bg-gray-100 text-gray-900'} rounded-2xl flex items-center justify-center gap-3 font-bold`}>
                <span className="text-2xl">📋</span>
                <span className={largeText ? 'text-xl' : 'text-lg'}>검사결과</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 챗봇 버튼 */}
      <ChatbotButton />
    </div>
  );
};

export default Exam;