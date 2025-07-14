import React from 'react';

export default function KakaoButton({ onClick, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="btn w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-text-primary"
      style={{ backgroundColor: 'var(--kakao-yellow)', color: 'var(--text-primary)' }}
    >
      {loading ? (
        '로그인 중...'
      ) : (
        <>
          <span className="mr-2 text-2xl">💬</span>
          카카오로 로그인
        </>
      )}
    </button>
  );
}