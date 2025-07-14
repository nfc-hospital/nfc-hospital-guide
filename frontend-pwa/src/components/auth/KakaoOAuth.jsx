import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function KakaoOAuth() {
  const navigate = useNavigate();
  const { loginWithKakao } = useAuth();

  const handleConsent = async () => {
    try {
      await loginWithKakao();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Kakao OAuth consent failed:', error);
      // 에러 처리 로직 추가 (예: 로그인 페이지로 리다이렉트 또는 에러 메시지 표시)
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg bg-surface">
        <div className="text-center">
          <span className="text-5xl">💬</span>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            카카오
          </h2>
          <p className="mt-2 text-center text-lg text-text-secondary">
            NFC 병원 안내 시스템이 다음 정보 접근을 요청합니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary-100 text-text-primary">
            <h3 className="font-semibold text-lg">필수 동의</h3>
            <ul className="list-disc list-inside ml-4 mt-2 text-base">
              <li>프로필 정보 (닉네임, 프로필 사진)</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-secondary-100 text-text-primary">
            <h3 className="font-semibold text-lg">선택 동의</h3>
            <ul className="list-disc list-inside ml-4 mt-2 text-base">
              <li>전화번호</li>
            </ul>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleConsent}
            className="btn btn-primary w-full"
          >
            동의하고 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}