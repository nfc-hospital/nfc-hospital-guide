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
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 sm:space-x-3 transition-transform hover:scale-105"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-base sm:text-lg md:text-xl font-bold">H</span>
            </div>
            <div className="text-left">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">HC_119</h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 hidden sm:block">NFC + AI 기반 병원 내 검사·진료 안내 시스템</p>
            </div>
          </button>
          
          {!hideLogin && (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAuthenticated && user && (
                <span className="text-xs sm:text-sm md:text-base text-gray-700 font-medium truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">
                  {user.name}님
                </span>
              )}
              <button
                onClick={handleAuthAction}
                className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-2xl sm:rounded-3xl md:rounded-full font-semibold text-xs sm:text-sm md:text-base transition-all duration-300 hover:shadow-xl flex items-center gap-1 sm:gap-2"
              >
                <UserCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                <span className="hidden min-[360px]:inline">{isAuthenticated ? '로그아웃' : '로그인'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}