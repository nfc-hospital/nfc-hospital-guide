// src/components/JourneyContainer.jsx
import React, { useEffect, useMemo } from 'react';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import { getFacilityByName } from '../data/facilityManagement';
import { PatientJourneyState } from '../constants/states';

// Content 컴포넌트 imports
import UnregisteredContent from './journey/contents/UnregisteredContent';
import ArrivedContent from './journey/contents/ArrivedContent';
import RegisteredContent from './journey/contents/RegisteredContent';
import WaitingContent from './journey/contents/WaitingContent';
import FinishedContent from './journey/contents/FinishedContent';
import PaymentContent from './journey/contents/PaymentContent';

// Template imports
import FormatATemplate from './templates/FormatATemplate';
import FormatBTemplate from './templates/FormatBTemplate';

// 컴포넌트 외부에 상수 선언 (무한 렌더링 방지)
const EMPTY_NODES = [];
const EMPTY_EDGES = [];

// 상태별 컴포넌트 매핑 (Template + Content 조합)
const getJourneyComponents = (patientState) => {
  switch (patientState) {
    case PatientJourneyState.UNREGISTERED:
      return {
        Template: FormatBTemplate,
        Content: UnregisteredContent,
        screenType: 'unregistered'
      };
    
    case PatientJourneyState.ARRIVED:
      return {
        Template: FormatATemplate,
        Content: ArrivedContent,
        screenType: 'arrived'
      };
    
    case PatientJourneyState.REGISTERED:
      return {
        Template: FormatATemplate,
        Content: RegisteredContent,
        screenType: 'registered'
      };
    
    case PatientJourneyState.WAITING:
    case PatientJourneyState.CALLED:
    case PatientJourneyState.IN_PROGRESS:
      return {
        Template: FormatATemplate,
        Content: WaitingContent,
        screenType: 'waiting'
      };
    
    case PatientJourneyState.COMPLETED:
      return {
        Template: FormatATemplate,
        Content: RegisteredContent, // 완료 후 다음 검사 안내
        screenType: 'registered'
      };
    
    case PatientJourneyState.PAYMENT:
      return {
        Template: FormatATemplate,
        Content: PaymentContent,
        screenType: 'payment'
      };
    
    case PatientJourneyState.FINISHED:
      return {
        Template: FormatBTemplate,
        Content: FinishedContent,
        screenType: 'finished'
      };
    
    default:
      return {
        Template: FormatBTemplate,
        Content: UnregisteredContent,
        screenType: 'unregistered'
      };
  }
};

