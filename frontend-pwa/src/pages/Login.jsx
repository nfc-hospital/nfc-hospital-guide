import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  
  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 테스트를 위해 간단한 유효성 검사
      if (phoneNumber.length !== 4 || birthDate.length !== 6) {
        throw new Error('전화번호 뒷자리 4자리와 생년월일 6자리를 정확히 입력해주세요.');
      }

      await login(phoneNumber, birthDate);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다. 입력하신 정보를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            간편 로그인
          </h2>
          <p className="mt-2 text-center text-lg text-text-secondary">
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
                className="form-input"
                placeholder="전화번호 (뒤 4자리)"
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
                className="form-input"
                placeholder="생년월일 (YYMMDD)"
                pattern="[0-9]{6}"
                maxLength="6"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-danger-red" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          {/* 테스트용 안내 메시지 */}
          <div className="text-center text-lg text-text-secondary">
            테스트용 계정: 전화번호 1234, 생년월일 990101
          </div>
        </form>
      </div>
    </div>
  );
}