import { CheckCircleIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function CompletedTaskCard({ appointment }) {
  if (!appointment) return null;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationString = (exam) => {
    if (!exam) return '';
    const parts = [exam.building, exam.floor && `${exam.floor}층`, exam.room].filter(Boolean);
    return parts.join(' ');
  };

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-green-900 mb-2">
            {appointment.exam.title} 완료
          </h3>
          
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-green-600" />
              <span>완료 시간: {formatTime(appointment.scheduled_at)}</span>
            </div>
            
            {getLocationString(appointment.exam) && (
              <div className="flex items-center">
                <span className="text-green-700">
                  장소: {getLocationString(appointment.exam)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
            <p className="text-gray-700 font-medium mb-1">다음 단계 안내</p>
            <p className="text-sm text-gray-600">
              검사 결과는 담당 의료진이 확인 후 안내해 드립니다.
              대기실에서 잠시 기다려 주세요.
            </p>
          </div>

          {/* 결과 확인 가능한 경우 */}
          {appointment.has_result && (
            <button className="mt-4 flex items-center text-green-700 hover:text-green-800 font-medium">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              검사 결과 확인하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}