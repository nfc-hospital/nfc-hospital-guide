import React from 'react';
import LSTMPrediction from '../components/admin/dashboard/LSTMPrediction';

const LSTMTest = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LSTM 예측 시스템 테스트
          </h1>
          <p className="text-lg text-gray-600">
            로그인 없이 LSTM 예측 기능을 테스트할 수 있습니다
          </p>
        </div>

        {/* LSTM 예측 컴포넌트 */}
        <LSTMPrediction />
      </div>
    </div>
  );
};

export default LSTMTest;