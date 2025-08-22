import React, { useEffect } from 'react';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';

export default function PaymentScreen({ taggedLocation }) {
  const { user, todaysAppointments = [], patientState, currentQueues = [] } = useJourneyStore();
  
  // 개발 환경에서 데이터 확인
  if (import.meta.env.DEV) {
    console.log('💳 PaymentScreen 데이터:', {
      todaysAppointments,
      appointmentCount: todaysAppointments?.length || 0,
      patientState
    });
  }
  
  // 완료된 검사 목록
  const completedExams = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ) || [];
  
  // 오늘의 일정을 포맷 A에 맞게 변환 - exam의 description 필드 활용
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor ? apt.exam.floor + '층' : ''} ${apt.exam?.room || ''}`.trim(),
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];
  
  // 현재 단계 계산 - 수납 단계는 모든 검사 완료 후이므로 전체 길이
  const currentStep = todaySchedule.length;
  
  // 수납 대기 큐 찾기
  const paymentQueue = currentQueues.find(q => 
    q.exam?.department === '원무과' || q.exam?.title?.includes('수납')
  );
  
  // 위치 정보 - 원무과
  const locationInfo = {
    name: '원무과',
    building: '본관',
    floor: '1층',
    room: '중앙홀 우측',
    department: '원무과',
    directions: '엘리베이터로 1층 이동 후 오른쪽으로 가시면 됩니다'
  };
  
  // 수납 대기 정보 - 실제 큐 데이터가 있으면 사용
  const paymentInfo = paymentQueue ? {
    peopleAhead: Math.max(0, (paymentQueue.queue_number || 1) - 1),
    estimatedTime: paymentQueue.estimated_wait_time || 15
  } : {
    peopleAhead: 5,
    estimatedTime: 15
  };

  return (
    <FormatATemplate
      screenType="payment"
      currentStep={currentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={paymentInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || 'PAYMENT'}
      currentExam={null} // 수납은 검사가 아니므로 null
    >
      {/* 추가 콘텐츠 영역 - 수납 안내 */}
      <div className="space-y-4">
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