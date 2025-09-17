import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ExamPreparationChecklist from "../../ExamPreparationChecklist";
import { MapPinIcon, PhoneIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import useJourneyStore from '../../../store/journeyStore';

/**
 * ArrivedContent - 병원 도착 상태의 순수 컨텐츠 컴포넌트
 * Store에서 직접 필요한 데이터를 구독하여 Props Drilling 완전 제거
 */
const ArrivedContent = () => {
  // 🎯 Store에서 필요한 데이터 직접 구독
  const user = useJourneyStore(state => state.user);
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments || []);
  const patientState = useJourneyStore(state => state.patientState);
  const locationInfo = useJourneyStore(state => state.locationInfo);
  
  // 개발 모드에서만 데이터 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 ArrivedContent 직접 구독 데이터:', { 
      user: user?.name, 
      appointments: todaysAppointments?.length,
      patientState,
      locationInfo: locationInfo?.name
    });
  }
  const navigate = useNavigate();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [allRequiredCompleted, setAllRequiredCompleted] = useState(false);

  // 예약 변경 요청 핸들러
  const handleRescheduleRequest = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  // 완료 상태 변경 핸들러
  const handleCompletionChange = (isCompleted) => {
    setAllRequiredCompleted(isCompleted);
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
              <span className="font-bold">
                {selectedAppointment.exam?.title}
              </span>{" "}
              검사의 준비사항을 지키지 못하신 경우, 검사를 진행할 수 없을 수
              있습니다.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = "tel:02-1234-5678")}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg"
            >
              <PhoneIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">병원에 전화하기</span>
            </button>

            <button
              onClick={() => {
                setShowRescheduleModal(false);
                navigate("/public", { state: { showReception: true } });
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

  return (
    <>
      <div className="space-y-6">
        {/* 도착 환영 메시지 */}
        <div className="bg-blue-50 rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <CheckCircleIcon className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-lg text-blue-800 font-medium">
            {user?.name}님, 병원에 오신 것을 환영합니다
          </p>
          <p className="text-sm text-blue-600 mt-2">
            접수를 위해 {locationInfo?.name || '원무과'}로 이동해주세요
          </p>
        </div>

        {/* 접수 위치 안내 */}
        <div className="bg-green-50 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-green-800">
                접수 위치: {locationInfo?.name || '원무과 접수처'}
              </h3>
              <p className="text-green-600 mt-1">
                {locationInfo?.building || '본관'} {locationInfo?.floor || '1층'} {locationInfo?.room || '중앙홀'}
              </p>
              {locationInfo?.directions && (
                <p className="text-sm text-green-500 mt-2">
                  {locationInfo.directions}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 검사별 준비사항 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-bold text-gray-900">검사별 준비사항</h3>
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

        {/* 기본 준비사항 안내 */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            📄 공통 서류 준비사항
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 신분증 (주민등록증, 운전면허증)</li>
            <li>• 건강보험증</li>
            <li>• 의뢰서 (타 병원에서 온 경우)</li>
            <li>• 이전 검사 결과지 (있는 경우)</li>
          </ul>
        </div>
      </div>

      <RescheduleModal />
    </>
  );
};

ArrivedContent.displayName = 'ArrivedContent';

export default ArrivedContent;