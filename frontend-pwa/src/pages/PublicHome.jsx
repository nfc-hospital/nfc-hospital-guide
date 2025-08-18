import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';
import DepartmentDirections from '../components/DepartmentDirections';
import { 
  ArrowRightIcon, 
  MicrophoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { 
  ChevronRightIcon,
  UserCircleIcon 
} from '@heroicons/react/24/solid';

export default function PublicHome() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  // 자주 찾는 장소들
  const quickAccessPlaces = [
    { 
      name: '응급실', 
      icon: '🚨', 
      description: '24시간 응급진료',
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100 hover:border-red-300',
      shadowColor: 'hover:shadow-red-200'
    },
    { 
      name: '약국', 
      icon: '💊', 
      description: '처방전 수령',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      hoverColor: 'hover:bg-emerald-100 hover:border-emerald-300',
      shadowColor: 'hover:shadow-emerald-200'
    },
    { 
      name: '주차장', 
      icon: '🚗', 
      description: '주차 안내',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100 hover:border-blue-300',
      shadowColor: 'hover:shadow-blue-200'
    },
    { 
      name: '원무과', 
      icon: '💳', 
      description: '접수 · 수납',
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      hoverColor: 'hover:bg-amber-100 hover:border-amber-300',
      shadowColor: 'hover:shadow-amber-200'
    },
  ];

  // 자주 찾는 진료과
  const commonDepartments = [
    { 
      name: '내과',
      icon: '🏥',
      description: '일반 진료',
      patients: '15명 대기'
    },
    { 
      name: '정형외과',
      icon: '🦴',
      description: '근골격계',
      patients: '8명 대기'
    },
    { 
      name: '안과',
      icon: '👁️',
      description: '눈 진료',
      patients: '12명 대기'
    },
    { 
      name: '이비인후과',
      icon: '👂',
      description: '귀·코·목',
      patients: '10명 대기'
    },
  ];

  // 음성 입력 결과 처리
  const handleVoiceResult = useCallback((transcript) => {
    const text = transcript.toLowerCase();
    
    // 장소 매칭
    if (text.includes('응급')) {
      setSelectedDepartment('응급실');
    } else if (text.includes('약국')) {
      setSelectedDepartment('약국');
    } else if (text.includes('주차')) {
      setSelectedDepartment('주차장');
    } else if (text.includes('화장실')) {
      setSelectedDepartment('화장실');
    } else if (text.includes('엘리베이터')) {
      setSelectedDepartment('엘리베이터');
    } else if (text.includes('원무') || text.includes('접수')) {
      setSelectedDepartment('원무과');
    }
    // 진료과 매칭
    else if (text.includes('내과')) {
      setSelectedDepartment('내과');
    } else if (text.includes('정형') || text.includes('뼈')) {
      setSelectedDepartment('정형외과');
    } else if (text.includes('안과') || text.includes('눈')) {
      setSelectedDepartment('안과');
    } else if (text.includes('이비인후') || text.includes('귀') || text.includes('코') || text.includes('목')) {
      setSelectedDepartment('이비인후과');
    } else {
      setError('죄송합니다. 다시 한 번 말씀해 주시거나 아래 버튼을 눌러주세요.');
    }
  }, []);

  // 에러 처리
  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsListening(false);
  }, []);

  // 진료과 선택 초기화
  const handleReset = useCallback(() => {
    setSelectedDepartment(null);
    setError('');
  }, []);

  if (selectedDepartment) {
    return (
      <DepartmentDirections 
        department={selectedDepartment}
        onClose={handleReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* 상단 헤더 - 간결하고 명확한 디자인 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">H</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HC_119</h1>
                <p className="text-sm text-gray-500">NFC + AI 기반 병원 내 검사·진료 안내 시스템</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-3"
            >
              <UserCircleIcon className="w-6 h-6" />
              <span>로그인</span>
              <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 & 음성 안내 섹션 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              어디로 가시나요?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              음성으로 말씀하시거나 아래에서 선택해주세요
            </p>
            
            {/* 음성 입력 버튼 - 크고 명확한 디자인 */}
            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 max-w-lg mx-auto">
              {!isListening ? (
                <button
                  onClick={() => {
                    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                      handleError('이 브라우저는 음성 인식을 지원하지 않습니다.');
                      return;
                    }
                    setIsListening(true);
                  }}
                  className="w-full bg-white hover:bg-gray-50 text-blue-600 px-8 py-6 rounded-2xl font-semibold text-xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center justify-center gap-4"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <MicrophoneIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <span>음성으로 말씀해주세요</span>
                </button>
              ) : (
                <div className="text-center">
                  <div className="mb-4 flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse delay-100"></div>
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse delay-200"></div>
                  </div>
                  <p className="text-white text-xl mb-4">듣고 있습니다...</p>
                  <button
                    onClick={() => setIsListening(false)}
                    className="bg-white/30 hover:bg-white/40 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300"
                  >
                    중단하기
                  </button>
                </div>
              )}
              <div className="hidden">
                <VoiceInput
                  onResult={handleVoiceResult}
                  onError={handleError}
                  isListening={isListening}
                  setIsListening={setIsListening}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 p-5 rounded-2xl flex items-start gap-3 animate-shake">
            <span className="text-2xl">⚠️</span>
            <p className="text-lg font-medium">{error}</p>
          </div>
        )}

        {/* 주요 장소 빠른 선택 */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <MapPinIcon className="w-8 h-8 text-blue-600" />
            주요 시설 바로가기
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessPlaces.map((place) => (
              <button
                key={place.name}
                onClick={() => setSelectedDepartment(place.name)}
                className={`group relative bg-white ${place.borderColor} border-2 rounded-3xl p-6 transition-all duration-300 ${place.hoverColor} hover:shadow-xl hover:scale-105 ${place.shadowColor}`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-20 h-20 ${place.lightColor} rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300`}>
                    {place.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{place.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                  </div>
                </div>
                <ChevronRightIcon className="absolute top-6 right-6 w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </section>

        {/* 진료과 섹션 */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            진료과 찾기
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {commonDepartments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="group bg-white border-2 border-gray-200 rounded-3xl p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:scale-105 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-3xl mb-3">{dept.icon}</div>
                    <h4 className="text-xl font-bold text-gray-900 text-left">{dept.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 text-left">{dept.description}</p>
                    <p className="text-sm font-medium text-blue-600 mt-3 text-left">{dept.patients}</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 안내 데스크 섹션 */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-2 border-amber-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl">
                  💁‍♀️
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">도움이 필요하신가요?</h4>
                  <p className="text-gray-700 mt-1">안내 데스크에서 친절히 도와드립니다</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepartment('안내데스크')}
                className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
              >
                안내데스크 위치보기
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* 로그인 유도 카드 */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">
              환자 맞춤 서비스를 이용해보세요
            </h3>
            <p className="text-xl text-slate-300 mb-8">
              로그인하시면 더 편리한 병원 이용이 가능합니다
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <h5 className="font-semibold">오늘의 검사 일정</h5>
                  <p className="text-sm text-slate-300">실시간 대기 현황 확인</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  🔔
                </div>
                <div>
                  <h5 className="font-semibold">스마트 알림</h5>
                  <p className="text-sm text-slate-300">순서가 되면 알려드려요</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  🗺️
                </div>
                <div>
                  <h5 className="font-semibold">맞춤 길 안내</h5>
                  <p className="text-sm text-slate-300">검사실까지 최적 경로</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  📱
                </div>
                <div>
                  <h5 className="font-semibold">NFC 태그 스캔</h5>
                  <p className="text-sm text-slate-300">위치 기반 자동 체크인</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="group bg-white text-slate-900 px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center gap-3 mx-auto"
            >
              지금 로그인하기
              <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      {/* 하단 고정 도움말 버튼 */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-blue-600 hover:bg-blue-700 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center group">
          <ChatBubbleBottomCenterTextIcon className="w-8 h-8" />
          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">?</span>
        </button>
      </div>
    </div>
  );
}