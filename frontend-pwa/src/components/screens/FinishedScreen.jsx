import React, { useState, useEffect } from 'react';
import useJourneyStore from '../../store/journeyStore';
import useMapStore from '../../store/mapStore';
import { useNavigate } from 'react-router-dom';
import FormatBTemplate from '../templates/FormatBTemplate';
import apiService from '../../api/apiService';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function FinishedScreen({ taggedLocation, completed_tasks }) {
  // CSS 애니메이션 스타일 정의
  const animationStyles = `
    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  const { 
    user, 
    todaysAppointments = [], 
    appointments = [], 
    patientState,
    isLoading 
  } = useJourneyStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [postCareInstructions, setPostCareInstructions] = useState([]);
  
  // 디버깅
  useEffect(() => {
    console.log('🔍 FinishedScreen 렌더링됨:', {
      user,
      todaysAppointments,
      patientState,
      taggedLocation,
      completed_tasks,
      completedCount: todaysAppointments?.filter(apt => ['completed', 'done'].includes(apt.status)).length || 0
    });
  }, [todaysAppointments, patientState]);

  // 김미경 환자 Mock 데이터 추가
  const mockPatientData = {
    name: '김미경',
    age: 50,
    visitPurpose: '내과 정기 검진',
    appointmentTime: '14:00',
    condition: '고혈압'
  };

  // Mock 검사 후 주의사항 데이터
  const mockPostCareInstructions = [
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
    },
    {
      type: 'medication',
      title: '고혈압 약물 복용 안내',
      priority: 'high',
      icon: '💊',
      description: '처방받은 약은 매일 같은 시간에 복용하세요'
    },
    {
      type: 'medication',
      title: '고혈압 약물 복용 안내',
      priority: 'high',
      icon: '💊',
      description: '약 복용 후 어지러움이 있을 수 있으니 천천히 일어나세요'
    },
    {
      type: 'general',
      title: '일반 주의사항',
      priority: 'medium',
      icon: '📋',
      description: '다음 정기 검진은 3개월 후입니다'
    },
    {
      type: 'general',
      title: '일반 주의사항',
      priority: 'low',
      icon: '📋',
      description: '검사 결과는 모바일 앱에서 확인 가능합니다'
    }
  ];

  // Mock 완료된 검사 데이터 (혈액검사 → 소변검사 → CT촬영 → MRI촬영)
  const mockCompletedExams = [
    {
      appointment_id: 'apt_001',
      exam: {
        exam_id: 'blood_test_001',
        title: '혈액검사',
        description: '일반혈액검사, 간기능, 신장기능, 혈당 검사',
        department: '진단검사의학과',
        building: '본관',
        floor: '1',
        room: '채혈실',
        cost: '45,000',
        base_price: 150000,
        patient_cost: 45000,
        insurance_amount: 105000,
        average_duration: 20
      },
      status: 'completed',
      scheduled_at: '2025-11-18T09:00:00',
      completed_at: '2025-11-18T09:20:00',
      completedAt: '09:20 완료'  // FormatBTemplate용
    },
    {
      appointment_id: 'apt_002',
      exam: {
        exam_id: 'urine_test_001',
        title: '소변검사',
        description: '요단백, 요당, 현미경 검사',
        department: '진단검사의학과',
        building: '본관',
        floor: '1',
        room: '검체실',
        cost: '15,000',
        base_price: 50000,
        patient_cost: 15000,
        insurance_amount: 35000,
        average_duration: 15
      },
      status: 'completed',
      scheduled_at: '2025-11-18T09:25:00',
      completed_at: '2025-11-18T09:40:00',
      completedAt: '09:40 완료'  // FormatBTemplate용
    },
    {
      appointment_id: 'apt_003',
      exam: {
        exam_id: 'ct_scan_001',
        title: 'CT 촬영',
        description: '복부 CT 촬영 (조영제 포함)',
        department: '영상의학과',
        building: '본관',
        floor: '지하1',
        room: 'CT실',
        cost: '180,000',
        base_price: 600000,
        patient_cost: 180000,
        insurance_amount: 420000,
        average_duration: 30
      },
      status: 'completed',
      scheduled_at: '2025-11-18T09:50:00',
      completed_at: '2025-11-18T10:20:00',
      completedAt: '10:20 완료'  // FormatBTemplate용
    },
    {
      appointment_id: 'apt_004',
      exam: {
        exam_id: 'mri_scan_001',
        title: 'MRI 촬영',
        description: '뇌 MRI 촬영',
        department: '영상의학과',
        building: '본관',
        floor: '지하1',
        room: 'MRI실',
        cost: '350,000',
        base_price: 1166667,
        patient_cost: 350000,
        insurance_amount: 816667,
        average_duration: 45
      },
      status: 'completed',
      scheduled_at: '2025-11-18T10:30:00',
      completed_at: '2025-11-18T11:15:00',
      completedAt: '11:15 완료'  // FormatBTemplate용
    }
  ];

  // 소요 시간 계산을 위한 시작/종료 시간 찾기
  const calculateTotalDuration = () => {
    // Mock 데이터 사용 시 고정값 반환
    if (!todaysAppointments || todaysAppointments.length === 0) {
      // 09:00 검사 시작 ~ 11:15 MRI 완료 = 135분 (2시간 15분)
      return 135;
    }
    
    // 완료된 검사들만 필터링
    const completedAppts = todaysAppointments.filter(apt =>
      ['completed', 'done'].includes(apt.status)
    );

    if (completedAppts.length === 0) return 135; // Mock 데이터 기본값
    
    // 가장 이른 시작 시간 찾기 (접수 시간 또는 첫 검사 시작)
    const startTimes = completedAppts.map(apt => {
      // created_at이 있으면 사용 (접수 시간)
      if (apt.created_at) return new Date(apt.created_at);
      // 없으면 scheduled_at 사용
      return new Date(apt.scheduled_at);
    }).filter(date => !isNaN(date));

    if (startTimes.length === 0) return 135; // Mock 데이터 기본값
    
    const firstTime = new Date(Math.min(...startTimes));
    
    // 가장 늦은 완료 시간 찾기
    const endTimes = completedAppts.map(apt => {
      if (apt.completed_at) return new Date(apt.completed_at);
      if (apt.updated_at) return new Date(apt.updated_at);
      // 완료 시간이 없으면 예상 시간을 더해서 추정
      const scheduled = new Date(apt.scheduled_at);
      const duration = apt.exam?.average_duration || 30;
      return new Date(scheduled.getTime() + duration * 60 * 1000);
    }).filter(date => !isNaN(date));

    if (endTimes.length === 0) return 135; // Mock 데이터 기본값
    
    const lastTime = new Date(Math.max(...endTimes));
    
    // 분 단위로 계산
    const durationInMinutes = Math.round((lastTime - firstTime) / (1000 * 60));
    
    return Math.max(0, durationInMinutes); // 음수 방지
  };

  // 완료된 검사들의 후 주의사항 가져오기
  useEffect(() => {
    const fetchPostCareInstructions = async () => {
      const completedAppointments = todaysAppointments.filter(apt => 
        ['completed', 'done'].includes(apt.status)
      );
      
      if (completedAppointments.length === 0) return;

      try {
        const instructions = [];
        
        // 각 완료된 검사의 후 주의사항을 병렬로 가져오기
        const promises = completedAppointments.map(async (apt) => {
          try {
            const response = await apiService.getExamPostCareInstructions(apt.exam?.exam_id || apt.exam_id);
            return response.data || response;
          } catch (error) {
            console.warn(`검사 ${apt.exam?.title || apt.exam_id} 후 주의사항 조회 실패:`, error);
            return null;
          }
        });

        const results = await Promise.all(promises);
        
        // 결과를 우선순위별로 정렬하여 합치기
        results.forEach(instructionList => {
          if (instructionList && Array.isArray(instructionList)) {
            instructions.push(...instructionList);
          }
        });

        // 우선순위별 정렬 (high > medium > low)
        const sortedInstructions = instructions.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        setPostCareInstructions(sortedInstructions.length > 0 ? sortedInstructions : mockPostCareInstructions);
      } catch (error) {
        console.error('검사 후 주의사항 조회 중 오류:', error);
        // 오류 시 Mock 데이터 사용
        setPostCareInstructions(mockPostCareInstructions);
      }
    };

    // todaysAppointments가 없으면 Mock 데이터 바로 사용
    if (!todaysAppointments || todaysAppointments.length === 0) {
      setPostCareInstructions(mockPostCareInstructions);
    } else {
      fetchPostCareInstructions();
    }
  }, [todaysAppointments]);

  // 다음 일정 찾기 - 오늘 남은 일정 또는 미래 예약
  const findNextAppointment = () => {
    const now = new Date();
    
    // 오늘 예약 중 아직 진행하지 않은 것
    const pendingToday = todaysAppointments.filter(apt => 
      ['scheduled', 'pending', 'waiting'].includes(apt.status)
    ).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    
    if (pendingToday.length > 0) {
      return pendingToday[0];
    }
    
    // 모든 예약에서 미래 예약 찾기
    const futureAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate > now && ['scheduled', 'pending'].includes(apt.status);
    }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    
    return futureAppointments.length > 0 ? futureAppointments[0] : null;
  };
  
  const nextAppointment = findNextAppointment();
  
  // 다음 일정 텍스트 생성 (하드코딩)
  const getNextScheduleText = () => {
    // 하드코딩된 다음 일정 반환
    return '2025년 12월 20일 14:00 - 결과 상담 (신경과)';
  };
  
  const nextSchedule = getNextScheduleText();

  // 완료 통계 - 하드코딩
  const completedAppointments = mockCompletedExams;
  const completedCount = 4;
  const totalDuration = 135;
  const totalCost = 590000;

  // 처방 여부 확인
  const hasPrescription = completedAppointments.some(apt => 
    apt.exam?.department === '내과' || 
    apt.exam?.department === '정형외과' ||
    apt.exam?.has_prescription
  );
  
  // 체크리스트 항목 동적 생성
  const checkItems = [];
  
  if (hasPrescription) {
    checkItems.push('처방전을 받으셨나요?');
  }
  
  if (nextAppointment) {
    checkItems.push('다음 예약을 확인하셨나요?');
  }
  
  // 검사 결과 확인이 필요한 검사가 있는지 확인
  const hasResultsToCheck = completedAppointments.some(apt => 
    apt.exam?.title?.includes('혈액') || 
    apt.exam?.title?.includes('CT') || 
    apt.exam?.title?.includes('MRI') ||
    apt.exam?.requires_results_pickup
  );
  
  if (hasResultsToCheck) {
    checkItems.push('검사 결과 수령 방법을 확인하셨나요?');
  }
  
  // 기본 체크항목
  if (checkItems.length === 0) {
    checkItems.push('안전하게 귀가하세요');
  }

  // 실제 API 데이터를 기반으로 주의사항 생성
  const generatePrecautions = () => {
    // postCareInstructions가 있으면 사용 (mock 또는 실제 데이터)
    const instructionsToUse = postCareInstructions.length > 0 
      ? postCareInstructions 
      : mockPostCareInstructions;
    
    if (instructionsToUse.length === 0) {
      // 데이터가 없는 경우 기본 주의사항 반환
      return [{
        icon: '📋',
        title: '검사 후 일반 주의사항',
        priority: 'low',
        bgColor: 'bg-gray-50 text-gray-800',
        items: [
          '충분한 휴식을 취하세요',
          '이상 증상이 나타나면 병원에 연락하세요',
          '다음 진료 예약을 확인하세요'
        ]
      }];
    }

    // API 데이터를 기반으로 주의사항 그룹화
    const groupedInstructions = {};
    
    instructionsToUse.forEach(instruction => {
      const key = `${instruction.type}_${instruction.priority}`;
      if (!groupedInstructions[key]) {
        groupedInstructions[key] = {
          icon: instruction.icon || '📋',
          title: instruction.title,
          priority: instruction.priority,
          bgColor: instruction.priority === 'high' 
            ? 'bg-red-50 text-red-800' 
            : instruction.priority === 'medium'
            ? 'bg-orange-50 text-orange-800'
            : 'bg-blue-50 text-blue-800',
          items: []
        };
      }
      groupedInstructions[key].items.push(instruction.description);
    });

    // 우선순위별로 정렬하여 반환
    const sortedPrecautions = Object.values(groupedInstructions).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return sortedPrecautions;
  };
  
  const precautions = generatePrecautions();
  
  // 오늘의 일정 - 완료된 것들만
  // 로딩 중이면 로딩 표시
  if (isLoading && (!todaysAppointments || todaysAppointments.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor ? apt.exam.floor + '층' : ''} ${apt.exam?.room || ''}`.trim(),
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department,
    completedAt: apt.status === 'completed' || apt.status === 'done' 
      ? apt.completed_at 
        ? new Date(apt.completed_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : apt.updated_at 
          ? new Date(apt.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          : '완료'
      : null,
    cost: apt.status === 'completed' || apt.status === 'done' ? 
      (apt.exam?.cost || apt.cost || '25,000') : null,
    // FormatBTemplate에서 사용할 속성 추가
    exam: apt.exam,
    appointment_id: apt.appointment_id
  })) || [];

  // P-7 마무리: 퇴원 안내 위치 정보 (시연용)
  const locationInfo = {
    name: '정문 출구',
    building: '본관',
    floor: '1층',
    room: '정문',
    department: '',
    directions: '안전하게 귀가하세요. 택시 승강장은 정문 앞에 있습니다.',
    mapFile: 'main_1f.svg',
    svgId: 'main-exit',
    // 시연용 좌표 데이터
    x_coord: 100,
    y_coord: 450,
    // 현재 위치 (수납창구에서 출발)
    currentLocation: {
      x_coord: 280,
      y_coord: 250,
      building: '본관',
      floor: '1',
      room: '수납창구'
    },
    // 경로 노드 (시연용)
    pathNodes: [
      { x: 280, y: 250, label: '현재 위치 (수납창구)' },
      { x: 200, y: 300, label: '중앙 홀' },
      { x: 100, y: 400, label: '로비' },
      { x: 100, y: 450, label: '정문 출구' }
    ]
  };

  return (
    <>
      <style>{animationStyles}</style>
      <FormatBTemplate
      screenType="completed"
      status="완료"
      nextSchedule={nextSchedule}
      summaryCards={[]}
      todaySchedule={todaySchedule}
      showPaymentInfo={true}
      paymentAmount={590000}
      completedAppointments={mockCompletedExams}
      totalDuration={135}
      completedCount={4}
      precautions={precautions}
      locationInfo={locationInfo}
      taggedLocation={taggedLocation}
      patientState="FINISHED"
    >
      {/* 처방전 안내 */}
      {hasPrescription && (
        <section className="mb-8" style={{ animation: 'fadeUp 0.8s ease-out' }}>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              처방전 안내
            </h3>
            <div className="bg-white rounded-xl p-4">
              <p className="text-lg text-gray-700 mb-3">
                조제약국에서 처방전을 제출하여 약을 받으세요.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>처방전은 발행일로부터 3일 이내에 사용하세요</span>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* 다음 예약 관련 액션 */}
      <section className="mb-8">
        {nextAppointment && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 110 2h-1v9a3 3 0 01-3 3H9a3 3 0 01-3-3V9H5a1 1 0 110-2h3z" />
              </svg>
              다음 예약 준비
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  // 카카오톡 공유 API 호출
                  if (window.Kakao) {
                    window.Kakao.Link.sendDefault({
                      objectType: 'text',
                      text: `[병원 예약 알림]\n다음 예약: ${nextSchedule}\n\n이 메시지는 나에게 보내는 메모입니다.`,
                      link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href
                      }
                    });
                  }
                }}
                className="group bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 rounded-2xl p-4 
                         font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300
                         shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3C6.48 3 2 6.12 2 10c0 2.23 1.5 4.22 3.84 5.5-.15.5-.37 1.22-.57 1.84-.24.74.43 1.35 1.1.94.56-.34 1.41-.87 2.13-1.34C9.56 17.28 10.75 17.5 12 17.5c5.52 0 10-3.12 10-7.5S17.52 3 12 3z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-bold">카카오톡 메모</h4>
                  <p className="text-sm opacity-80">나에게 예약 알림 보내기</p>
                </div>
              </button>
              
              <button 
                onClick={() => setShowModal(true)}
                className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-4 
                         font-bold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300
                         shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  🔔
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-bold">알림 설정</h4>
                  <p className="text-sm opacity-80">다음 예약까지 자동 알림</p>
                </div>
              </button>
            </div>
          </div>
        )}
        
      </section>
      
      {/* 알림 설정 모달 - 더 세련되게 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             style={{ animation: 'fadeUp 0.3s ease-out' }}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
               style={{ animation: 'fadeUp 0.4s ease-out' }}>
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                🔔
              </div>
              <h3 className="text-2xl font-bold">다음 예약 알림</h3>
              <p className="text-blue-100 mt-1">편리한 병원 이용을 위한 스마트 알림</p>
            </div>
            
            {/* 내용 */}
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  알림 혜택
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <span className="text-gray-700">검사 전날 준비사항 알림</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <span className="text-gray-700">당일 아침 일정 알림</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <span className="text-gray-700">다음 방문까지 자동 로그인</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">보안 안내</h5>
                    <p className="text-sm text-gray-700">
                      로그인 정보는 다음 예약일까지만<br />
                      휴대폰에 안전하게 저장됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 버튼 */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 px-4 font-bold
                         hover:bg-gray-200 transition-all duration-300">
                취소
              </button>
              <button
                onClick={() => {
                  // 알림 설정 API 호출
                  setShowModal(false);
                  alert('알림이 설정되었습니다');
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 px-4 font-bold
                         hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg">
                동의하고 설정
              </button>
            </div>
          </div>
        </div>
      )}
      </FormatBTemplate>
    </>
  );
}