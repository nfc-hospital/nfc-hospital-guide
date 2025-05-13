import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '환자 인증 - 서울 대학 병원';
    
    // 이미 로그인되어 있으면 홈으로 리다이렉트
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handlePhoneChange = (e) => {
    // 숫자만 입력 가능하도록 필터링
    const value = e.target.value.replace(/\D/g, '');
    setPhoneNumber(value);
  };
  
  const handleBirthdateChange = (e) => {
    // 숫자만 입력 가능하도록 필터링
    const value = e.target.value.replace(/\D/g, '');
    setBirthdate(value);
  };
  
  const handleVerificationCodeChange = (e) => {
    // 숫자만 입력 가능하도록 필터링
    const value = e.target.value.replace(/\D/g, '');
    setVerificationCode(value);
  };
  
  const requestVerificationCode = async (e) => {
    e.preventDefault();
    
    if (phoneNumber.length !== 11) {
      setError('휴대폰 번호 11자리를 정확히 입력해주세요.');
      return;
    }
    
    if (birthdate.length !== 6) {
      setError('생년월일 6자리를 정확히 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 실제 구현 시 API 호출로 대체
      // const response = await fetch('/api/v1/auth/sms', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: phoneNumber, birthdate })
      // });
      // const data = await response.json();
      
      // 인증 요청 성공 시뮬레이션
      console.log('OTP 1234 to', phoneNumber);
      setTimeout(() => {
        setIsPhoneVerified(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('인증 요청 오류:', error);
      setError('인증 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (verificationCode.length !== 4) {
      setError('인증번호 4자리를 정확히 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 실제 구현 시 API 호출로 대체
      // const response = await fetch('/api/v1/auth/verify', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: phoneNumber, otp: verificationCode })
      // });
      // const data = await response.json();
      
      // 로그인 성공 시뮬레이션
      if (verificationCode === '1234') {
        setTimeout(() => {
          // 임시 사용자 데이터
          const mockUser = {
            id: 'user123',
            name: '홍길동',
            phoneNumber: phoneNumber,
            birthdate: birthdate
          };
          
          login(mockUser);
          navigate('/');
          setLoading(false);
        }, 1000);
      } else {
        setError('인증번호가 일치하지 않습니다.');
        setLoading(false);
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="hospital-logo">
            <h1>서울 대학 병원</h1>
          </div>
          
          <h2>환자 인증</h2>
          
          {!isPhoneVerified ? (
            <form onSubmit={requestVerificationCode} className="auth-form">
              <div className="form-group">
                <label htmlFor="phoneNumber">휴대폰 번호</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="01012345678"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  maxLength={11}
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="birthdate">생년월일 6자리</label>
                <input
                  id="birthdate"
                  type="text"
                  placeholder="예: 900101"
                  value={birthdate}
                  onChange={handleBirthdateChange}
                  maxLength={6}
                  disabled={loading}
                  required
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? '처리 중...' : '인증번호 요청'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="auth-form">
              <p className="phone-info">
                {phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                로 인증번호가 발송되었습니다.
              </p>
              
              <div className="form-group">
                <label htmlFor="verificationCode">인증번호 4자리</label>
                <input
                  id="verificationCode"
                  type="text"
                  placeholder="인증번호 입력"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  maxLength={4}
                  disabled={loading}
                  required
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? '처리 중...' : '로그인'}
              </button>
              
              <button 
                type="button" 
                className="resend-button"
                onClick={requestVerificationCode}
                disabled={loading}
              >
                인증번호 재발송
              </button>
            </form>
          )}
          
          <div className="login-help">
            <p>문제가 있으신가요? <button className="help-button">도움말</button></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;