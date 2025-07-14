import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulatedAuth } from '../context/SimulatedAuthContext';

const LoginPage = () => {
  const { login } = useSimulatedAuth();
  const navigate = useNavigate();

  const handleLoginClick = () => {
    login();
    navigate('/'); // 로그인 성공 후 메인 화면으로 이동
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            카카오 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            서비스 이용을 위해 로그인해주세요.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={handleLoginClick}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <img src="/kakao_logo_placeholder.png" alt="Kakao Logo" className="h-6 w-6 mr-2" />
            카카오 계정으로 로그인
          </button>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">주요 기능</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                카카오 OAuth 2.0 기반 인증
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                JWT 토큰 기반 세션 관리
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                자동 로그인 기능 (토큰 갱신)
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                개인정보 최소 수집 (닉네임, 프로필만)
              </li>
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            로그인 성공 시 메인 화면으로 이동합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;