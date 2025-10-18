import { useState } from 'react';
import { ChevronRightIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function CurrentTaskCard({ appointment }) {
  const [checkedItems, setCheckedItems] = useState({});

  if (!appointment) return null;

  const { exam, scheduled_at, status, queue_info } = appointment;
  const preparations = exam?.preparations || [];

  const handleCheckToggle = (prepId) => {
    setCheckedItems(prev => ({
      ...prev,
      [prepId]: !prev[prepId]
    }));
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    const statusMap = {
      waiting: { text: '대기중', className: 'bg-amber-100 text-amber-800' },
      ongoing: { text: '진행중', className: 'bg-blue-100 text-blue-800' },
      scheduled: { text: '예정', className: 'bg-gray-100 text-gray-700' }
    };
    
    const statusInfo = statusMap[status] || statusMap.scheduled;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      {/* 헤더 섹션 */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-gray-600">{exam.department}</p>
        </div>
      </div>

      {/* 정보 섹션 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center text-gray-700">
          <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
          <span className="text-sm">예정 시간: {formatTime(scheduled_at)}</span>
        </div>
        {(exam.building || exam.floor || exam.room) && (
          <div className="flex items-center text-gray-700">
            <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
            <span className="text-sm">
              {exam.building} {exam.floor?.toString().endsWith('층') ? exam.floor : `${exam.floor}층`} {exam.room}
            </span>
          </div>
        )}
      </div>

      {/* 대기 정보 */}
      {queue_info && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">대기 번호</p>
              <p className="text-2xl font-bold text-blue-900">{queue_info.queue_number}번</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700">예상 대기시간</p>
              <p className="text-lg font-semibold text-blue-900">약 {queue_info.estimated_wait_time}분</p>
            </div>
          </div>
        </div>
      )}

      {/* 검사 준비사항 체크리스트 */}
      {preparations.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-primary-600" />
            검사 전 준비사항
          </h4>
          <div className="space-y-3">
            {preparations.map((prep) => (
              <div
                key={prep.prep_id}
                className={`flex items-start p-4 rounded-xl transition-all ${
                  checkedItems[prep.prep_id] 
                    ? 'bg-gray-100/70 scale-[0.98]' 
                    : 'hover:bg-blue-50/50 hover:scale-[1.01]'
                } border-2 ${checkedItems[prep.prep_id] ? 'border-green-300' : 'border-gray-200'}`}
              >
                <div className="flex-1">
                  <h5 className={`text-lg font-bold mb-1.5 flex items-center gap-2 ${
                    checkedItems[prep.prep_id] ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}>
                    {prep.title}
                    {prep.is_required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">필수</span>
                    )}
                  </h5>
                  {prep.description && (
                    <p className={`text-sm text-gray-600 leading-relaxed ${
                      checkedItems[prep.prep_id] ? 'line-through' : ''
                    }`}>
                      {prep.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCheckToggle(prep.prep_id)}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-300 transform flex-shrink-0 ml-4 ${
                    checkedItems[prep.prep_id] 
                      ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg' 
                      : 'bg-gray-50 border-gray-500 hover:bg-gray-100 hover:border-gray-700 hover:scale-105 shadow-sm'
                  }`}
                >
                  {checkedItems[prep.prep_id] && (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500 italic">
            * 체크리스트는 개인 확인용이며, 서버에 저장되지 않습니다.
          </p>
        </div>
      )}

      {/* 액션 버튼 */}
      <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center transition-colors text-lg">
        검사실로 이동
        <ChevronRightIcon className="h-5 w-5 ml-2" />
      </button>
    </div>
  );
}