import { useState } from 'react';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 🔧 수정된 관리자 로그인 API 호출 (CSRF 토큰 없이)
      const response = await fetch('http://localhost:8000/api/v1/auth/admin/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      console.log('API Response:', data); // 디버깅용

      if (data.success) {
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('adminToken', data.data.token || data.data.access_token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        
        alert('로그인 성공!'); // 테스트용
        console.log('Login successful:', data.data);
        
        // 관리자 대시보드로 이동
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // 테스트 계정 자동 입력
  const fillTestAccount = (role) => {
    const accounts = {
      super: { email: 'admin@nfc-hospital.kr', password: 'admin123456' },
      dept: { email: 'dept@nfc-hospital.kr', password: 'dept123456' },
      staff: { email: 'staff@nfc-hospital.kr', password: 'staff123456' }
    };
    setCredentials(accounts[role]);
  };

  // 🆕 간단한 테스트 로그인
  const testLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 테스트용 계정으로 바로 로그인
      const testCredentials = {
        email: 'admin@test.com',
        password: 'admin123'
      };
      
      const response = await fetch('http://localhost:8000/api/v1/auth/admin/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCredentials)
      });

      const data = await response.json();
      console.log('Test Login Response:', data);
      
      if (data.success) {
        localStorage.setItem('adminToken', data.data.token || data.data.access_token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        alert('테스트 로그인 성공!');
        window.location.href = '/admin/dashboard';
      } else {
        setError(`테스트 로그인 실패: ${data.message}`);
      }
    } catch (err) {
      setError('테스트 로그인 중 오류 발생');
      console.error('Test login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">관리자 로그인</h1>
          <p className="text-gray-600 mt-2">병원 관리 시스템에 접속하세요</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 로그인 폼 */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              required
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@nfc-hospital.kr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              required
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {/* 🆕 테스트 로그인 버튼 */}
          <button
            onClick={testLogin}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            🧪 테스트 로그인 (admin@test.com)
          </button>
        </div>

        {/* 테스트 계정 버튼들 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">테스트 계정</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillTestAccount('super')}
              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-3 py-2 rounded-lg transition"
            >
              Super Admin
            </button>
            <button
              onClick={() => fillTestAccount('dept')}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs px-3 py-2 rounded-lg transition"
            >
              Dept Admin
            </button>
            <button
              onClick={() => fillTestAccount('staff')}
              className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-3 py-2 rounded-lg transition"
            >
              Staff
            </button>
          </div>
        </div>

        {/* API 엔드포인트 정보 */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            🔗 API: POST /api/v1/auth/admin/login/
          </p>
        </div>

        {/* 환자 로그인으로 돌아가기 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            환자 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;