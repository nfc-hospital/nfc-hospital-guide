import React from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getFacilityByName } from '../../data/facilityManagement';

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
  const currentExam = currentTask?.exam;
  
  // 오늘의 일정 준비 - exam의 description 필드 활용
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description, // exam의 description 필드 추가
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];
  
  // 현재 단계 계산
  const currentStep = todaySchedule.findIndex(s => 
    ['waiting', 'called', 'ongoing'].includes(s.status)
  );
  const actualCurrentStep = currentStep === -1 ? 0 : currentStep;
  
  // 대기 정보 - 실제 큐 데이터 사용
  const waitingInfo = activeQueue ? {
    peopleAhead: activeQueue.queue_number - 1 || 0,
    estimatedTime: activeQueue.estimated_wait_time || 15
  } : null;
  
  // 위치 정보 - 첫 번째 검사실
  const firstExam = todaysAppointments?.[0]?.exam;
  
  // facilityManagement에서 시설 정보 찾기
  const facilityData = firstExam ? getFacilityByName(firstExam.title) : null;
  
  const locationInfo = firstExam ? {
    name: firstExam.title,
    building: firstExam.building || '본관',
    floor: `${firstExam.floor || '2'}층`,
    room: firstExam.room,
    department: firstExam.department,
    directions: '엘리베이터를 타고 이동 후 안내 표지판을 따라가세요',
    mapFile: facilityData?.mapFile || 'main_1f.svg', // 지도 파일 추가
    svgId: facilityData?.svgId // SVG 요소 ID 추가
  } : null;

  return (
    <FormatATemplate
      screenType="registered"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={activeQueue}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || 'REGISTERED'}
      currentExam={currentExam}
    />
  );
}