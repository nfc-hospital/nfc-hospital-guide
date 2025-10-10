// src/components/JourneyContainer.jsx
import React, { useState, useEffect } from 'react';
import useJourneyStore from '../store/journeyStore';
import { PatientJourneyState } from '../constants/states';
import { PatientJourneyAPI } from '../api/patientJourneyService';

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

// ProgressBar import
import ProgressBar from './journey/ProgressBar';

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

    // COMPLETED 케이스 제거 - Backend에서 동적으로 WAITING 또는 PAYMENT로 전환됨

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
  // 🎯 순수한 조립 역할: 어떤 화면을 보여줄지만 결정
  const patientState = useJourneyStore(state => state.patientState);
  const isLoading = useJourneyStore(state => state.isLoading);
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);

  // FormatBTemplate에 필요한 추가 데이터 (useMemo로 메모이제이션)
  const todaySchedule = React.useMemo(() => {
    if (!todaysAppointments) return [];
    return todaysAppointments.map((apt, index) => ({
      id: apt.appointment_id,
      examName: apt.exam?.title || `검사 ${index + 1}`,
      location: apt.exam?.room || apt.exam?.title || '위치 미정',
      status: apt.status,
      description: apt.exam?.description,
      duration: apt.exam?.average_duration || 30,
      scheduled_at: apt.scheduled_at,
      exam: apt.exam
    }));
  }, [todaysAppointments]);

  const completionStats = React.useMemo(() => {
    if (!todaysAppointments) return { completedCount: 0, totalCount: 0, completedAppointments: [] };

    const completed = todaysAppointments.filter(apt =>
      apt.status === 'completed' || apt.status === 'examined'
    );
    return {
      completedCount: completed.length,
      totalCount: todaysAppointments.length,
      completedAppointments: completed
    };
  }, [todaysAppointments]);

  const totalDuration = React.useMemo(() => {
    return completionStats.completedAppointments.reduce((sum, apt) => sum + (apt.exam?.average_duration || 30), 0);
  }, [completionStats.completedAppointments]);

  // FormatBTemplate용 helper 함수들
  const getStatusText = (state) => {
    const statusTexts = {
      'UNREGISTERED': '병원 도착 전',
      'ARRIVED': '병원 도착',
      'REGISTERED': '접수 완료',
      'WAITING': '검사 대기',
      'CALLED': '호출됨',
      'IN_PROGRESS': '검사 중',
      // 'COMPLETED': '검사 완료', // 제거 - Backend에서 동적 분기
      'PAYMENT': '수납 대기',
      'FINISHED': '모든 일정 완료'
    };
    return statusTexts[state] || '진행 중';
  };


  const getNextScheduleText = (appointments, currentState) => {
    // finished 상태일 때는 실제 다음 예약 정보 사용
    if (currentState === PatientJourneyState.FINISHED) {
      if (loadingNextAppointment) {
        return '다음 예약 확인 중...';
      }
      if (nextAppointment && nextAppointment.exam) {
        const appointmentDate = new Date(nextAppointment.scheduled_at);
        const dateStr = appointmentDate.toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric'
        });
        const timeStr = appointmentDate.toLocaleTimeString('ko-KR', {
          hour: 'numeric',
          hour12: true
        });
        return `다음: ${dateStr} ${timeStr}`;
      }
      return '다음: 예약된 일정이 없습니다'; // 다음 예약이 없어도 영역 표시
    }

    if (!appointments || appointments.length === 0) return null;
    const nextApt = appointments.find(apt => ['pending', 'waiting'].includes(apt.status));
    return nextApt ? `다음: ${nextApt.exam?.title || '검사'}` : null;
  };

  const getSummaryCards = (appointments, stats, duration) => {
    if (!appointments) return null;

    return [
      {
        label: '완료된 검사',
        value: `${stats.completedCount}/${appointments.length}`
      },
      {
        label: '총 소요시간',
        value: `${Math.floor(duration / 60)}시간 ${duration % 60}분`
      }
    ];
  };

  // 🎯 순수한 조립: 상태에 따른 컴포넌트 선택만
  const currentState = patientState?.current_state || patientState || PatientJourneyState.FINISHED;
  const { Template, Content, screenType } = getJourneyComponents(currentState);

  // finished 상태일 때 다음 예약 정보 조회
  const [nextAppointment, setNextAppointment] = React.useState(null);
  const [loadingNextAppointment, setLoadingNextAppointment] = React.useState(false);

  React.useEffect(() => {
    if (currentState === PatientJourneyState.FINISHED) {
      const fetchNextAppointment = async () => {
        try {
          setLoadingNextAppointment(true);
          const response = await PatientJourneyAPI.getNextAppointment();
          if (response.success && response.data) {
            setNextAppointment(response.data);
          } else {
            setNextAppointment(null);
          }
        } catch (error) {
          console.error('다음 예약 조회 실패:', error);
          setNextAppointment(null);
        } finally {
          setLoadingNextAppointment(false);
        }
      };
      fetchNextAppointment();
    }
  }, [currentState]);

  // 🆕 실제 백엔드 데이터 사용 (테스트 데이터 제거) - 안정적인 selector 사용
  const journeySummary = React.useMemo(() => {
    if (!todaysAppointments || todaysAppointments.length === 0) {
      console.log('📊 JourneyContainer: 당일 예약 데이터가 없습니다');
      return {
        completedCount: 0,
        totalCount: 0,
        completedAppointments: [],
        totalDuration: 0,
        totalDurationText: '0분'
      };
    }

    console.log('📊 JourneyContainer: 실제 백엔드 데이터 처리 중...', todaysAppointments.length, '개 예약');

    // 완료된 검사 필터링 (completed, examined, done 상태 모두 완료로 처리)
    const completedTasks = todaysAppointments.filter(
      apt => ['completed', 'examined', 'done'].includes(apt.status)
    );

    // 총 소요시간 계산 (실제 시간 기반)
    let totalMinutes = 0;

    completedTasks.forEach(apt => {
      if (apt.started_at && apt.completed_at) {
        // 실제 시작/완료 시간이 있으면 그것을 사용
        const startTime = new Date(apt.started_at);
        const endTime = new Date(apt.completed_at);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        totalMinutes += durationMinutes;
      } else {
        // 실제 시간이 없으면 평균 소요시간 사용
        totalMinutes += apt.exam?.average_duration || 30;
      }
    });

    // 시간을 "X시간 Y분" 형태로 변환
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalDurationText = hours > 0
      ? `${hours}시간 ${minutes}분`
      : `${minutes}분`;

    return {
      completedCount: completedTasks.length,
      totalCount: todaysAppointments.length,
      completedAppointments: completedTasks,
      totalDuration: totalMinutes,
      totalDurationText: totalDurationText
    };
  }, [todaysAppointments]);

  // 로딩 상태 처리
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // 🎯 완전 단순화된 렌더링: 실제 백엔드 데이터 사용
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Template
        screenType={screenType}
        patientState={currentState}
        taggedLocation={taggedLocation}
        // ✅ ProgressBar에 필요한 데이터 전달 (patientState 포함)
        progressBar={<ProgressBar appointments={todaysAppointments} patientState={currentState} />}
        // ✅ Content 컴포넌트 전달
        mainContent={<Content />}
        // ✅ FormatBTemplate에 필요한 핵심 props 전달 (실제 백엔드 데이터 사용)
        status={getStatusText(currentState)}
        nextSchedule={getNextScheduleText(todaysAppointments, currentState)}
        summaryCards={getSummaryCards(todaysAppointments, journeySummary, journeySummary.totalDuration)}
        todaysAppointments={todaysAppointments}
        todaySchedule={todaySchedule}
        completionStats={journeySummary}
        completedAppointments={journeySummary.completedAppointments}
        totalDuration={journeySummary.totalDuration}
        completedCount={journeySummary.completedCount}
        showPaymentInfo={true}
        paymentAmount={journeySummary.completedAppointments?.length > 0
          ? journeySummary.completedAppointments.reduce((total, apt) => {
              // API에서 받은 실제 환자 본인부담금 사용
              const cost = apt.exam?.patient_cost || apt.exam?.base_price || 0;
              const numericCost = typeof cost === 'string' ? parseInt(cost.replace(/[^0-9]/g, '')) : Number(cost);
              return total + numericCost;
            }, 0)
          : 0 // 기본 금액을 0으로 변경
        }
      />
    </React.Suspense>
  );
};

export default JourneyContainer;