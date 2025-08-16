import React, { useEffect, useState } from 'react';

export default function QueueStatus({ queue }) {
  const [animatedNumber, setAnimatedNumber] = useState(queue?.queue_number || 0);
  
  useEffect(() => {
    if (queue?.queue_number !== animatedNumber) {
      const duration = 500;
      const start = animatedNumber;
      const end = queue.queue_number;
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedNumber(Math.round(start + (end - start) * easeProgress));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [queue?.queue_number, animatedNumber]);

  if (!queue) {
    return null;
  }

  const formatWaitTime = (minutes) => {
    if (minutes < 60) {
      return `약 ${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `약 ${hours}시간 ${mins}분` : `약 ${hours}시간`;
  };

  const isNearTurn = queue.queue_number <= 3;
  
  return (
    <div className={`bg-white rounded-3xl shadow-lg border-2 p-6 
                    ${isNearTurn ? 'border-green-400 animate-pulse' : 'border-gray-200'}`}>
      <div className="text-center">
        <p className="text-lg text-gray-600 mb-2">현재 대기번호</p>
        <div className={`text-7xl font-bold mb-4 transition-colors duration-300
                        ${isNearTurn ? 'text-green-600' : 'text-blue-600'}`}>
          {animatedNumber}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xl font-medium">
              {formatWaitTime(queue.estimated_wait_time)}
            </span>
          </div>
          
          {queue.exam && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">검사명</p>
              <p className="text-lg font-semibold text-gray-900">{queue.exam.title}</p>
              <p className="text-base text-gray-700 mt-1">
                {queue.exam.building} {queue.exam.floor}층 {queue.exam.room}
              </p>
            </div>
          )}
        </div>
        
        {isNearTurn && (
          <div className="mt-4 p-3 bg-green-50 rounded-xl">
            <p className="text-green-800 font-semibold">
              🔔 곧 차례가 됩니다. 준비해주세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}