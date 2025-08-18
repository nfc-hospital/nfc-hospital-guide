import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';
import DepartmentDirections from '../components/DepartmentDirections';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function PublicHome() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  // 자주 찾는 장소들
  const quickAccessPlaces = [
    { name: '응급실', icon: '🚨', description: '24시간 응급진료' },
    { name: '약국', icon: '💊', description: '처방전 수령' },
    { name: '주차장', icon: '🚗', description: '주차 안내' },
    { name: '화장실', icon: '🚻', description: '가까운 화장실' },
    { name: '엘리베이터', icon: '🛗', description: '층간 이동' },
    { name: '원무과', icon: '🏢', description: '접수/수납' },
  ];

  // 자주 찾는 진료과
  const commonDepartments = [
    { name: '이비인후과', icon: '👂' },
    { name: '안과', icon: '👁️' },
    { name: '정형외과', icon: '🦴' },
    { name: '내과', icon: '🫀' },
    { name: '치과', icon: '🦷' },
    { name: '소아과', icon: '🧒' },
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
    else if (text.includes('귀') || text.includes('이비인후과')) {
      setSelectedDepartment('이비인후과');
    } else if (text.includes('눈') || text.includes('안과')) {
      setSelectedDepartment('안과');
    } else if (text.includes('뼈') || text.includes('정형외과')) {
      setSelectedDepartment('정형외과');
    } else if (text.includes('내과')) {
      setSelectedDepartment('내과');
    } else if (text.includes('치과') || text.includes('이')) {
      setSelectedDepartment('치과');
    } else if (text.includes('소아') || text.includes('어린이')) {
      setSelectedDepartment('소아과');
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">병원 안내 시스템</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">로그인 없이 이용 가능</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-2xl text-lg sm:text-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl min-h-[56px]"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>로그인</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 음성 안내 섹션 */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg">
              <span className="text-4xl sm:text-5xl">🎤</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              어디로 안내해 드릴까요?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              찾으시는 장소나 진료과를 말씀해 주세요
            </p>
          </div>

          {/* 음성 입력 */}
          <div className="mt-6">
            <VoiceInput
              onResult={handleVoiceResult}
              onError={handleError}
              isListening={isListening}
              setIsListening={setIsListening}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 bg-red-50 text-red-800 p-4 rounded-2xl transition-all duration-300">
              <p className="text-lg font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* 빠른 장소 찾기 */}
        <div className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center">
            자주 찾는 장소
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {quickAccessPlaces.map((place) => (
              <button
                key={place.name}
                onClick={() => setSelectedDepartment(place.name)}
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-md hover:shadow-xl group"
              >
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl mb-2 block group-hover:scale-110 transition-transform duration-300">{place.icon}</span>
                  <h4 className="text-lg sm:text-xl font-semibold text-gray-900">{place.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 자주 찾는 진료과 */}
        <div className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center">
            진료과 찾기
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {commonDepartments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-green-500 rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-md hover:shadow-xl group"
              >
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl mb-2 block group-hover:scale-110 transition-transform duration-300">{dept.icon}</span>
                  <h4 className="text-lg sm:text-xl font-semibold text-gray-900">{dept.name}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 안내데스크 안내 */}
        <div className="text-center bg-amber-50 rounded-2xl p-6 mb-8">
          <p className="text-lg text-gray-700 mb-3">
            원하시는 장소를 찾지 못하셨나요?
          </p>
          <button 
            className="text-blue-600 hover:text-blue-700 font-semibold text-xl hover:underline transition-colors duration-300"
            onClick={() => setSelectedDepartment('안내데스크')}
          >
            <span className="text-2xl mr-2">💁</span>
            안내데스크로 가기
          </button>
        </div>

        {/* 로그인 유도 섹션 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 sm:p-8 text-center shadow-lg">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            더 많은 서비스를 이용하시려면
          </h3>
          <p className="text-lg sm:text-xl text-gray-700 mb-6">
            로그인하시면 맞춤형 서비스를 이용하실 수 있습니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto mb-6">
            <div className="flex items-start gap-3 bg-white bg-opacity-70 rounded-xl p-3">
              <span className="text-blue-600 text-xl mt-1">✓</span>
              <span className="text-gray-700">내 검사 일정 및 대기 현황</span>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-70 rounded-xl p-3">
              <span className="text-blue-600 text-xl mt-1">✓</span>
              <span className="text-gray-700">NFC 태그 맞춤형 길 안내</span>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-70 rounded-xl p-3">
              <span className="text-blue-600 text-xl mt-1">✓</span>
              <span className="text-gray-700">검사 준비사항 상세 안내</span>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-70 rounded-xl p-3">
              <span className="text-blue-600 text-xl mt-1">✓</span>
              <span className="text-gray-700">실시간 호출 알림</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl min-h-[56px]"
          >
            지금 로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}