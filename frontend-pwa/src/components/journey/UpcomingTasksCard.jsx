import { ClockIcon, MapPinIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function UpcomingTasksCard({ appointments }) {
  if (!appointments || appointments.length === 0) return null;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationString = (location) => {
    if (!location) return '';
    return `${location.building} ${location.floor} ${location.room}`.trim();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">예정된 검사/진료</h3>
      
      <div className="space-y-3">
        {appointments.map((appointment, index) => (
          <div
            key={appointment.appointment_id}
            className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {index + 1}. {appointment.exam.title}
                </h4>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{formatTime(appointment.scheduled_at)}</span>
                  </div>
                  
                  {appointment.exam.location && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{getLocationString(appointment.exam.location)}</span>
                    </div>
                  )}
                </div>

                {appointment.exam.duration && (
                  <p className="text-sm text-gray-500 mt-1">
                    예상 소요시간: 약 {appointment.exam.duration}분
                  </p>
                )}
              </div>
              
              <ChevronRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
            </div>

            {/* 준비사항이 있는 경우 표시 */}
            {appointment.exam.preparations?.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-amber-700 font-medium">
                  ⚠️ 준비사항 {appointment.exam.preparations.length}개 확인 필요
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {appointments.length > 3 && (
        <div className="mt-4 text-center">
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            전체 일정 보기
          </button>
        </div>
      )}
    </div>
  );
}