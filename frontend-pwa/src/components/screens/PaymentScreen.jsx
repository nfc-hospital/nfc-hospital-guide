import React from 'react';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';

export default function PaymentScreen({ taggedLocation }) {
  const { user, todaysAppointments, patientState } = useJourneyStore();
  
  // 완료된 검사 목록
  const completedExams = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ) || [];
  
  // 오늘의 일정을 포맷 A에 맞게 변환
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building} ${apt.exam?.floor}층 ${apt.exam?.room}`,
    status: apt.status,
    purpose: '건강 상태 확인 및 진단',
    preparation: null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at
  })) || [];
  
  // 수납 단계는 모든 검사가 완료된 후이므로 마지막 단계
  const currentStep = todaySchedule.length - 1;
  
  // 위치 정보 - 원무과
  const locationInfo = {
    name: '원무과',
    building: '본관',
    floor: '1층',
    room: '중앙홀 우측',
    directions: '엘리베이터로 1층 이동 후 오른쪽으로 가시면 됩니다'
  };
  
  // 수납 정보
  const paymentInfo = {
    peopleAhead: 5,
    estimatedTime: 15
  };

  return (
    <FormatATemplate
      screenType="payment"
      currentStep={currentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction="원무과에서 수납하기"
      waitingInfo={paymentInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      taggedLocation={taggedLocation}
      patientState={patientState?.current_state || 'PAYMENT'}
    >
      {/* 추가 콘텐츠 영역 - 수납 안내 */}
      <div className="space-y-4">
        {/* 검사 완료 현황 */}
        <div className="bg-green-50 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-lg text-green-800 font-medium">
            모든 검사가 완료되었습니다
          </p>
          <p className="text-xl text-green-900 font-bold mt-2">
            완료된 검사: {completedExams.length}건
          </p>
        </div>
        
        {/* 수납 절차 안내 */}
        <div className="bg-amber-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">
            💳 수납 절차
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <p className="text-sm text-amber-800">원무과에서 대기번호표를 받으세요</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p className="text-sm text-amber-800">번호가 호출되면 창구로 가세요</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p className="text-sm text-amber-800">수납 후 영수증을 받아 보관하세요</p>
            </div>
          </div>
        </div>
        
        {/* 문의 정보 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center">
          <p className="text-sm text-gray-600">문의사항이 있으신가요?</p>
          <p className="text-lg font-bold text-gray-900 mt-1">📞 02-1234-5678</p>
        </div>
      </div>
    </FormatATemplate>
  );
}