import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import useMapStore from '../../store/mapStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getFacilityByName } from '../../data/facilityManagement';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

// 무한 렌더링 방지를 위한 안정적인 상수 (컴포넌트 외부에 선언)
const EMPTY_NODES = [];
const EMPTY_EDGES = [];

export default function WaitingScreen({ taggedLocation }) {
  // Store에서 필요한 데이터 가져오기 (구조 분해 사용)
  const { 
    user, 
    patientState,
    getTodaysScheduleForUI,
    getCurrentTask,
    getWaitingInfo
  } = useJourneyStore();
  
  // mapStore에서 경로 정보 가져오기
  const {
    activeRoute,
    navigationRoute,
    currentLocation,
    updateRouteBasedOnLocation
  } = useMapStore();
  
  // 계산된 상태들을 store에서 직접 가져오기
  const todaySchedule = getTodaysScheduleForUI();
  const currentTask = getCurrentTask();
  const waitingInfo = getWaitingInfo();
  
  const currentExam = currentTask?.exam;
  const isOngoing = patientState === 'ONGOING';
  const isCalled = patientState === 'CALLED';
  
  // 현재 단계 계산
  const currentStep = todaySchedule.findIndex(s => 
    ['waiting', 'called', 'ongoing'].includes(s.status)
  );
  const actualCurrentStep = currentStep === -1 ? 0 : currentStep;
  
  
  // facilityManagement에서 시설 정보 찾기
  const facilityData = currentExam ? getFacilityByName(currentExam.title) : null;
  
  // 검사 정보가 없으면 기본값 사용
  const targetExam = currentExam || todaySchedule?.[0]?.exam || {
    title: '채혈실',
    building: '본관',
    floor: '1',
    room: '채함실 대기실',
    department: '진단검사의학과'
  };
  
  const locationInfo = {
    name: targetExam.title,
    building: targetExam.building || '본관',
    floor: `${targetExam.floor || '1'}층`,
    room: targetExam.room || '채혈실 대기실',
    department: targetExam.department || '진단검사의학과',
    directions: isCalled ? '검사실로 입장해주세요' : '대기실에서 잠시 기다려주세요. 곧 호출해드리겠습니다.',
    mapFile: facilityData?.mapFile || 'main_1f.svg',
    svgId: facilityData?.svgId || 'blood-test-waiting',
    mapId: 'main_1f',
    // 실제 백엔드 데이터 사용
    x_coord: targetExam.x_coord || 340,
    y_coord: targetExam.y_coord || 210,
    // mapStore의 현재 위치 사용
    currentLocation: currentLocation || {
      x_coord: targetExam.x_coord || 340,
      y_coord: targetExam.y_coord || 210,
      building: targetExam.building || '본관',
      floor: targetExam.floor || '1',
      room: targetExam.room || '대기실'
    },
    // mapStore에서 pre-drawn 경로 데이터 사용
    pathNodes: navigationRoute?.nodes || activeRoute?.nodes || EMPTY_NODES,  // ✅ 안정적인 상수 사용
    pathEdges: navigationRoute?.edges || activeRoute?.edges || EMPTY_EDGES   // ✅ 안정적인 상수 사용
  };
  
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
      queueData={currentTask}
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