const JourneyContainer = ({ taggedLocation }) => {
  // 1. Store에서 필요한 기본 데이터만 선택 (selector 함수로 대체된 것들 제거)
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const isLoading = useJourneyStore(state => state.isLoading);
  const fetchJourneyData = useJourneyStore(state => state.fetchJourneyData);
  
  // Store에서 중앙화된 계산값 가져오기 (레거시 맵 관련 데이터)
  const storeNextExam = useJourneyStore(state => state.nextExam);
  const storeLocationInfo = useJourneyStore(state => state.locationInfo);
  
  // mapStore에서 원본 데이터를 개별적으로 선택 (무한 루프 방지)
  const currentLocation = useMapStore(state => state.currentLocation);
  const destinationLocation = useMapStore(state => state.destinationLocation);
  const navigationRoute = useMapStore(state => state.navigationRoute);
  const activeRoute = useMapStore(state => state.activeRoute);
  const departmentZones = useMapStore(state => state.departmentZones);
  const mapMetadata = useMapStore(state => state.mapMetadata);
  const currentFloorMap = useMapStore(state => state.currentFloorMap);
  const currentFloorNodes = useMapStore(state => state.currentFloorNodes);
  const loadMapMetadata = useMapStore(state => state.loadMapMetadata);
  const loadFloorMap = useMapStore(state => state.loadFloorMap);
  const loadDepartmentZones = useMapStore(state => state.loadDepartmentZones);
  const updateRouteBasedOnLocation = useMapStore(state => state.updateRouteBasedOnLocation);
  
  // 2. Store에서 기본 데이터만 직접 가져오기 (selector 제거)
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments || []);
  const currentTask = useJourneyStore(state => state.currentTask);
  const currentExam = useJourneyStore(state => state.currentExam);
  
  // 간단한 계산들 (로컬에서)
  const todaySchedule = todaysAppointments;
  const waitingInfo = currentTask;
  const isInProgress = currentTask?.state === 'ongoing';
  const isCalled = currentTask?.state === 'called';
  const actualCurrentStep = 0; // 단순화
  
  // Store에서 계산된 nextExam 사용 (중복 계산 제거)
  const nextExam = storeNextExam;
  
  // facilityManagement에서 시설 정보 찾기 (단순화)
  const facilityData = storeNextExam ? getFacilityByName(storeNextExam?.title) : null;
  
  // 컴포넌트 마운트 시 지도 데이터 로드
  useEffect(() => {
    loadMapMetadata();
    loadDepartmentZones({ building: '본관' });
  }, [loadMapMetadata, loadDepartmentZones]); // 함수 의존성 추가
  
  // 층 지도 로드 (storeNextExam이 바뀔 때)
  useEffect(() => {
    if (!storeNextExam) return;
    
    const floor = storeNextExam.floor || '1';
    const building = storeNextExam.building || '본관';
    const floorId = `${building.toLowerCase().replace(' ', '_')}_${floor}f`;
    
    loadFloorMap(floorId);
  }, [storeNextExam?.exam_id, loadFloorMap]); // storeNextExam 사용으로 변경
  
  
  // 목적지 노드 찾기 (단순화)
  const targetNode = currentFloorNodes?.find(
    node => node.exam?.exam_id === storeNextExam?.exam_id ||
            node.name?.includes(storeNextExam?.title) ||
            node.room === storeNextExam?.room
  );
  
  // 현재 위치 노드 찾기 (단순화)
  const currentNode = currentFloorNodes?.find(
    node => node.name?.includes('로비') || 
            node.name?.includes('정문') ||
            node.node_type === 'entrance'
  );
  
  // SVG 크기 정보 가져오기 (단순화)
  const mapInfo = mapMetadata?.find(
    m => m.building === storeNextExam?.building && m.floor === parseInt(storeNextExam?.floor || '1')
  );
  const svgWidth = mapInfo?.width || 900;
  const svgHeight = mapInfo?.height || 600;
  
  // 실제 hospital_navigation 경로 사용 (단순화)
  const stablePathNodes = activeRoute?.path_nodes || navigationRoute?.nodes || EMPTY_NODES;
  
  const stablePathEdges = activeRoute?.path_edges || navigationRoute?.edges || EMPTY_EDGES;

  // locationInfo 단순화 (Store 값 우선 사용)
  const locationInfo = storeLocationInfo || {
    name: nextExam?.title || '위치 정보 없음',
    building: nextExam?.building || '본관',
    floor: nextExam?.floor ? `${nextExam.floor}층` : '1층',
    room: nextExam?.room || nextExam?.title || '',
    department: nextExam?.department || '',
    directions: '안내 데스크로 문의해주세요',
    pathNodes: stablePathNodes,
    pathEdges: stablePathEdges
  };
  
  // 더 이상 사용하지 않는 getNextAction 로직 제거

  // 완료 통계도 단순화
  const completedApps = todaysAppointments.filter(apt => 
    apt.status === 'completed' || apt.status === 'examined'
  );
  const completionStats = {
    completedCount: completedApps.length,
    totalCount: todaysAppointments.length
  };
  
  // 사용하지 않는 legacy 데이터들 제거 (컴포넌트들이 store에서 직접 가져오므로 불필요)
  
  
  // 더 이상 사용하지 않는 legacy Screen 컴포넌트 imports 제거
  
  // 더 이상 사용하지 않는 legacy commonProps 제거 (Template + Content 기반 렉더링 사용)
  
  // 🎯 새로운 동적 렌더링 로직: Template + Content 조합
  const currentState = patientState?.current_state || patientState || PatientJourneyState.REGISTERED;
  
  // 상태에 따른 컴포넌트 선택
  const { Template, Content, screenType } = getJourneyComponents(currentState);
  
  // 모든 상태에서 공통으로 사용할 Template props
  const templateProps = {
    screenType,
    currentStep: actualCurrentStep,
    totalSteps: todaySchedule?.length || 7,
    nextAction: null, // 템플릿에서 자동 생성
    waitingInfo,
    locationInfo,
    todaySchedule,
    queueData: currentTask,
    taggedLocation,
    patientState: currentState,
    currentExam,
    completionStats
  };
  
  // Content 컴포넌트에 전달할 모든 데이터를 contentProps로 묶기
  const contentProps = useMemo(() => ({
    // 사용자 정보
    user,
    patientState: currentState,
    
    // 예약/검사 정보
    todaysAppointments,
    currentTask,
    currentExam,
    
    // 계산된 값들
    completionStats,
    locationInfo,
    nextExam,
    
    // 위치 정보
    taggedLocation,
    
    // UI 상태
    isLoading,
    error: null,
    
    // 기타 필요한 데이터
    waitingInfo,
    isInProgress,
    isCalled,
    actualCurrentStep
  }), [user, currentState, todaysAppointments, currentTask, currentExam, completionStats, locationInfo, nextExam, taggedLocation, isLoading, waitingInfo, isInProgress, isCalled, actualCurrentStep]);
  
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Template {...templateProps}>
        <Content {...contentProps} />
      </Template>
    </React.Suspense>
  );
};

export default JourneyContainer;