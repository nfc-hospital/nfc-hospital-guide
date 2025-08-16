import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function AppointmentList({ appointments, onItemClick }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'waiting':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ongoing':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-50 text-green-800 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '예정';
      case 'waiting':
        return '대기중';
      case 'ongoing':
        return '진행중';
      case 'completed':
        return '완료';
      default:
        return status;
    }
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-xl text-gray-600">오늘 예약된 검사가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment, index) => (
        <button
          key={appointment.appointment_id}
          onClick={() => onItemClick(appointment)}
          className="w-full bg-white rounded-2xl shadow-sm border-2 border-gray-100 
                   hover:border-blue-300 hover:shadow-md transition-all duration-300 p-4 
                   text-left group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{index === 0 ? '🏥' : '📋'}</span>
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 
                             transition-colors duration-200">
                  {appointment.exam?.title || '검사'}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-3 text-base text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {format(new Date(appointment.scheduled_at), 'HH:mm', { locale: ko })}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {appointment.exam?.building} {appointment.exam?.floor}층 {appointment.exam?.room}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium border
                              ${getStatusColor(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
                
                <span className="text-blue-600 font-medium group-hover:translate-x-1 
                               transition-transform duration-200 flex items-center gap-1">
                  자세히 보기
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}