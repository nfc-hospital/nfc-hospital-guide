import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KakaoButton from '../components/common/KakaoButton';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const handleKakaoLoginClick = () => {
    navigate('/oauth/kakao');
  };
  
  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }
    
    // 11자리 초과 시 11자리까지만 사용
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };
  
  // 전화번호 입력 핸들러
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };
  
  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/home';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 유효성 검사
      const phoneRegex = /^[0-9]{3}-[0-9]{4}-[0-9]{4}$/;
      if (!phoneRegex.test(phoneNumber) || birthDate.length !== 6) {
        throw new Error('전화번호와 생년월일을 정확히 입력해주세요.');
      }

      // ✅ 새로운 AuthContext에 맞게 수정
      await login(phoneNumber, birthDate);
      
      const from = location.state?.from?.pathname || '/home';
      navigate(from, { replace: true });
      
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다. 입력하신 정보를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col bg-gray-50"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* 상단 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900"></h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-6">
          {/* 카카오 로그인 버튼 - 주석 처리 */}
          {/* <div className="pb-2">
            <button
              type="button"
              onClick={handleKakaoLoginClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FEE500', color: '#000000' }}
            >
              {isLoading ? (
                <span className="text-lg font-bold">로그인 중...</span>
              ) : (
                <>
                  <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" alt="Kakao" className="w-6 h-6 mr-3" />
                  <span className="text-lg font-bold">카카오로 3초 로그인</span>
                </>
              )}
            </button>
          </div> */}

          {/* 구분선 - 카카오 버튼 숨김에 따라 주석 처리 */}
          {/* <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500 font-medium">
                또는
              </span>
            </div>
          </div> */}

          {/* PASS 인증 타이틀 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900">
              PASS 인증
            </h3>
          </div>

          {/* 휴대폰 정보 입력 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
              {/* 휴대폰 번호 입력 */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  휴대폰 번호
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    id="phone-number"
                    name="phoneNumber"
                    type="tel"
                    required
                    className={`pl-12 w-full px-4 py-4 border-2 ${focusedInput === 'phone' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-xl text-xl font-medium focus:outline-none transition-all duration-300`}
                    placeholder="010-1234-5678"
                    pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
                    maxLength="13"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    onFocus={() => setFocusedInput('phone')}
                    onBlur={() => setFocusedInput(null)}
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">휴대폰 번호를 입력하세요 (예: 010-1234-5678)</p>
              </div>

              {/* 생년월일 입력 */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  생년월일
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="birth-date"
                    name="birthDate"
                    type="text"
                    required
                    className={`pl-12 w-full px-4 py-4 border-2 ${focusedInput === 'birth' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-xl text-xl font-medium focus:outline-none transition-all duration-300`}
                    placeholder="YYMMDD"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onFocus={() => setFocusedInput('birth')}
                    onBlur={() => setFocusedInput(null)}
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">주민번호 앞 6자리 (예: 990101)</p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 transition-all duration-300 transform">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="ml-3 text-base font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* 인증하기 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[64px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  인증 중...
                </span>
              ) : (
                '본인 인증하기'
              )}
            </button>

            {/* 안전한 인증 표시 */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>안전한 256bit 암호화 인증</span>
            </div>

            {/* 시연용 안내 */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-bold text-amber-800">
                    시연용 테스트 모드
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    전화번호: 010-1234-5678 • 생년월일: 990101
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    ※ 실제 PASS 인증이 아닌 데모용 구현입니다
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}