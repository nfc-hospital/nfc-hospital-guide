import { useOptimizedAPI, useSmartPolling, usePatientData } from './useOptimizedAPI';
import optimizedApiService from '../api/optimizedApiService';

/**
 * 최적화된 환자 여정 데이터 Hook
 * 기존 journeyStore를 대체하는 최적화된 버전
 */
export function useOptimizedJourney(options = {}) {
  const { enablePolling = true, tagId = null } = options;

  // NFC 태그 스캔 처리
  const {
    data: nfcScanData,
    loading: nfcLoading,
    error: nfcError,
    execute: scanTag
  } = useOptimizedAPI(
    (tagData) => `nfc-scan:${tagData?.tag_uid || tagData?.code}`,
    (tagData) => optimizedApiService.scanNFCTag(tagData),
    {
      immediate: false,
      cache: true,
      ttl: 60000, // NFC 스캔 결과는 1분간 캐시
    }
  );

  // 환자 대시보드 데이터 (통합 API)
  const patientDataResult = usePatientData({
    immediate: true
  });

  // 스마트 폴링 (조건부, 적응형)
  const pollingResult = useSmartPolling(
    'patient-sync',
    () => optimizedApiService.syncEssentialData(),
    {
      enabled: enablePolling && !document.hidden,
      interval: 30000, // 30초
      adaptive: true,
      immediate: false
    }
  );

  // NFC 태그 스캔 함수
  const handleTagScan = async (tagData) => {
    try {
      const result = await scanTag(tagData);
      
      // NFC 스캔 후 대시보드 데이터 새로고침이 필요한 경우
      if (result.scanResult?.state_changed) {
        patientDataResult.execute();
      }
      
      return result;
    } catch (error) {
      console.error('NFC 태그 스캔 실패:', error);
      throw error;
    }
  };

  // 통합된 데이터 반환 (안전한 기본값 설정)
  const combinedData = {
    // 환자 기본 데이터
    profile: patientDataResult.data?.profile || null,
    appointments: Array.isArray(patientDataResult.data?.schedule?.appointments) 
      ? patientDataResult.data.schedule.appointments 
      : [],
    queues: Array.isArray(patientDataResult.data?.queues) 
      ? patientDataResult.data.queues 
      : [],
    
    // 실시간 업데이트 데이터
    syncData: pollingResult.data || null,
    
    // NFC 관련 데이터
    nfcData: nfcScanData || null,
    taggedLocation: nfcScanData?.publicInfo || null,
    
    // 로딩 상태
    isLoading: patientDataResult.loading,
    isPolling: pollingResult.isPolling,
    isNfcLoading: nfcLoading,
    
    // 에러 상태
    error: patientDataResult.errors,
    pollingError: pollingResult.error,
    nfcError,
    
    // 액션 함수들
    refresh: patientDataResult.execute,
    scanTag: handleTagScan,
    startPolling: pollingResult.startPolling,
    stopPolling: pollingResult.stopPolling,
  };

  // 현재 환자 상태 계산 (기존 로직 유지, 안전한 타입 체크 추가)
  const getCurrentState = () => {
    const { queues, appointments } = combinedData;
    
    if (Array.isArray(queues) && queues.length > 0) {
      const currentQueue = queues.find(q => 
        ['waiting', 'called', 'ongoing'].includes(q.state)
      );
      if (currentQueue) {
        return currentQueue.state === 'called' ? 'CALLED' :
               currentQueue.state === 'ongoing' ? 'ONGOING' : 'WAITING';
      }
    }
    
    if (Array.isArray(appointments) && appointments.length > 0) {
      const hasCompletedAppointments = appointments.some(a => a.status === 'completed');
      if (hasCompletedAppointments) {
        return 'COMPLETED';
      }
    }
    
    return 'REGISTERED';
  };

  return {
    ...combinedData,
    currentState: getCurrentState(),
    
    // 편의 속성들 (안전한 타입 체크 포함)
    hasActiveQueue: Array.isArray(combinedData.queues) && combinedData.queues.some(q => 
      ['waiting', 'called', 'ongoing'].includes(q.state)
    ),
    todayAppointmentCount: Array.isArray(combinedData.appointments) ? combinedData.appointments.length : 0,
    completedAppointmentCount: Array.isArray(combinedData.appointments) ? 
      combinedData.appointments.filter(a => a.status === 'completed').length : 0,
    
    // 캐시 관리
    invalidateCache: () => {
      patientDataResult.execute();
      pollingResult.execute();
    }
  };
}

/**
 * 관리자 대시보드용 최적화된 Hook
 */
export function useOptimizedAdminDashboard(options = {}) {
  const { enablePolling = true, departments = [] } = options;

  // 관리자 대시보드 데이터
  const {
    data: dashboardData,
    loading,
    error,
    execute: refresh
  } = useOptimizedAPI(
    'admin-dashboard',
    () => optimizedApiService.getAdminDashboard(),
    {
      immediate: true,
      cache: true,
      ttl: 60000, // 1분간 캐시
    }
  );

  // 부서별 대기열 데이터 (선택적)
  const {
    data: departmentQueues,
    loading: departmentLoading,
    execute: refreshDepartments
  } = useOptimizedAPI(
    `department-queues:${departments.join(',')}`,
    () => optimizedApiService.getDepartmentQueues(departments),
    {
      immediate: departments.length > 0,
      cache: true,
      ttl: 30000, // 30초간 캐시
    }
  );

  // 관리자용 스마트 폴링
  const pollingResult = useSmartPolling(
    'admin-polling',
    () => optimizedApiService.getAdminDashboard(),
    {
      enabled: enablePolling,
      interval: 60000, // 1분
      adaptive: true,
      immediate: false
    }
  );

  return {
    data: dashboardData,
    departmentQueues,
    syncData: pollingResult.data,
    
    loading: loading || departmentLoading,
    error: error || pollingResult.error,
    isPolling: pollingResult.isPolling,
    
    refresh: async () => {
      await Promise.all([
        refresh(),
        departments.length > 0 ? refreshDepartments() : Promise.resolve()
      ]);
    },
    
    refreshDepartments,
    startPolling: pollingResult.startPolling,
    stopPolling: pollingResult.stopPolling,
    
    // 편의 속성들
    hospitalStatus: dashboardData?.hospitalStatus,
    queueStats: dashboardData?.queueStats,
    patientFlow: dashboardData?.patientFlow,
    lastUpdated: dashboardData?.lastUpdated,
  };
}

export default useOptimizedJourney;