import React from 'react';
import { useSimulatedAuth } from '../context/SimulatedAuthContext';

const MainScreen = () => {
  const { logout } = useSimulatedAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-3xl font-bold mb-4 text-green-600">로그인 성공!</h2>
        <p className="text-gray-700 mb-6">메인 화면에 오신 것을 환영합니다.</p>
        <button
          onClick={logout}
          className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default MainScreen;
