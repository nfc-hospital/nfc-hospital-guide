import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KakaoButton from '../components/common/KakaoButton';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const handleKakaoLoginClick = () => {
    navigate('/oauth/kakao');
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
      if (phoneNumber.length !== 4 || birthDate.length !== 6) {
        throw new Error('전화번호 뒷자리 4자리와 생년월일 6자리를 정확히 입력해주세요.');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 홈으로 돌아가기 버튼 */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-300 group"
        >
          <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-lg font-medium">홈으로 돌아가기</span>
        </button>
        
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
        </div>

        <div className="space-y-4">
          <KakaoButton
            onClick={handleKakaoLoginClick}
            loading={isLoading}
          />
        </div>

        {/* OR 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gradient-to-b from-blue-50 to-white text-gray-500">
              또는
            </span>
          </div>
        </div>
        
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            간편 로그인
          </h2>
          <p className="mt-2 text-center text-lg text-gray-600">
            전화번호와 생년월일로 로그인하세요
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-xl shadow-sm space-y-4">
            <div>
              <label htmlFor="phone-number" className="sr-only">
                전화번호
              </label>
              <input
                id="phone-number"
                name="phoneNumber"
                type="tel"
                required
                className="appearance-none relative block w-full px-4 py-4 border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="전화번호 뒤 4자리"
                pattern="[0-9]{4}"
                maxLength="4"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="birth-date" className="sr-only">
                생년월일
              </label>
              <input
                id="birth-date"
                name="birthDate"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-4 border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="생년월일 6자리 (예: 990101)"
                pattern="[0-9]{6}"
                maxLength="6"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 transition-all duration-300">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xl font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </span>
              ) : '로그인'}
            </button>
          </div>

          {/* 테스트용 안내 메시지 */}
          <div className="text-center bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
            <p className="text-lg text-amber-800 font-medium">
              테스트용 계정
            </p>
            <p className="text-base text-amber-700 mt-1">
              전화번호: 1234 • 생년월일: 990101
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}