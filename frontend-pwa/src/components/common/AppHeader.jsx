import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import useJourneyStore from '../../store/journeyStore';

export default function AppHeader({ hideLogin = false }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { user } = useJourneyStore();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg sm:text-xl font-bold">H</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">HC_119</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">NFC + AI 기반 병원 내 검사·진료 안내 시스템</p>
            </div>
          </div>
          
          {!hideLogin && (
            <div className="flex items-center gap-3">
              {isAuthenticated && user && (
                <span className="text-sm sm:text-base text-gray-700 font-medium">
                  {user.name}님
                </span>
              )}
              <button
                onClick={handleAuthAction}
                className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-xl flex items-center gap-2"
              >
                <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>{isAuthenticated ? '로그아웃' : '로그인'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}