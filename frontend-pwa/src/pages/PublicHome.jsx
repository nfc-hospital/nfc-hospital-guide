import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';
import DepartmentDirections from '../components/DepartmentDirections';
import { 
  MapPinIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
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
      description: '24시간 진료',
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100 hover:border-red-300',
    },
    { 
      name: '약국', 
      icon: '💊', 
      description: '처방전',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      hoverColor: 'hover:bg-emerald-100 hover:border-emerald-300',
    },
    { 
      name: '원무과', 
      icon: '💳', 
      description: '접수·수납',
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      hoverColor: 'hover:bg-amber-100 hover:border-amber-300',
    },
    { 
      name: '안내데스크', 
      icon: '💁‍♀️', 
      description: '도움·안내',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100 hover:border-purple-300',
    },
  ];

  // 자주 찾는 진료과
  const commonDepartments = [
    { 
      name: '내과',
      icon: '🏥',
      description: '일반 진료',
      patients: '15명'
    },
    { 
      name: '정형외과',
      icon: '🦴',
      description: '근골격계',
      patients: '8명'
    },
    { 
      name: '안과',
      icon: '👁️',
      description: '눈 진료',
      patients: '12명'
    },
    { 
      name: '이비인후과',
      icon: '👂',
      description: '귀·코·목',
      patients: '10명'
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
    } else if (text.includes('안내') || text.includes('도움')) {
      setSelectedDepartment('안내데스크');
    } else if (text.includes('화장실')) {
      setSelectedDepartment('화장실');
    } else if (text.includes('엘리베이터')) {
      setSelectedDepartment('엘리베이터');
    } else if (text.includes('원무') || text.includes('접수') || text.includes('수납')) {
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
      {/* 상단 헤더 - 모바일 최적화 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg sm:text-xl font-bold">H</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">HC_119</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">NFC + AI 기반 병원 내 검사·진료 안내 시스템</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-xl flex items-center gap-2"
            >
              <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>로그인</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* 환영 메시지 & 음성 안내 섹션 - 모바일 최적화 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-6 sm:p-12 mb-6 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
              어디로 가시나요?
            </h2>
            
            {/* 음성 입력 - VoiceInput 컴포넌트 사용 */}
            <div className="w-full">
              <VoiceInput
                onResult={handleVoiceResult}
                onError={handleError}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-2 animate-shake">
            <span className="text-lg">⚠️</span>
            <p className="text-sm sm:text-base font-medium">{error}</p>
          </div>
        )}

        {/* 선택 안내 문구 - 간소화 */}
        <div className="text-center mt-6 mb-4">
          <p className="text-sm text-gray-600">
            또는 아래 버튼을 선택하세요 ↓
          </p>
        </div>

        {/* 주요 장소 빠른 선택 - 모바일 최적화 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPinIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            주요 시설
          </h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {quickAccessPlaces.map((place) => (
              <button
                key={place.name}
                onClick={() => setSelectedDepartment(place.name)}
                className={`group relative bg-white ${place.borderColor} border-2 rounded-2xl p-4 sm:p-6 transition-all duration-300 ${place.hoverColor} hover:shadow-lg`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${place.lightColor} rounded-xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300`}>
                    {place.icon}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900">{place.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{place.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 진료과 섹션 - 모바일 최적화 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            진료과 찾기
          </h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {commonDepartments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-2xl mb-2">{dept.icon}</div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 text-left">{dept.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 text-left">{dept.description}</p>
                    <p className="text-xs sm:text-sm font-medium text-blue-600 mt-1 text-left">{dept.patients} 대기</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 로그인 유도 카드 - 모바일 최적화 */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">
              환자 맞춤 서비스
            </h3>
            <p className="text-sm sm:text-lg text-slate-300 mb-6">
              로그인하시면 더 편리한 병원 이용이 가능합니다
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">📅</span>
                <div>
                  <h5 className="text-sm font-semibold">검사 일정</h5>
                  <p className="text-xs text-slate-300">실시간 확인</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">🔔</span>
                <div>
                  <h5 className="text-sm font-semibold">호출 알림</h5>
                  <p className="text-xs text-slate-300">자동 알림</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">🗺️</span>
                <div>
                  <h5 className="text-sm font-semibold">맞춤 길안내</h5>
                  <p className="text-xs text-slate-300">최적 경로</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">📱</span>
                <div>
                  <h5 className="text-sm font-semibold">NFC 스캔</h5>
                  <p className="text-xs text-slate-300">자동 체크인</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full group bg-white text-slate-900 px-6 py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-2"
            >
              지금 로그인하기
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}