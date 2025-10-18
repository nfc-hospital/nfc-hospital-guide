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
import UnifiedJourneyTemplate from './templates/UnifiedJourneyTemplate';

// ProgressBar import
import ProgressBar from './journey/ProgressBar';

// CalledModal import
import CalledModal from './modals/CalledModal';

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

    // ARRIVED ~ PAYMENT: UnifiedJourneyTemplate 사용
    case PatientJourneyState.ARRIVED:
    case PatientJourneyState.REGISTERED:
    case PatientJourneyState.WAITING:
    case PatientJourneyState.CALLED:
    case PatientJourneyState.IN_PROGRESS:
    case PatientJourneyState.PAYMENT:
      return {
        Template: UnifiedJourneyTemplate,
        Content: null,
        screenType: 'journey'
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

  // CalledModal 상태 관리
  const [showCalledModal, setShowCalledModal] = React.useState(false);
  const [calledQueueData, setCalledQueueData] = React.useState(null);

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
    // UNREGISTERED: 병원 도착 전 - 첫 예약의 날짜/시간 표시
    if (currentState === PatientJourneyState.UNREGISTERED) {
      if (!appointments || appointments.length === 0) return null;

      const firstAppointment = appointments[0];
      if (!firstAppointment?.scheduled_at) return null;

      const appointmentDate = new Date(firstAppointment.scheduled_at);
      const today = new Date();
      const isToday = appointmentDate.toDateString() === today.toDateString();

      if (isToday) {
        // 오늘이면 시간만
        const timeStr = appointmentDate.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `오늘 ${timeStr}`;
      } else {
        // 다른 날이면 날짜 + 시간
        const dateStr = appointmentDate.toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric'
        });
        const timeStr = appointmentDate.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${dateStr} ${timeStr}`;
      }
    }

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

  const getSummaryCards = (appointments, stats, duration, state) => {
    if (!appointments || appointments.length === 0) return null;

    // UNREGISTERED: 병원 도착 전 - 예약 정보 표시
    if (state === PatientJourneyState.UNREGISTERED) {
      // 첫 검사 시작 시간
      const firstAppointment = appointments[0];
      const appointmentTime = firstAppointment?.scheduled_at
        ? new Date(firstAppointment.scheduled_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        : '미정';

      return [
        {
          label: '첫 검사 시간',
          value: appointmentTime
        },
        {
          label: '총 검사 수',
          value: `${appointments.length}개`
        }
      ];
    }

    // 기타 상태: 완료된 검사 / 소요시간
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

  // CALLED 상태 모니터링 및 CalledModal 표시
  React.useEffect(() => {
    if (currentState === PatientJourneyState.CALLED) {
      // CALLED 상태의 검사 찾기
      const calledAppointment = todaysAppointments?.find(
        apt => apt.status === 'called' || apt.status === 'in_progress'
      );

      if (calledAppointment) {
        setCalledQueueData(calledAppointment);
        setShowCalledModal(true);

        // 진동 피드백 (모바일 기기)
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]); // 패턴: 200ms on, 100ms off, 200ms on
        }
      }
    } else {
      // CALLED가 아닌 다른 상태로 변경되면 모달 닫기
      setShowCalledModal(false);
    }
  }, [currentState, todaysAppointments]);

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

  // 🎯 상태별 조건부 props 전달
  const getTemplateProps = () => {
    const baseProps = {
      screenType,
      patientState: currentState,
      taggedLocation,
      progressBar: <ProgressBar appointments={todaysAppointments} patientState={currentState} />,
      status: getStatusText(currentState),
      nextSchedule: getNextScheduleText(todaysAppointments, currentState),
      summaryCards: getSummaryCards(todaysAppointments, journeySummary, journeySummary.totalDuration, currentState),
      todaysAppointments,
      todaySchedule,
    };

    // ARRIVED ~ PAYMENT: UnifiedJourneyTemplate 사용 (Content 불필요)
    if (screenType === 'journey') {
      return baseProps;
    }

    // UNREGISTERED: 공통 서류 준비사항 데이터 정의 (JourneyContainer가 준비)
    const commonPreparationItems = [
      {
        icon: '📄',
        title: '공통 서류 준비사항',
        description: '모든 검사에 필요한 서류입니다',
        items: [
          { text: '신분증 (주민등록증, 운전면허증)' },
          { text: '건강보험증' },
          { text: '의뢰서 (타 병원에서 온 경우)' },
          { text: '이전 검사 결과지 (있는 경우)' }
        ]
      }
    ];

    // UNREGISTERED: preparationItems와 customPreparationContent 모두 전달
    if (currentState === PatientJourneyState.UNREGISTERED) {
      return {
        ...baseProps,
        preparationItems: commonPreparationItems,  // Template가 accordion으로 렌더링
        customPreparationContent: <Content />       // 검사별 준비사항 (ExamPreparationChecklist)
      };
    }

    // FINISHED: mainContent로 전달하되, completion 관련 props도 함께 전달
    if (currentState === PatientJourneyState.FINISHED) {
      // 처방전 여부 확인
      const hasPrescription = journeySummary.completedAppointments?.some(apt =>
        apt.exam?.department === '내과' ||
        apt.exam?.department === '정형외과' ||
        apt.exam?.has_prescription
      ) || false;

      return {
        ...baseProps,
        mainContent: (
          <Content
            nextAppointment={nextAppointment}
            loadingNextAppointment={loadingNextAppointment}
            completedAppointments={journeySummary.completedAppointments}
            hasPrescription={hasPrescription}
          />
        ),
        completionStats: journeySummary,
        completedAppointments: journeySummary.completedAppointments,
        totalDuration: journeySummary.totalDuration,
        completedCount: journeySummary.completedCount,
        showPaymentInfo: true,
        paymentAmount: journeySummary.completedAppointments?.length > 0
          ? journeySummary.completedAppointments.reduce((total, apt) => {
              const cost = apt.exam?.patient_cost || apt.exam?.base_price || 0;
              const numericCost = typeof cost === 'string' ? parseInt(cost.replace(/[^0-9]/g, '')) : Number(cost);
              return total + numericCost;
            }, 0)
          : 0
      };
    }

    // 기타 상태 (기본 fallback - 사실상 여기 도달하지 않음)
    return {
      ...baseProps,
      mainContent: Content ? <Content /> : null
    };
  };

  // 🎯 완전 단순화된 렌더링: 실제 백엔드 데이터 사용
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Template {...getTemplateProps()} />

      {/* CalledModal 오버레이 */}
      <CalledModal
        isOpen={showCalledModal}
        onClose={() => setShowCalledModal(false)}
        queueData={calledQueueData}
      />
    </React.Suspense>
  );
};

export default JourneyContainer;