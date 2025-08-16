import React from 'react';

export default function ProgressBar({ appointments }) {
  if (!appointments || appointments.length === 0) {
    return null;
  }

  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const totalCount = appointments.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">오늘의 진행 상황</h3>
        <span className="text-2xl font-bold text-blue-600">
          {completedCount}/{totalCount}
        </span>
      </div>
      
      <div className="relative">
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full 
                     transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {appointments.map((apt, index) => (
              <div
                key={apt.appointment_id}
                className={`w-10 h-10 rounded-full border-2 border-white flex items-center 
                          justify-center text-sm font-medium transition-all duration-300
                          ${apt.status === 'completed' 
                            ? 'bg-green-500 text-white' 
                            : apt.status === 'ongoing'
                            ? 'bg-blue-500 text-white animate-pulse'
                            : apt.status === 'waiting'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-300 text-gray-600'}`}
                style={{ zIndex: appointments.length - index }}
                title={apt.exam?.title}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          {completedCount === totalCount ? (
            <span className="text-green-600 font-semibold flex items-center gap-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                      clipRule="evenodd" />
              </svg>
              모두 완료!
            </span>
          ) : (
            <span className="text-gray-600">
              {totalCount - completedCount}개 남음
            </span>
          )}
        </div>
      </div>
    </div>
  );
}