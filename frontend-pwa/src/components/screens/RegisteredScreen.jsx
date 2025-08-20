import React from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function RegisteredScreen({ taggedLocation, current_task, upcoming_tasks }) {
  const navigate = useNavigate();
  const { user, todaysAppointments, currentQueues = [], patientState } = useJourneyStore();
  
  // 현재 진행중인 검사 찾기
  const currentFromAppointments = todaysAppointments?.find(apt => 
    ['waiting', 'called', 'ongoing'].includes(apt.status)
  );
  
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'ongoing'
  );
  
  const currentTask = currentFromAppointments || activeQueue || current_task;
  
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
  const locationInfo = currentTask?.exam ? {
    name: currentTask.exam.title,
    building: currentTask.exam.building,
    floor: `${currentTask.exam.floor}층`,
    room: currentTask.exam.room,
    directions: '엘리베이터를 타고 이동 후 안내 표지판을 따라가세요'
  } : null;

  return (
    <FormatATemplate
      screenType="registered"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={locationInfo ? `${locationInfo.name}로 이동하기` : '검사실로 이동하기'}
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={activeQueue}
      taggedLocation={taggedLocation}
      patientState={patientState?.current_state || 'REGISTERED'}
    />
  );
}