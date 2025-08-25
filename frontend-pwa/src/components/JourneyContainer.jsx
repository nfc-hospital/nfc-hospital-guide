// src/components/JourneyContainer.jsx
import React, { useEffect, useMemo } from 'react';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import { getFacilityByName } from '../data/facilityManagement';

// 컴포넌트 외부에 상수 선언 (무한 렌더링 방지)
const EMPTY_NODES = [];
const EMPTY_EDGES = [];

const JourneyContainer = ({ taggedLocation }) => {
  // 1. Store에서 원본 데이터를 개별적으로 선택 (무한 루프 방지)
  // journeyStore에서 필요한 데이터를 하나씩 가져오기
  const user = useJourneyStore(state => state.user);
  const patientState = useJourneyStore(state => state.patientState);
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);
  const currentQueues = useJourneyStore(state => state.currentQueues);
  const completed_tasks = useJourneyStore(state => state.completed_tasks);
  const appointments = useJourneyStore(state => state.appointments);
  const isLoading = useJourneyStore(state => state.isLoading);
  const fetchJourneyData = useJourneyStore(state => state.fetchJourneyData);
  
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
  
  // 2. 데이터 가공 로직을 JourneyContainer에서 직접 처리 (Store getter 함수 대신)
  // getTodaysScheduleForUI 로직을 직접 구현
  const todaySchedule = useMemo(() => {
    const appointments = todaysAppointments || [];
    return appointments.map((apt, index) => {
      // 장소 정보 생성 - room이 없으면 title 사용
      const building = apt.exam?.building || '본관';
      const floor = apt.exam?.floor ? `${apt.exam.floor}층` : '';
      const room = apt.exam?.room || apt.exam?.title || '';
      
      // 장소 문자열 조합 - 빈 값 제외하고 조합
      const locationParts = [building, floor, room].filter(part => part);
      const location = locationParts.length > 0 ? locationParts.join(' ') : '위치 미정';
      
      return {
        id: apt.appointment_id,
        examName: apt.exam?.title || `검사 ${index + 1}`,
        location: location,
        status: apt.status,
        description: apt.exam?.description,
        purpose: apt.exam?.description || '건강 상태 확인 및 진단',
        preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
        duration: apt.exam?.average_duration || 30,
        scheduled_at: apt.scheduled_at,
        department: apt.exam?.department,
        exam: apt.exam // 원본 exam 객체도 포함
      };
    });
  }, [todaysAppointments]);
  
  // getCurrentTask 로직을 직접 구현
  const currentTask = useMemo(() => {
    const appointments = todaysAppointments || [];
    const queues = currentQueues || [];
    
    // 현재 활성 대기열 찾기
    const activeQueue = queues.find(
      q => q.state === 'waiting' || q.state === 'called' || q.state === 'ongoing'
    );
    
    if (activeQueue) {
      // 대기열과 연결된 예약 찾기
      const appointment = appointments.find(
        apt => apt.appointment_id === activeQueue.appointment_id
      );
      
      if (appointment) {
        return {
          ...activeQueue,
          exam: appointment.exam,
          appointment: appointment
        };
      }
    }
    
    return null;
  }, [todaysAppointments, currentQueues]);
  
  // currentExam을 먼저 정의
  const currentExam = useMemo(() => currentTask?.exam, [currentTask]);
  
  // getWaitingInfo 로직을 직접 구현 - 기본값 포함
  const waitingInfo = useMemo(() => {
    const queues = currentQueues || [];
    const activeQueue = queues.find(
      q => q.state === 'waiting' || q.state === 'called' || q.state === 'ongoing'
    );
    
    if (activeQueue) {
      // 큐 데이터가 있을 때
      return {
        peopleAhead: activeQueue.queue_number > 0 ? activeQueue.queue_number - 1 : 0,
        estimatedTime: activeQueue.estimated_wait_time || currentExam?.average_duration || 15,
        queueNumber: activeQueue.queue_number || 1,
        priority: activeQueue.priority || 'normal'
      };
    }
    
    // 대기 상태이지만 큐 데이터가 없을 때 기본값 제공
    if (patientState === 'WAITING' || patientState === 'REGISTERED') {
      // 현재 검사의 평균 시간을 사용
      const currentExamData = currentExam || todaysAppointments?.[0]?.exam;
      return {
        peopleAhead: 0,
        estimatedTime: currentExamData?.average_duration || 15,
        queueNumber: 1,
        priority: 'normal'
      };
    }
    
    return null;
  }, [currentQueues, patientState, currentExam, todaysAppointments]);
  const isOngoing = useMemo(() => patientState === 'ONGOING', [patientState]);
  const isCalled = useMemo(() => patientState === 'CALLED', [patientState]);
  
  // 현재 단계 계산 - useMemo로 최적화
  const currentStep = useMemo(() => 
    todaySchedule.findIndex(s => 
      ['waiting', 'called', 'ongoing'].includes(s.status)
    ), [todaySchedule]
  );
  const actualCurrentStep = useMemo(() => currentStep === -1 ? 0 : currentStep, [currentStep]);
  
  // getNextExam 로직을 직접 구현
  const nextExam = useMemo(() => {
    const schedule = todaySchedule;
    
    // ✅ PAYMENT 상태: 수납창구를 목적지로
    if (patientState === 'PAYMENT') {
      return {
        exam_id: 'payment_desk',
        title: '수납창구',
        building: '본관',
        floor: '1',
        room: '원무과',
        department: '원무과',
        x_coord: 420,
        y_coord: 380,
        description: '수납창구에서 진료비를 수납해주세요'
      };
    }
    
    // ✅ FINISHED 상태: 정문을 목적지로 (귀가)
    if (patientState === 'FINISHED') {
      return {
        exam_id: 'main_entrance',
        title: '정문',
        building: '본관',
        floor: '1',
        room: '로비',
        department: '출입구',
        x_coord: 150,
        y_coord: 400,
        description: '모든 진료가 완료되었습니다. 안녕히 가세요.'
      };
    }
    
    // ✅ WAITING 상태: 대기 중인 검사를 목적지로
    if (patientState === 'WAITING') {
      const waitingExam = schedule.find(s => s.status === 'waiting' || s.status === 'called');
      if (waitingExam) {
        return waitingExam.exam;
      }
      return todaysAppointments?.[0]?.exam;
    }
    
    // ✅ REGISTERED 상태: 첫 번째 검사를 목적지로
    if (patientState === 'REGISTERED' || (patientState === 'COMPLETED' && schedule.length === 0)) {
      return todaysAppointments?.[0]?.exam;
    }
    
    // ✅ COMPLETED 상태: 다음 검사를 목적지로
    if (patientState === 'COMPLETED') {
      const completedCount = schedule.filter(s => s.status === 'completed').length;
      if (completedCount < todaysAppointments.length) {
        return todaysAppointments[completedCount]?.exam;
      }
      // 모든 검사가 완료되면 수납창구로
      return {
        exam_id: 'payment_desk',
        title: '수납창구',
        building: '본관',
        floor: '1',
        room: '원무과',
        department: '원무과',
        x_coord: 420,
        y_coord: 380,
        description: '검사가 모두 완료되었습니다. 수납창구로 이동해주세요.'
      };
    }
    
    // ✅ CALLED, ONGOING 상태: 현재 진행 중인 검사를 목적지로
    if (patientState === 'CALLED' || patientState === 'ONGOING') {
      const currentExam = schedule.find(s => 
        s.status === 'called' || s.status === 'ongoing'
      );
      if (currentExam) {
        return currentExam.exam;
      }
    }
    
    // ✅ ARRIVED 상태: 원무과를 목적지로 (접수)
    if (patientState === 'ARRIVED') {
      return {
        exam_id: 'reception',
        title: '원무과',
        building: '본관',
        floor: '1',
        room: '접수창구',
        department: '원무과',
        x_coord: 500,
        y_coord: 330,
        description: '원무과에서 접수를 진행해주세요'
      };
    }
    
    // ✅ UNREGISTERED 상태: 병원 입구를 목적지로
    if (patientState === 'UNREGISTERED') {
      return {
        exam_id: 'main_entrance',
        title: '병원 입구',
        building: '본관',
        floor: '1',
        room: '로비',
        department: '출입구',
        x_coord: 150,
        y_coord: 400,
        description: '병원에 도착하시면 원무과로 이동해주세요'
      };
    }
    
    return null;
  }, [patientState, todaysAppointments, todaySchedule]);
  
  // facilityManagement에서 시설 정보 찾기 - useMemo로 최적화
  const facilityData = useMemo(() => 
    nextExam ? getFacilityByName(nextExam.title) : null,
    [nextExam]
  );
  
  // 첫 번째 검사실 정보가 없으면 기본값 사용 - useMemo로 최적화
  const targetExam = useMemo(() => 
    nextExam || currentExam || todaySchedule?.[0]?.exam || {
      title: '채혈실',
      building: '본관',
      floor: '1',
      room: '채혈실',
      department: '진단검사의학과'
    },
    [nextExam, currentExam, todaySchedule]
  );
  
  // 컴포넌트 마운트 시 지도 데이터 로드
  useEffect(() => {
    loadMapMetadata();
    loadDepartmentZones({ building: '본관' });
  }, [loadMapMetadata, loadDepartmentZones]); // 함수 의존성 추가
  
  // 층 지도 로드 (대상 검사가 바뀔 때)
  useEffect(() => {
    if (!targetExam) return;
    
    const floor = targetExam.floor || '1';
    const building = targetExam.building || '본관';
    const floorId = `${building.toLowerCase().replace(' ', '_')}_${floor}f`;
    
    loadFloorMap(floorId);
  }, [targetExam?.exam_id, loadFloorMap]); // 함수 의존성 추가
  
  
  // 목적지 노드 찾기 (currentFloorNodes에서 직접 검색) - useMemo로 최적화
  const targetNode = useMemo(() => 
    currentFloorNodes?.find(
      node => node.exam?.exam_id === targetExam.exam_id ||
              node.name?.includes(targetExam.title) ||
              node.room === targetExam.room
    ),
    [currentFloorNodes, targetExam]
  );
  
  // 현재 위치 노드 찾기 - useMemo로 최적화
  const currentNode = useMemo(() => 
    currentFloorNodes?.find(
      node => node.name?.includes('로비') || 
              node.name?.includes('정문') ||
              node.node_type === 'entrance'
    ),
    [currentFloorNodes]
  );
  
  // SVG 크기 정보 가져오기 (직접 계산으로 변경) - useMemo로 최적화
  const mapInfo = useMemo(() => 
    mapMetadata?.find(
      m => m.building === targetExam.building && m.floor === parseInt(targetExam.floor)
    ),
    [mapMetadata, targetExam.building, targetExam.floor]
  );
  const svgWidth = useMemo(() => mapInfo?.width || 900, [mapInfo]);
  const svgHeight = useMemo(() => mapInfo?.height || 600, [mapInfo]);
  
  // 실제 목적지 정보 (hospital_navigation 데이터 우선) - useMemo로 최적화
  const actualDestination = useMemo(() => 
    destinationLocation || {
      exam: targetExam,
      building: targetExam.building,
      floor: targetExam.floor,
      room: targetExam.room,
      x_coord: targetNode?.x_coord || (svgWidth * 0.67),  // 노드 좌표 또는 비율 기반 기본값
      y_coord: targetNode?.y_coord || (svgHeight * 0.5)   // 노드 좌표 또는 비율 기반 기본값
    },
    [destinationLocation, targetExam, targetNode, svgWidth, svgHeight]
  );
  
  // 실제 hospital_navigation 경로 사용
  const stablePathNodes = useMemo(() => {
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
  
  const stablePathEdges = useMemo(() => {
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

  // locationInfo 객체 만들기 (RegisteredScreen, WaitingScreen 공통 로직) - useMemo로 최적화
  const locationInfo = useMemo(() => ({
    name: actualDestination.exam?.title || targetExam.title,
    building: actualDestination.building || targetExam.building || '본관',
    floor: actualDestination.floor ? `${actualDestination.floor}층` : `${targetExam.floor || '1'}층`,
    room: actualDestination.room || targetExam.room || '채혈실',
    department: actualDestination.exam?.department || targetExam.department || '진단검사의학과',
    directions: activeRoute ? '경로 안내를 따라 이동하세요' : 
                isCalled ? '검사실로 입장해주세요' : 
                '엘리베이터를 타고 이동 후 안내 표지판을 따라가세요',
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
  }), [
    actualDestination,
    targetExam,
    activeRoute,
    isCalled,
    facilityData,
    targetNode,
    currentLocation,
    currentNode,
    svgWidth,
    svgHeight,
    stablePathNodes,
    stablePathEdges,
    departmentZones
  ]);
  
  // 다음 행동 결정 로직 - useMemo로 최적화
  const getNextAction = useMemo(() => (taggedLocation) => {
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
  }, [isOngoing, currentExam]);

  // getCompletionStats 로직을 직접 구현
  const completionStats = useMemo(() => {
    const schedule = todaySchedule;
    // completed 또는 examined 상태를 모두 완료로 처리
    const completed = schedule.filter(s => 
      s.status === 'completed' || s.status === 'examined'
    );
    const total = schedule.length;
    
    return {
      completedCount: completed.length,
      totalCount: total,
      completedAppointments: completed,
      remainingCount: total - completed.length,
      progressPercentage: total > 0 ? Math.round((completed.length / total) * 100) : 0
    };
  }, [todaySchedule]);
  
  // PaymentScreen용 locationInfo - useMemo로 최적화
  const paymentLocationInfo = useMemo(() => ({
    name: '원무과 수납창구',
    building: '본관',
    floor: '1층',
    room: '중앙홀 우측',
    department: '원무과',
    directions: '엘리베이터로 1층 이동 후 오른쪽으로 가시면 됩니다',
    mapFile: 'main_1f.svg',
    svgId: 'payment-desk',
    mapId: 'main_1f',
    x_coord: 280,
    y_coord: 250,
    currentLocation: {
      x_coord: 200,
      y_coord: 300,
      building: '본관',
      floor: '1',
      room: '엘리베이터 홀'
    },
    pathNodes: activeRoute?.path_nodes || navigationRoute?.nodes || [],
    pathEdges: activeRoute?.path_edges || navigationRoute?.edges || []
  }), [activeRoute, navigationRoute]);
  
  // 위에서 이미 가져온 데이터들을 사용 (todaysAppointments, fetchJourneyData, completed_tasks, appointments, isLoading)
  
  // UnregisteredScreen용 nextSchedule - useMemo로 최적화
  const nextSchedule = useMemo(() => 
    todaysAppointments?.length > 0 
      ? `${new Date(todaysAppointments[0].scheduled_at).toLocaleDateString('ko-KR')} ${new Date(todaysAppointments[0].scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
      : '예정된 일정 없음',
    [todaysAppointments]
  );
  
  // UnregisteredScreen용 summaryCards - 상수로 처리
  const summaryCards = useMemo(() => [
    { label: '병원 전화번호', value: '02-1234-5678' },
    { label: '접수 시간', value: '08:00~17:00' }
  ], []);
  
  // FinishedScreen 관련 Mock 데이터 - useMemo로 최적화
  const mockPatientData = useMemo(() => ({
    name: '김미경',
    age: 50,
    visitPurpose: '내과 정기 검진',
    appointmentTime: '14:00',
    condition: '고혈압'
  }), []);
  
  const mockPostCareInstructions = useMemo(() => [
    {
      type: 'blood_test',
      title: '채혈 후 주의사항',
      priority: 'high',
      icon: '💉',
      description: '채혈 부위를 5분 이상 꾹 눌러주세요'
    },
    {
      type: 'blood_test',
      title: '채혈 후 주의사항',
      priority: 'medium',
      icon: '💉',
      description: '오늘은 무리한 운동을 피하세요'
    },
    {
      type: 'blood_test',
      title: '채혈 후 주의사항',
      priority: 'low',
      icon: '💉',
      description: '충분한 수분 섭취를 하세요'
    },
    {
      type: 'xray',
      title: 'X-ray 검사 후 안내',
      priority: 'low',
      icon: '📷',
      description: '검사 결과는 3일 후 확인 가능합니다'
    }
  ], []);
  
  // 각 화면에 맞는 데이터 준비 (아직 렌더링하지는 않음) - useMemo로 최적화
  const preparedData = useMemo(() => ({
    // 공통 데이터
    user,
    patientState,
    todaySchedule,
    currentTask,
    waitingInfo,
    currentExam,
    isOngoing,
    isCalled,
    actualCurrentStep,
    
    // RegisteredScreen 데이터
    registeredData: {
      locationInfo,
      nextExam,
      targetExam
    },
    
    // WaitingScreen 데이터
    waitingData: {
      locationInfo,
      currentExam
    },
    
    // PaymentScreen 데이터
    paymentData: {
      locationInfo: paymentLocationInfo,
      completionStats,
      paymentInfo: waitingInfo || { peopleAhead: 0, estimatedTime: 5 }
    },
    
    // UnregisteredScreen 데이터
    unregisteredData: {
      todaysAppointments,
      nextSchedule,
      summaryCards,
      fetchJourneyData
    },
    
    // FinishedScreen 데이터
    finishedData: {
      mockPatientData,
      mockPostCareInstructions,
      completedCount: todaysAppointments?.filter(apt => ['completed', 'done'].includes(apt.status)).length || 0
    },
    
    // 함수들
    getNextAction
  }), [
    user,
    patientState,
    todaySchedule,
    currentTask,
    waitingInfo,
    currentExam,
    isOngoing,
    isCalled,
    actualCurrentStep,
    locationInfo,
    nextExam,
    targetExam,
    paymentLocationInfo,
    completionStats,
    todaysAppointments,
    nextSchedule,
    summaryCards,
    fetchJourneyData,
    mockPatientData,
    mockPostCareInstructions,
    getNextAction
  ]);
  
  // Screen 컴포넌트들 import (필요한 것만 먼저)
  const RegisteredScreen = React.lazy(() => import('./screens/RegisteredScreen'));
  const WaitingScreen = React.lazy(() => import('./screens/WaitingScreen'));
  const PaymentScreen = React.lazy(() => import('./screens/PaymentScreen'));
  const UnregisteredScreen = React.lazy(() => import('./screens/UnregisteredScreen'));
  const FinishedScreen = React.lazy(() => import('./screens/FinishedScreen'));
  const ArrivedScreen = React.lazy(() => import('./screens/ArrivedScreen'));
  
  // taggedLocation은 이제 props로 받음
  
  // 공통 props 준비 - useMemo로 최적화
  const commonProps = useMemo(() => ({
    // 공통 데이터
    user,
    patientState,
    todaySchedule,
    currentStep: actualCurrentStep,
    totalSteps: todaySchedule.length || 7,
    waitingInfo,
    taggedLocation,
    
    // Store 함수들
    fetchJourneyData,
    
    // 계산된 값들
    isOngoing,
    isCalled,
    currentExam,
    currentTask,
    nextExam,
    targetExam,
    actualCurrentStep
  }), [
    user,
    patientState,
    todaySchedule,
    actualCurrentStep,
    waitingInfo,
    taggedLocation,
    fetchJourneyData,
    isOngoing,
    isCalled,
    currentExam,
    currentTask,
    nextExam,
    targetExam
  ]);
  
  // RegisteredScreen용 props - useMemo로 최적화
  const registeredScreenProps = useMemo(() => ({
    ...commonProps,
    locationInfo,
    departmentZones,
    svgWidth,
    svgHeight,
    facilityData,
    stablePathNodes,
    stablePathEdges,
    currentNode,
    targetNode,
    actualDestination
  }), [
    commonProps,
    locationInfo,
    departmentZones,
    svgWidth,
    svgHeight,
    facilityData,
    stablePathNodes,
    stablePathEdges,
    currentNode,
    targetNode,
    actualDestination
  ]);
  
  // 환자 상태에 따른 화면 렌더링 (switch문)
  const currentState = patientState?.current_state || patientState || 'REGISTERED';
  
  switch (currentState) {
    case 'UNREGISTERED':
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <UnregisteredScreen 
            taggedLocation={taggedLocation}
            user={user}
            todaysAppointments={todaysAppointments}
            fetchJourneyData={fetchJourneyData}
            nextSchedule={nextSchedule}
            summaryCards={summaryCards}
          />
        </React.Suspense>
      );
    
    case 'ARRIVED':
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <ArrivedScreen 
            {...commonProps}
            todaysAppointments={todaysAppointments}
            fetchJourneyData={fetchJourneyData}
            nextSchedule={nextSchedule}
            summaryCards={summaryCards}
            completionStats={completionStats}
            waitingInfo={waitingInfo}
            locationInfo={locationInfo}
          />
        </React.Suspense>
      );
    
    case 'REGISTERED':
      // RegisteredScreen만 먼저 props로 데이터 전달
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <RegisteredScreen {...registeredScreenProps} />
        </React.Suspense>
      );
    
    case 'WAITING':
    case 'CALLED':
    case 'ONGOING':
      // WaitingScreen도 props로 데이터 전달
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <WaitingScreen 
            {...commonProps}
            locationInfo={locationInfo}
            currentTask={currentTask}
            isOngoing={isOngoing}
            isCalled={isCalled}
            completionStats={completionStats}
          />
        </React.Suspense>
      );
    
    case 'COMPLETED':
      // COMPLETED 상태는 WaitingScreen 재사용
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <WaitingScreen 
            {...commonProps}
            locationInfo={locationInfo}
            currentTask={currentTask}
            isOngoing={false}
            isCalled={false}
            completionStats={completionStats}
          />
        </React.Suspense>
      );
    
    case 'PAYMENT':
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <PaymentScreen 
            {...commonProps}
            paymentLocationInfo={paymentLocationInfo}
            completionStats={completionStats}
            paymentInfo={waitingInfo || { peopleAhead: 0, estimatedTime: 5 }}
          />
        </React.Suspense>
      );
    
    case 'FINISHED':
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <FinishedScreen 
            {...commonProps}
            completed_tasks={completed_tasks}
            todaysAppointments={todaysAppointments}
            appointments={appointments}
            isLoading={isLoading}
            mockPatientData={mockPatientData}
            mockPostCareInstructions={mockPostCareInstructions}
          />
        </React.Suspense>
      );
    
    default:
      console.warn('Unknown patient state:', currentState);
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <RegisteredScreen {...registeredScreenProps} />
        </React.Suspense>
      );
  }
};

export default JourneyContainer;