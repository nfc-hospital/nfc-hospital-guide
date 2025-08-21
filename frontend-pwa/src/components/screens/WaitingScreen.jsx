import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getFacilityByName } from '../../data/facilityManagement';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function WaitingScreen({ taggedLocation, current_task, upcoming_tasks }) {
  const { user, currentQueues = [], todaysAppointments = [], patientState } = useJourneyStore();
  
  // 현재 대기 중인 큐 찾기
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'called' || q.state === 'ongoing'
  );

  // 진행 중인 검사 찾기 - waiting, called, ongoing 상태 모두 포함
  const currentAppointment = todaysAppointments.find(
    apt => ['waiting', 'called', 'ongoing'].includes(apt.status)
  );

  const currentExam = currentAppointment?.exam || activeQueue?.exam;
  const isOngoing = patientState === 'ONGOING' || activeQueue?.state === 'ongoing';
  const isCalled = patientState === 'CALLED' || activeQueue?.state === 'called';

  // 오늘의 일정 준비 - exam의 description 필드 활용
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description,
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
    peopleAhead: Math.max(0, (activeQueue.queue_number || 1) - 1),
    estimatedTime: activeQueue.estimated_wait_time || 15
  } : null;
  
  // 위치 정보
  // facilityManagement에서 시설 정보 찾기
  const facilityData = currentExam ? getFacilityByName(currentExam.title) : null;
  
  const locationInfo = currentExam ? {
    name: currentExam.title,
    building: currentExam.building || '본관',
    floor: `${currentExam.floor || '2'}층`,
    room: currentExam.room,
    department: currentExam.department,
    directions: isCalled ? '검사실로 입장해주세요' : '대기실에서 잠시 기다려주세요. 곧 호출해드리겠습니다.',
    mapFile: facilityData?.mapFile || 'main_1f.svg', // 지도 파일 추가
    svgId: facilityData?.svgId // SVG 요소 ID 추가
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
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={activeQueue}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || (isOngoing ? 'ONGOING' : isCalled ? 'CALLED' : 'WAITING')}
      currentExam={currentExam}
    >
      {/* 추가 콘텐츠 영역 - 상태별 안내 */}
      <div className="space-y-4">
        {isOngoing && (
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-3">
              <ClipboardDocumentCheckIcon className="w-16 h-16 text-green-600" />
            </div>
            <p className="text-lg text-green-800 font-medium">
              현재 {currentExam?.title || '검사'}가 진행 중입니다
            </p>
            <p className="text-sm text-green-600 mt-2">
              검사가 끝날 때까지 잠시만 기다려주세요
            </p>
          </div>
        )}
      </div>
    </FormatATemplate>
  );
}