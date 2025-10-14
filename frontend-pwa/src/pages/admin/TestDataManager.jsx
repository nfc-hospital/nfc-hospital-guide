import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../api/apiService';
import { PatientJourneyState, getStateColorClass } from '../../constants/states';

const TestDataManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(new Set());
  const [selectedScenarios, setSelectedScenarios] = useState(new Set());
  const [availableExams, setAvailableExams] = useState([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAllExamsModal, setShowAllExamsModal] = useState(false);
  const [selectedPatientForAllExams, setSelectedPatientForAllExams] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedPatientForLocation, setSelectedPatientForLocation] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);

  // 환자 상태 색상 매핑 - 중앙화된 정의 사용
  const stateColors = {
    [PatientJourneyState.UNREGISTERED]: 'bg-gray-100 text-gray-700',
    [PatientJourneyState.ARRIVED]: 'bg-blue-100 text-blue-700',
    [PatientJourneyState.REGISTERED]: 'bg-indigo-100 text-indigo-700',
    [PatientJourneyState.WAITING]: 'bg-amber-100 text-amber-700',
    [PatientJourneyState.CALLED]: 'bg-green-100 text-green-700',
    [PatientJourneyState.IN_PROGRESS]: 'bg-purple-100 text-purple-700',
    // COMPLETED 제거 - Backend에서 동적 분기
    [PatientJourneyState.PAYMENT]: 'bg-orange-100 text-orange-700',
    [PatientJourneyState.FINISHED]: 'bg-gray-300 text-gray-700'
  };

  // 상태 흐름 순서 (8단계 - COMPLETED 제거됨)
  const stateFlow = [
    PatientJourneyState.UNREGISTERED,
    PatientJourneyState.ARRIVED,
    PatientJourneyState.REGISTERED,
    PatientJourneyState.WAITING,
    PatientJourneyState.CALLED,
    PatientJourneyState.IN_PROGRESS,
    // COMPLETED 제거 - Backend에서 동적으로 WAITING 또는 PAYMENT로 분기
    PatientJourneyState.PAYMENT,
    PatientJourneyState.FINISHED
  ];

  // 시나리오 타입별 아이콘
  const scenarioIcons = {
    payment_flow: '💳',
    completed_flow: '✅',
    in_progress_exam: '🔬',
    registered_flow: '📋',
    waiting_flow: '⏰',
    cypress_test: '🤖',
    standard_flow: '👤'
  };

  // 환자 목록 조회
  const fetchPatients = async () => {
    try {
      const response = await apiService.api.get('/test/patients/');
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchAvailableExams();
    fetchAvailableLocations();

    // 🚨 긴급: 모든 자동 시뮬레이션 강제 중단
    setSimulating(new Set());
  }, []);

  // 사용 가능한 검사 목록 조회
  const fetchAvailableExams = async () => {
    try {
      const response = await apiService.api.get('/test/available-exams/');
      setAvailableExams(response.data.exams);
    } catch (error) {
      console.error('Failed to fetch available exams:', error);
    }
  };

  // 사용 가능한 위치 목록 조회
  const fetchAvailableLocations = async () => {
    try {
      const response = await apiService.api.get('/test/locations/');
      setAvailableLocations(response.data.locations);
    } catch (error) {
      console.error('Failed to fetch available locations:', error);
    }
  };

  // 환자 상태 업데이트
  const updatePatientState = async (userId, newState) => {
    try {
      await apiService.api.put('/test/patient-state/', {
        user_id: userId,
        new_state: newState
      });
      await fetchPatients(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to update patient state:', error);
    }
  };

  // 환자 시뮬레이션 (자동 진행) - 완전 비활성화
  const simulatePatient = async (userId) => {
    alert('자동 진행 기능이 비활성화되었습니다. "다음 →" 버튼을 사용해주세요.');
    return;

    // 아래 코드는 실행되지 않음 (비활성화됨)
    /*
    setSimulating(prev => new Set(prev).add(userId));

    try {
      const response = await apiService.api.post('/test/simulate/', {
        user_id: userId
      });

      if (!response.data.is_final) {
        // 3초 후 다음 단계로 자동 진행
        setTimeout(() => {
          simulatePatient(userId);
        }, 3000);
      } else {
        setSimulating(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }

      await fetchPatients();
    } catch (error) {
      console.error('Failed to simulate patient:', error);
      setSimulating(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
    */
  };

  // Queue 상태 업데이트 (환자 상태 자동 연동)
  const updateQueueState = async (queueId, newState) => {
    try {
      const response = await apiService.api.put('/test/queue-state/', {
        queue_id: queueId,
        new_state: newState
      });
      
      // 성공 시 자동 연동 메시지 표시
      if (response.data.auto_updated) {
        alert(`큐 상태와 환자 상태가 함께 변경되었습니다!\n큐: ${response.data.old_queue_state} → ${response.data.new_queue_state}\n환자: ${response.data.old_patient_state} → ${response.data.new_patient_state}`);
      }
      
      await fetchPatients(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to update queue state:', error);
    }
  };

  // 환자에게 검사 추가
  const addExamToPatient = async (userId, examId, scheduledFor = 'today') => {
    try {
      const response = await apiService.api.post('/test/add-exam/', {
        user_id: userId,
        exam_id: examId,
        scheduled_for: scheduledFor
      });
      
      if (response.data && response.data.message) {
        alert(response.data.message);
      }
      
      await fetchPatients(); // 목록 새로고침
      setShowAddExamModal(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Failed to add exam to patient:', error);
      
      let errorMessage = '검사 추가에 실패했습니다.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `오류: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 환자의 검사 삭제
  const removeExamFromPatient = async (userId, appointmentId) => {
    if (!confirm('이 검사를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await apiService.api.delete(`/test/remove-exam/${appointmentId}/`, {
        data: { user_id: userId }
      });

      if (response.data && response.data.message) {
        alert(response.data.message);
      }

      await fetchPatients(); // 목록 새로고침

      // 모달이 열려있으면 데이터 업데이트
      if (showAllExamsModal && selectedPatientForAllExams) {
        const updatedPatient = patients.find(p => p.user_id === userId);
        if (updatedPatient) {
          setSelectedPatientForAllExams(updatedPatient);
        }
      }
    } catch (error) {
      console.error('Failed to remove exam:', error);

      let errorMessage = '검사 삭제에 실패했습니다.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `오류: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  // 환자 위치 업데이트
  const updatePatientLocation = async (userId, locationKey) => {
    try {
      const response = await apiService.api.put('/test/patient-location/', {
        user_id: userId,
        location_key: locationKey
      });
      
      if (response.data && response.data.message) {
        alert(`위치 변경 완료: ${response.data.message}`);
      }
      
      await fetchPatients(); // 목록 새로고침
      setShowLocationModal(false);
      setSelectedPatientForLocation(null);
    } catch (error) {
      console.error('Failed to update patient location:', error);
      alert('위치 업데이트에 실패했습니다.');
    }
  };

  // 모든 환자 초기화
  const resetAllPatients = async () => {
    if (!window.confirm('모든 환자 상태를 REGISTERED로 초기화하시겠습니까?')) {
      return;
    }

    try {
      await apiService.api.post('/test/reset/');
      await fetchPatients();
    } catch (error) {
      console.error('Failed to reset patients:', error);
    }
  };

  // 특정 환자의 모든 Queue 삭제
  const deletePatientQueues = async (userId, patientName) => {
    if (!window.confirm(`${patientName}님의 모든 Queue를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiService.api.delete('/test/queues/delete-patient/', {
        data: { user_id: userId }
      });

      // 응답 구조 확인: response.data 또는 response.data.data
      const data = response.data?.data || response.data;
      const message = response.data?.message || data?.message;
      const deletedCount = data?.deleted_count || 0;

      alert(`✅ 삭제 완료!\n${deletedCount}개의 Queue가 삭제되었습니다.`);

      await fetchPatients(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to delete patient queues:', error);

      let errorMessage = '❌ Queue 삭제에 실패했습니다.';
      if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `❌ 오류: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  // 전체 Queue 초기화
  const deleteAllQueues = async () => {
    if (!window.confirm('⚠️ 모든 환자의 모든 Queue를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
      return;
    }

    try {
      const response = await apiService.api.delete('/test/queues/delete-all/', {
        data: { confirm: true }
      });

      // 응답 구조 확인: response.data 또는 response.data.data
      const data = response.data?.data || response.data;
      const message = response.data?.message || data?.message;
      const deletedCount = data?.deleted_count || 0;

      alert(`✅ 전체 Queue 삭제 완료!\n${deletedCount}개의 Queue가 삭제되었습니다.`);

      await fetchPatients(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to delete all queues:', error);

      let errorMessage = '❌ 전체 Queue 삭제에 실패했습니다.';
      if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `❌ 오류: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-6 lg:px-12">
      <div className="max-w-[1600px] mx-auto">
        {/* 헤더 섹션 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl mb-8 overflow-hidden border border-white/50">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-10 py-8">
            <div className="flex justify-between items-center">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-3 tracking-tight">시연용 테스트 데이터 관리</h1>
                <p className="text-indigo-100 text-lg">가상 EMR 환경에서 환자 상태와 검사를 쉽게 관리하세요</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/admin/map-manager"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    지도 관리
                  </span>
                </Link>
                <Link
                  to="/map-editor"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    경로 편집기
                  </span>
                </Link>
                <button
                  onClick={resetAllPatients}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    모든 환자 초기화
                  </span>
                </button>
                <button
                  onClick={deleteAllQueues}
                  className="bg-red-500/90 backdrop-blur-sm hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-red-400"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    전체 Queue 초기화
                  </span>
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* 테이블 컨테이너 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed" style={{minWidth: '1200px'}}>
              <thead className="bg-gray-50/50">
                <tr>
                  {/* 환자 정보 그룹 */}
                  <th className="px-6 py-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200" style={{width: '180px'}}>
                    환자 정보
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200" style={{width: '100px'}}>
                    환자 상태
                  </th>
                  
                  {/* 대기열 및 현재 검사 그룹 */}
                  <th className="px-6 py-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200" style={{width: '420px'}}>
                    대기열 및 현재 검사
                  </th>
                  
                  {/* 액션 그룹 */}
                  <th className="px-6 py-5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{width: '500px'}}>
                    관리 도구
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient, index) => (
                <tr key={patient.user_id} className="hover:bg-gray-50/50">
                  {/* 환자 정보 */}
                  <td className="px-6 py-5 border-r border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.name}
                        </div>
                        <div className="text-xs text-gray-500">{patient.email}</div>
                        {patient.current_location && (
                          <div className="text-xs text-indigo-600 font-medium mt-0.5">
                            📍 {patient.current_location}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* 환자 상태 */}
                  <td className="px-6 py-5 border-r border-gray-100">
                    <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-medium rounded-full ${stateColors[patient.current_state]}`}>
                      {patient.current_state}
                    </span>
                  </td>
                  
                  {/* 모든 검사 표시 */}
                  <td className="px-6 py-5 border-r border-gray-100">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {patient.appointments && patient.appointments.length > 0 ? (
                        patient.appointments.map((appt, idx) => {
                          // 이 검사의 Queue 정보 찾기
                          const queueForThisExam = patient.appointments.find(
                            a => a.appointment_id === appt.appointment_id
                          )?.queue_info || appt.queue_info;

                          const queueId = queueForThisExam?.queue_id;
                          const queueState = queueForThisExam?.state || appt.status;
                          const queueNumber = queueForThisExam?.queue_number;

                          // 상태 구분
                          const isInProgress = appt.status === 'in_progress';
                          const isCurrentExam = patient.current_exam?.exam_id === appt.exam?.exam_id;
                          const isWaitingOrRegistered = ['REGISTERED', 'WAITING', 'CALLED'].includes(patient.current_state);

                          // 배지 표시 로직
                          // 1) IN_PROGRESS 상태 → "진행중" (파란 배지)
                          // 2) (REGISTERED/WAITING/CALLED) + current_exam 일치 → "시작 대기" (노란 배지)
                          const showInProgressBadge = isInProgress;
                          const showPendingBadge = isCurrentExam && isWaitingOrRegistered && !isInProgress;

                          return (
                            <div
                              key={appt.appointment_id}
                              className={`p-2.5 rounded-lg border ${
                                showInProgressBadge
                                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                                  : showPendingBadge
                                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {/* 검사 정보 헤더 */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold ${showInProgressBadge ? 'text-blue-900' : showPendingBadge ? 'text-amber-900' : 'text-gray-800'}`}>
                                      {idx + 1}. {appt.exam?.title || '검사'}
                                    </span>
                                    {showInProgressBadge && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">
                                        진행중
                                      </span>
                                    )}
                                    {showPendingBadge && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                                        시작 대기
                                      </span>
                                    )}
                                  </div>
                                  {queueNumber && (
                                    <div className="text-[10px] text-gray-600 mt-0.5">
                                      대기번호 #{queueNumber}
                                    </div>
                                  )}
                                </div>
                                {/* 삭제 버튼 */}
                                <button
                                  onClick={() => removeExamFromPatient(patient.user_id, appt.appointment_id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="검사 삭제"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              {/* Queue 상태 제어 버튼 */}
                              {queueId ? (
                                <div className="grid grid-cols-4 gap-1">
                                  <button
                                    onClick={() => updateQueueState(queueId, 'waiting')}
                                    className={`px-2 py-1 text-[10px] rounded font-medium ${
                                      queueState === 'waiting'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                    }`}
                                  >
                                    대기
                                  </button>
                                  <button
                                    onClick={() => updateQueueState(queueId, 'called')}
                                    className={`px-2 py-1 text-[10px] rounded font-medium ${
                                      queueState === 'called'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                                  >
                                    호출
                                  </button>
                                  <button
                                    onClick={() => updateQueueState(queueId, 'in_progress')}
                                    className={`px-2 py-1 text-[10px] rounded font-medium ${
                                      queueState === 'in_progress'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                    }`}
                                  >
                                    진행
                                  </button>
                                  <button
                                    onClick={() => updateQueueState(queueId, 'completed')}
                                    className={`px-2 py-1 text-[10px] rounded font-medium ${
                                      queueState === 'completed'
                                        ? 'bg-gray-500 text-white'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                  >
                                    완료
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400 text-center py-1">
                                  Queue 없음
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <span className="text-xs text-gray-400">검사 없음</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* 관리 도구 모음 */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {/* 상태 변경 버튼 그룹 */}
                      <div className="flex items-center gap-1">
                        {patient.scenario?.previous_state && (
                          <button
                            onClick={() => updatePatientState(patient.user_id, patient.scenario.previous_state)}
                            disabled={simulating.has(patient.user_id)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                              simulating.has(patient.user_id)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            ← 이전
                          </button>
                        )}

                        {patient.scenario?.next_state && (
                          <button
                            onClick={() => updatePatientState(patient.user_id, patient.scenario.next_state)}
                            disabled={simulating.has(patient.user_id)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                              simulating.has(patient.user_id)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-500 text-white hover:bg-indigo-600'
                            }`}
                          >
                            다음 →
                          </button>
                        )}
                      </div>
                      
                      {/* 자동 시뮬레이션 - 비활성화됨 */}
                      <button
                        onClick={() => simulatePatient(patient.user_id)}
                        disabled={true}
                        className="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap bg-gray-100 text-gray-400 cursor-not-allowed"
                        title="자동진행 기능이 비활성화되었습니다"
                      >
                        자동진행 (비활성)
                      </button>

                      {/* 검사 추가 버튼 */}
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowAddExamModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-500 text-white hover:bg-green-600 flex items-center gap-1 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        검사 추가
                      </button>

                      {/* 위치 변경 버튼 */}
                      <button
                        onClick={() => {
                          setSelectedPatientForLocation(patient);
                          setShowLocationModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-1 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        위치
                      </button>

                      {/* 환자 상태 선택 드롭다운 */}
                      <select
                        value={patient.current_state}
                        onChange={(e) => updatePatientState(patient.user_id, e.target.value)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[110px]"
                        disabled={simulating.has(patient.user_id)}
                      >
                        {stateFlow.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {patients.length === 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-16 text-center">
            <div className="text-5xl mb-4 opacity-50">🏥</div>
            <p className="text-gray-600 text-lg font-medium">테스트 환자가 없습니다</p>
            <p className="text-gray-400 text-sm mt-2">먼저 테스트 데이터를 생성해주세요</p>
          </div>
        )}
      </div>

      {/* 전체 검사 목록 모달 */}
      {showAllExamsModal && selectedPatientForAllExams && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="text-white">
                  <h3 className="text-xl font-bold">전체 검사 목록</h3>
                  <p className="text-indigo-100 text-sm">{selectedPatientForAllExams.name}님의 모든 예약된 검사</p>
                </div>
                <button
                  onClick={() => {
                    setShowAllExamsModal(false);
                    setSelectedPatientForAllExams(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 바디 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {selectedPatientForAllExams.appointments && selectedPatientForAllExams.appointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedPatientForAllExams.appointments.map((appt) => (
                    <div key={appt.appointment_id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">{appt.exam.title}</h4>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              appt.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appt.status === 'completed' ? '완료' : '예약'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">진료과:</span>
                              <span className="ml-2 text-gray-900 font-medium">{appt.exam.department}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">위치:</span>
                              <span className="ml-2 text-gray-900 font-medium">{appt.exam.building} {appt.exam.room}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">예약 시간:</span>
                              <span className="ml-2 text-gray-900 font-medium">
                                {new Date(appt.scheduled_at).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  weekday: 'short'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* 삭제 버튼 추가 */}
                        <div className="ml-4">
                          <button
                            onClick={() => removeExamFromPatient(selectedPatientForAllExams.user_id, appt.appointment_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="검사 삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">예약된 검사가 없습니다.</p>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  총 {selectedPatientForAllExams.appointments?.length || 0}개의 검사
                </span>
                <button
                  onClick={() => {
                    setShowAllExamsModal(false);
                    setSelectedPatientForAllExams(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 위치 선택 모달 */}
      {showLocationModal && selectedPatientForLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="text-white">
                  <h3 className="text-xl font-bold">환자 위치 변경</h3>
                  <p className="text-purple-100 text-sm">
                    {selectedPatientForLocation.name}님의 현재 위치를 선택하세요
                    {selectedPatientForLocation.current_location && (
                      <span className="ml-2 font-medium">
                        (현재: {selectedPatientForLocation.current_location})
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLocationModal(false);
                    setSelectedPatientForLocation(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 바디 - 위치 버튼 그리드 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {availableLocations.map((location) => {
                  const isCurrentLocation = selectedPatientForLocation.current_location === location.key;
                  return (
                    <button
                      key={location.key}
                      onClick={() => updatePatientLocation(selectedPatientForLocation.user_id, location.key)}
                      className={`relative p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                        isCurrentLocation
                          ? 'bg-purple-50 border-purple-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      {/* 현재 위치 표시 */}
                      {isCurrentLocation && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
                            현재 위치
                          </span>
                        </div>
                      )}
                      
                      {/* 위치 아이콘 */}
                      <div className={`text-3xl mb-3 ${isCurrentLocation ? 'animate-pulse' : ''}`}>
                        {location.icon || '📍'}
                      </div>
                      
                      {/* 위치 이름 */}
                      <div className="text-base font-semibold text-gray-900 mb-1">
                        {location.key}
                      </div>
                      
                      {/* 위치 상세 정보 */}
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>{location.building} {location.floor}</div>
                        <div className="text-gray-500">{location.room}</div>
                      </div>
                      
                      {/* 좌표 정보 (개발용) */}
                      <div className="text-xs text-gray-400 mt-2">
                        좌표: ({location.x}, {location.y})
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 위치 정보가 없을 때 */}
              {availableLocations.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-gray-500 text-lg">사용 가능한 위치가 없습니다.</p>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  총 {availableLocations.length}개의 위치
                </span>
                <button
                  onClick={() => {
                    setShowLocationModal(false);
                    setSelectedPatientForLocation(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 검사 추가 모달 */}
      {showAddExamModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="text-white">
                  <h3 className="text-xl font-bold">검사 추가</h3>
                  <p className="text-blue-100 text-sm">{selectedPatient.name}님에게 검사를 추가합니다</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddExamModal(false);
                    setSelectedPatient(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 바디 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
              {availableExams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏥</div>
                  <p className="text-gray-500 text-lg">사용 가능한 검사가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {availableExams.map((exam) => (
                    <div key={exam.exam_id} className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{exam.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {exam.department}
                            </span>
                            <span className="text-sm text-gray-600">
                              📍 {exam.building} {exam.floor}층 {exam.room}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => addExamToPatient(selectedPatient.user_id, exam.exam_id, 'today')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            오늘
                          </button>
                          <button
                            onClick={() => addExamToPatient(selectedPatient.user_id, exam.exam_id, 'tomorrow')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            내일
                          </button>
                          <button
                            onClick={() => addExamToPatient(selectedPatient.user_id, exam.exam_id, 'yesterday')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            완료
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAddExamModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDataManager;