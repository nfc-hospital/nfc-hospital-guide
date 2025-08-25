import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormatBTemplate from '../templates/FormatBTemplate';
import ExamPreparationChecklist from '../ExamPreparationChecklist';
import { MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';

export default function UnregisteredScreen({ 
  // props로 받은 데이터들
  taggedLocation,
  user,
  todaysAppointments = [],
  fetchJourneyData,
  nextSchedule,
  summaryCards
}) {
  const navigate = useNavigate();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [allRequiredCompleted, setAllRequiredCompleted] = useState(false);

  // 컴포넌트 마운트 시 예약 데이터 확인
  React.useEffect(() => {
    console.log('🔍 UnregisteredScreen - todaysAppointments:', todaysAppointments);
    console.log('🔍 UnregisteredScreen - user:', user);
  }, [todaysAppointments, user]);

  // 오늘의 일정 준비
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: null, // 준비사항 문구 제거
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];

  // 예약 변경 요청 핸들러
  const handleRescheduleRequest = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  // 예약 변경 모달 컴포넌트
  const RescheduleModal = () => {
    if (!showRescheduleModal || !selectedAppointment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-[scale-in_0.3s_ease-out]">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            예약 변경이 필요하신가요?
          </h3>
          
          <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-amber-800">
              <span className="font-bold">{selectedAppointment.exam?.title}</span> 검사의 
              준비사항을 지키지 못하신 경우, 검사를 진행할 수 없을 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = 'tel:02-1234-5678'}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg"
            >
              <PhoneIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">병원에 전화하기</span>
            </button>

            <button
              onClick={() => {
                setShowRescheduleModal(false);
                navigate('/public', { state: { showReception: true } });
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <MapPinIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">접수창구 위치 보기</span>
            </button>

            <button
              onClick={() => setShowRescheduleModal(false)}
              className="w-full px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 기본 준비사항 (공통)
  const preparationItems = [
    {
      icon: '📄',
      title: '공통 서류 준비사항',
      description: '모든 검사에 필요한 서류입니다',
      items: [
        { text: '신분증 (주민등록증, 운전면허증)' },
        { text: '건강보험증' },
        { text: '의뢰서 (타 병원에서 온 경우)' },
        { text: '이전 검사 결과지 (있는 경우)' }
      ]
    }
  ];

  // 완료 상태 변경 핸들러
  const handleCompletionChange = (isCompleted) => {
    setAllRequiredCompleted(isCompleted);
  };

  // 검사별 준비사항을 준비사항 탭 내용으로 포함
  const customPreparationContent = (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          검사별 준비사항
        </h3>
        {allRequiredCompleted && (
          <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-bold animate-[scale-in_0.3s_ease-out]">
            준비 완료!
          </span>
        )}
      </div>
      <ExamPreparationChecklist 
        appointments={todaysAppointments}
        onRescheduleRequest={handleRescheduleRequest}
        onCompletionChange={handleCompletionChange}
      />
    </div>
  );

  return (
    <>
      <FormatBTemplate
        screenType="unregistered"
        status="접수 전"
        nextSchedule={nextSchedule}
        summaryCards={summaryCards}
        todaySchedule={todaySchedule}
        actionButtons={[
          {
            text: '병원 찾아오기',
            icon: '🗺️',
            variant: 'primary',
            onClick: () => navigate('/public', { state: { showMap: true } })
          },
          {
            text: '전화 문의',
            icon: '📞',
            variant: 'secondary',
            onClick: () => window.location.href = 'tel:02-1234-5678'
          }
        ]}
        taggedLocation={taggedLocation}
        preparationItems={preparationItems}
        customPreparationContent={customPreparationContent}
      />
      <RescheduleModal />
    </>
  );
}