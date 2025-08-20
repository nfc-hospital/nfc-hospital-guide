import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function WaitingScreen({ taggedLocation, current_task, upcoming_tasks }) {
  const { user, currentQueues = [], todaysAppointments = [], patientState } = useJourneyStore();
  
  // 현재 대기 중인 큐 찾기
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'ongoing'
  );

  // 진행 중인 검사 찾기
  const ongoingAppointment = todaysAppointments.find(
    apt => apt.status === 'ongoing'
  );

  const currentExam = ongoingAppointment || activeQueue;
  const isOngoing = user?.state === 'ONGOING' || activeQueue?.state === 'ongoing';

  // 오늘의 일정 준비
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building} ${apt.exam?.floor}층 ${apt.exam?.room}`,
    status: apt.status,
    purpose: '건강 상태 확인 및 진단',
    preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at
  })) || [];
  
  // 현재 단계 계산
  const currentStep = todaySchedule.findIndex(s => 
    ['waiting', 'called', 'ongoing'].includes(s.status)
  );
  const actualCurrentStep = currentStep === -1 ? 0 : currentStep;
  
  // 대기 정보
  const waitingInfo = activeQueue ? {
    peopleAhead: activeQueue.queue_number || 0,
    estimatedTime: activeQueue.estimated_wait_time || 15
  } : null;
  
  // 위치 정보
  const locationInfo = currentExam?.exam ? {
    name: currentExam.exam.title,
    building: currentExam.exam.building,
    floor: `${currentExam.exam.floor}층`,
    room: currentExam.exam.room,
    directions: '대기실에서 잠시 기다려주세요. 곧 호출해드리겠습니다.'
  } : null;
  
  // 다음 행동 결정 - 환자가 waiting 상태인데 다음 검사실 근처에서 NFC를 찍었을 때
  const getNextAction = () => {
    // 현재 검사가 진행 중이면
    if (isOngoing) {
      return '검사가 진행 중입니다';
    }
    
    // 태그된 위치와 다음 검사실을 비교하여 결정
    if (taggedLocation && currentExam?.exam) {
      // 같은 건물, 같은 층이고 검사실 근처면
      if (taggedLocation.building === currentExam.exam.building && 
          taggedLocation.floor === currentExam.exam.floor) {
        return '대기실에서 잠시 기다려 주세요';
      }
    }
    
    // 기본값
    return '대기 번호를 기다려주세요';
  };

  return (
    <FormatATemplate
      screenType="waiting"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={getNextAction()}
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={activeQueue}
      taggedLocation={taggedLocation}
      patientState={patientState?.current_state || (isOngoing ? 'ONGOING' : 'WAITING')}
    >
      {/* 추가 콘텐츠 영역 - 상태별 안내 */}
      <div className="space-y-4">
        {isOngoing ? (
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🏥</div>
            <p className="text-lg text-green-800 font-medium">
              현재 검사가 진행 중입니다
            </p>
            <p className="text-sm text-green-600 mt-2">
              검사가 끝날 때까지 잠시만 기다려주세요
            </p>
          </div>
        ) : (
          <button className="w-full bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 
                           rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-lg font-semibold text-yellow-900">내 차례에 알림 받기</h4>
                <p className="text-sm text-yellow-700 mt-1">호출 시 스마트폰으로 알려드립니다</p>
              </div>
              <span className="text-2xl">🔔</span>
            </div>
          </button>
        )}
      </div>
    </FormatATemplate>
  );
}