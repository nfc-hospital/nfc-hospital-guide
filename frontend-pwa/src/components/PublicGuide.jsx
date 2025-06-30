import React, { useState, useCallback } from 'react';
import VoiceInput from './VoiceInput';
import DepartmentDirections from './DepartmentDirections';

const PublicGuide = () => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  // 자주 찾는 진료과 목록
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
    // 간단한 자연어 처리
    const text = transcript.toLowerCase();
    
    // 진료과 매칭 로직
    if (text.includes('귀') || text.includes('이비인후과')) {
      setSelectedDepartment('이비인후과');
    } else if (text.includes('눈') || text.includes('안과')) {
      setSelectedDepartment('안과');
    } else if (text.includes('뼈') || text.includes('정형외과')) {
      setSelectedDepartment('정형외과');
    } else if (text.includes('내과')) {
      setSelectedDepartment('내과');
    } else if (text.includes('치과')) {
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
    <div className="mobile-container min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary-blue rounded-2xl mx-auto flex items-center justify-center shadow-soft">
            <span className="text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">
            무엇을 도와드릴까요?
          </h1>
          <p className="text-lg text-text-secondary">
            찾으시는 진료과를 말씀해 주세요
          </p>
        </div>

        {/* 음성 입력 */}
        <VoiceInput
          onResult={handleVoiceResult}
          onError={handleError}
          isListening={isListening}
          setIsListening={setIsListening}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-danger-red/10 text-danger-red p-4 rounded-xl">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* 자주 찾는 진료과 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary text-center">
            자주 찾는 진료과
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {commonDepartments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="btn btn-secondary h-24 text-lg font-medium"
              >
                <span className="text-3xl mb-2">{dept.icon}</span>
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* 안내데스크 안내 */}
        <div className="text-center space-y-2">
          <p className="text-text-secondary">
            원하시는 진료과가 없으신가요?
          </p>
          <button 
            className="text-primary-blue font-semibold text-lg hover:underline"
            onClick={() => setSelectedDepartment('안내데스크')}
          >
            <span className="text-2xl mr-2">💁</span>
            안내데스크로 가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicGuide; 