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

  // 소요 시간 계산을 위한 시작/종료 시간 찾기
  const calculateTotalDuration = () => {
    if (!todaysAppointments || todaysAppointments.length === 0) return 0;
    
    // 완료된 검사들만 필터링
    const completedAppts = todaysAppointments.filter(apt => 
      ['completed', 'done'].includes(apt.status)
    );
    
    if (completedAppts.length === 0) return 0;
    
    // 가장 이른 시작 시간 찾기 (접수 시간 또는 첫 검사 시작)
    const startTimes = completedAppts.map(apt => {
      // created_at이 있으면 사용 (접수 시간)
      if (apt.created_at) return new Date(apt.created_at);
      // 없으면 scheduled_at 사용
      return new Date(apt.scheduled_at);
    }).filter(date => !isNaN(date));
    
    if (startTimes.length === 0) return 0;
    
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
    
    if (endTimes.length === 0) return 0;
    
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

        setPostCareInstructions(sortedInstructions);
      } catch (error) {
        console.error('검사 후 주의사항 조회 중 오류:', error);
      }
    };

    fetchPostCareInstructions();
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
  
  // 다음 일정 텍스트 생성
  const getNextScheduleText = () => {
    if (!nextAppointment) {
      return '예정된 일정이 없습니다';
    }
    
    const date = new Date(nextAppointment.scheduled_at);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${nextAppointment.exam?.title || '다음 검사'}`;
    } else {
      return `${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${nextAppointment.exam?.title || '다음 검사'}`;
    }
  };
  
  const nextSchedule = getNextScheduleText();

  // 완료 통계
  const completedAppointments = todaysAppointments.filter(apt => 
    ['completed', 'done'].includes(apt.status)
  );
  const completedCount = completedAppointments.length;
  
  // 소요 시간 계산 - 고정값 사용
  const totalDuration = calculateTotalDuration();
  
  // 총 비용 계산 - 실제 비용 정보가 있으면 사용, 없으면 예상 비용
  const totalCost = completedAppointments
    .reduce((sum, apt) => {
      const cost = apt.cost || apt.exam?.cost || '25000';
      const numericCost = typeof cost === 'string' ? 
        parseInt(cost.replace(/[^0-9]/g, '')) : cost;
      return sum + numericCost;
    }, 0);

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
    if (postCareInstructions.length === 0) {
      // API 데이터가 없는 경우 기본 주의사항 반환
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
    
    postCareInstructions.forEach(instruction => {
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
      ? new Date(apt.updated_at || apt.completed_at || new Date()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : null,
    cost: apt.status === 'completed' || apt.status === 'done' ? 
      (apt.cost || apt.exam?.cost || '25,000') : null
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
      paymentAmount={totalCost}
      completedAppointments={completedAppointments}
      totalDuration={totalDuration}
      completedCount={completedCount}
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