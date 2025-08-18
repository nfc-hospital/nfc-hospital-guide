// NFC 태깅 위치 판별 유틸리티

/**
 * NFC 태그 위치와 목적지 간의 거리를 판별
 * @param {Object} taggedLocation - NFC 태그 위치 정보
 * @param {Object} destination - 목적지 정보
 * @returns {Object} { isNearby: boolean, distance: string }
 */
export function calculateNFCDistance(taggedLocation, destination) {
  if (!taggedLocation || !destination) {
    return { isNearby: false, distance: 'unknown' };
  }

  // 같은 건물, 같은 층, 같은 구역인 경우 근거리로 판단
  const isSameBuilding = taggedLocation.building === destination.building;
  const isSameFloor = taggedLocation.floor === parseInt(destination.floor);
  const isSameArea = taggedLocation.room === destination.room || 
                     (taggedLocation.room && destination.room && 
                      taggedLocation.room.includes(destination.department));

  if (isSameArea) {
    return { isNearby: true, distance: 'same_room' };
  }
  
  if (isSameBuilding && isSameFloor) {
    return { isNearby: true, distance: 'same_floor' };
  }
  
  if (isSameBuilding) {
    return { isNearby: false, distance: 'same_building' };
  }

  return { isNearby: false, distance: 'different_building' };
}

/**
 * 환자의 현재 상태에 따른 목적지 정보 반환
 * @param {string} patientState - 환자의 현재 상태
 * @param {Object} currentExam - 현재 검사 정보
 * @returns {Object} 목적지 정보
 */
export function getDestinationByState(patientState, currentExam) {
  const destinations = {
    UNREGISTERED: {
      building: '본관',
      floor: '1',
      room: '원무과',
      department: '접수',
      description: '초진 접수창구'
    },
    REGISTERED: currentExam ? {
      building: currentExam.building,
      floor: currentExam.floor,
      room: currentExam.room,
      department: currentExam.department,
      description: currentExam.title
    } : null,
    WAITING: currentExam ? {
      building: currentExam.building,
      floor: currentExam.floor,
      room: currentExam.room,
      department: currentExam.department,
      description: currentExam.title
    } : null,
    PAYMENT: {
      building: '본관',
      floor: '1',
      room: '원무과',
      department: '수납',
      description: '수납창구'
    }
  };

  return destinations[patientState] || null;
}

/**
 * 슬라이드 초기 표시 순서 결정
 * @param {boolean} isNearby - 근거리 태깅 여부
 * @returns {number} 초기 슬라이드 인덱스
 */
export function getInitialSlideIndex(isNearby) {
  // 근거리 태깅: 준비사항부터 시작 (index 0)
  // 원거리 태깅: 지도부터 시작 (index 1)
  return isNearby ? 0 : 1;
}

/**
 * 검색 키워드 생성
 * @param {Object} from - 출발지 정보
 * @param {Object} to - 도착지 정보
 * @returns {Object} API 검색 키워드
 */
export function generateNavigationKeywords(from, to) {
  return {
    apiKeyword: '[NAVIGATION-API]',
    componentKeyword: '[NAVIGATION-COMPONENT]',
    searchParams: {
      from: from ? `${from.building || ''} ${from.floor || ''}층 ${from.room || ''}`.trim() : '현재 위치',
      to: to ? `${to.building || ''} ${to.floor || ''}층 ${to.room || ''}`.trim() : '목적지',
      fromCoords: from ? { x: from.x_coord || 0, y: from.y_coord || 0 } : null,
      toCoords: to ? { x: to.x_coord || 0, y: to.y_coord || 0 } : null,
      needsElevator: from && to && from.floor !== to.floor,
      needsAccessibility: false // 추후 접근성 옵션 추가
    }
  };
}