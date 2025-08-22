import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';
import ExamPreparationChecklist from '../ExamPreparationChecklist';
import { MapPinIcon, PhoneIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function ArrivedScreen({ taggedLocation }) {
  const navigate = useNavigate();
  const { user, todaysAppointments = [], fetchJourneyData, patientState } = useJourneyStore();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [allRequiredCompleted, setAllRequiredCompleted] = useState(false);
  const [expandedReceptionGuide, setExpandedReceptionGuide] = useState(false);

  // 다음 일정 정보 (첫 번째 예약)
  const nextSchedule = todaysAppointments.length > 0 
    ? `${new Date(todaysAppointments[0].scheduled_at).toLocaleDateString('ko-KR')} ${new Date(todaysAppointments[0].scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : '예정된 일정 없음';

  // 상단 요약 카드
  const summaryCards = [
    { label: '접수 마감 시간', value: '16:30' },
    { label: '예상 대기 시간', value: '약 10분' }
  ];

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

  // 오늘의 일정을 포맷 A에 맞게 변환
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor ? apt.exam.floor + '층' : ''} ${apt.exam?.room || ''}`.trim(),
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];
  
  // 현재 단계 계산 - ARRIVED 상태는 도착 완료, 접수 대기 중이므로 1
  const currentStep = 1;
  
  // 위치 정보 설정
  const locationInfo = {
    name: '원무과 접수처',
    building: '본관',
    floor: '1층',
    room: '중앙홀 좌측',
    department: '원무과',
    directions: '정문으로 들어오셔서 왼쪽으로 가시면 됩니다',
    mapFile: 'main_1f.svg'
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
      <FormatATemplate
        screenType="arrived"
        currentStep={currentStep}
        totalSteps={todaySchedule.length || 7}
        nextAction="원무과에서 접수하기"
        waitingInfo={null}
        locationInfo={locationInfo}
        todaySchedule={todaySchedule}
        taggedLocation={taggedLocation}
        patientState={user?.state || patientState || 'ARRIVED'}
        currentExam={null}
        preparationItems={customPreparationContent}
      />
      <RescheduleModal />
    </>
  );
}