import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import useMapStore from '../../store/mapStore';
import FormatATemplate from '../templates/FormatATemplate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getFacilityByName } from '../../data/facilityManagement';

// 컴포넌트 외부에 상수 선언 (무한 렌더링 방지)
const EMPTY_NODES = [];
const EMPTY_EDGES = [];

export default function RegisteredScreen({ taggedLocation }) {
  const navigate = useNavigate();
  
  // Store에서 필요한 데이터 가져오기 (구조 분해 사용)
  const { 
    user, 
    patientState,
    getTodaysScheduleForUI,
    getCurrentTask,
    getWaitingInfo,
    getNextExam
  } = useJourneyStore();
  
  // 계산된 상태들을 store에서 직접 가져오기
  const todaySchedule = getTodaysScheduleForUI();
  const currentTask = getCurrentTask();
  const waitingInfo = getWaitingInfo();
  
  // mapStore에서 지도/네비게이션 데이터
  const {
    currentLocation,
    destinationLocation,
    navigationRoute,
    activeRoute,
    departmentZones,
    mapMetadata,
    currentFloorMap,
    currentFloorNodes,
    loadMapMetadata,
    loadFloorMap,
    loadDepartmentZones
  } = useMapStore();
  
  const currentExam = currentTask?.exam;
  
  // 현재 단계 계산
  const currentStep = todaySchedule.findIndex(s => 
    ['waiting', 'called', 'ongoing'].includes(s.status)
  );
  const actualCurrentStep = currentStep === -1 ? 0 : currentStep;
  
  // store의 getNextExam 함수 사용
  const nextExam = getNextExam();
  
  // facilityManagement에서 시설 정보 찾기
  const facilityData = nextExam ? getFacilityByName(nextExam.title) : null;
  
  // 첫 번째 검사실 정보가 없으면 기본값 사용
  const targetExam = nextExam || {
    title: '채혈실',
    building: '본관',
    floor: '1',
    room: '채혈실',
    department: '진단검사의학과'
  };
  
  // 컴포넌트 마운트 시 지도 데이터 로드
  useEffect(() => {
    loadMapMetadata();
    loadDepartmentZones({ building: '본관' });
  }, []); // 한 번만 실행
  
  // 층 지도 로드 (대상 검사가 바뀔 때)
  useEffect(() => {
    if (!targetExam) return;
    
    const floor = targetExam.floor || '1';
    const building = targetExam.building || '본관';
    const floorId = `${building.toLowerCase().replace(' ', '_')}_${floor}f`;
    
    loadFloorMap(floorId);
  }, [targetExam?.exam_id]); // 대상 검사 ID가 바뀔 때만
  
  // 경로 계산은 향후 mapStore에서 구현될 예정

  // 목적지 노드 찾기 (currentFloorNodes에서 직접 검색)
  const targetNode = currentFloorNodes?.find(
    node => node.exam?.exam_id === targetExam.exam_id ||
            node.name?.includes(targetExam.title) ||
            node.room === targetExam.room
  );
  
  // 현재 위치 노드 찾기
  const currentNode = currentFloorNodes?.find(
    node => node.name?.includes('로비') || 
            node.name?.includes('정문') ||
            node.node_type === 'entrance'
  );
  
  // SVG 크기 정보 가져오기 (직접 계산으로 변경)
  const mapInfo = mapMetadata?.find(
    m => m.building === targetExam.building && m.floor === parseInt(targetExam.floor)
  );
  const svgWidth = mapInfo?.width || 900;
  const svgHeight = mapInfo?.height || 600;
  
  // 실제 목적지 정보 (hospital_navigation 데이터 우선)
  const actualDestination = destinationLocation || {
    exam: targetExam,
    building: targetExam.building,
    floor: targetExam.floor,
    room: targetExam.room,
    x_coord: targetNode?.x_coord || (svgWidth * 0.67),  // 노드 좌표 또는 비율 기반 기본값
    y_coord: targetNode?.y_coord || (svgHeight * 0.5)   // 노드 좌표 또는 비율 기반 기본값
  };
  
  // 실제 hospital_navigation 경로 사용
  const stablePathNodes = React.useMemo(() => {
    // 백엔드에서 계산된 경로 우선 사용
    if (activeRoute?.path_nodes) return activeRoute.path_nodes;
    if (navigationRoute?.nodes) return navigationRoute.nodes;
    
    // 백엔드 경로가 없으면 동적 생성 (최소한의 fallback)
    if (currentNode && targetNode) {
      return [
        { 
          id: 'current', 
          x: currentNode.x_coord || currentLocation?.x_coord, 
          y: currentNode.y_coord || currentLocation?.y_coord, 
          name: '현재 위치',
          node_type: 'current_location'
        },
        { 
          id: 'target', 
          x: targetNode.x_coord || actualDestination.x_coord, 
          y: targetNode.y_coord || actualDestination.y_coord, 
          name: targetExam.title,
          node_type: 'exam_room'
        }
      ];
    }
    return EMPTY_NODES;
  }, [
    activeRoute?.route_id,
    navigationRoute?.route_id, 
    currentNode?.node_id, 
    currentNode?.x_coord, 
    currentNode?.y_coord,
    targetNode?.node_id,
    targetNode?.x_coord, 
    targetNode?.y_coord,
    currentLocation?.x_coord,
    currentLocation?.y_coord,
    actualDestination?.x_coord,
    actualDestination?.y_coord,
    targetExam?.title
  ]);
  
  const stablePathEdges = React.useMemo(() => {
    // 백엔드에서 계산된 경로 우선 사용
    if (activeRoute?.path_edges) return activeRoute.path_edges;
    if (navigationRoute?.edges) return navigationRoute.edges;
    
    // fallback: 단순 직선 경로
    if (currentNode && targetNode) return [['current', 'target']];
    return EMPTY_EDGES;
  }, [
    activeRoute?.route_id,
    navigationRoute?.route_id,
    currentNode?.node_id,
    targetNode?.node_id
  ]);

  // P-3 시나리오: hospital_navigation 데이터 기반 동적 위치 정보
  const locationInfo = {
    name: actualDestination.exam?.title || targetExam.title,
    building: actualDestination.building || targetExam.building || '본관',
    floor: actualDestination.floor ? `${actualDestination.floor}층` : `${targetExam.floor || '1'}층`,
    room: actualDestination.room || targetExam.room || '채혈실',
    department: actualDestination.exam?.department || targetExam.department || '진단검사의학과',
    directions: activeRoute ? '경로 안내를 따라 이동하세요' : '엘리베이터를 타고 이동 후 안내 표지판을 따라가세요',
    mapFile: facilityData?.mapFile || 'main_1f.svg',
    svgId: targetNode?.node_id || facilityData?.svgId || 'blood-test-room',
    mapId: `${actualDestination.building?.toLowerCase() || 'main'}_${actualDestination.floor || '1'}f`,
    // 실제 좌표 데이터 (hospital_navigation 노드 데이터 우선)
    x_coord: actualDestination.x_coord,
    y_coord: actualDestination.y_coord,
    // 현재 위치 (hospital_navigation 노드 또는 store의 currentLocation)
    currentLocation: currentLocation || {
      x_coord: currentNode?.x_coord || (svgWidth * 0.28),  // 로비 노드 또는 비율 기반
      y_coord: currentNode?.y_coord || (svgHeight * 0.67), // 로비 노드 또는 비율 기반
      building: '본관',
      floor: '1',
      room: '로비'
    },
    // 안정적인 경로 데이터 사용
    pathNodes: stablePathNodes,
    pathEdges: stablePathEdges,
    // 진료과/시설 존 정보 전달
    departmentZones: departmentZones,
    // SVG 크기 정보 전달
    svgWidth: svgWidth,
    svgHeight: svgHeight
  };

  return (
    <FormatATemplate
      screenType="registered"
      currentStep={actualCurrentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={waitingInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      queueData={null}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || 'REGISTERED'}
      currentExam={currentExam}
    />
  );
}