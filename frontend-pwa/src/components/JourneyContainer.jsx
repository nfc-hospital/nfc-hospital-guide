// src/components/JourneyContainer.jsx
import React from 'react';
import useJourneyStore from '../store/journeyStore';
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
      'COMPLETED': '검사 완료',
      'PAYMENT': '수납 대기',
      'FINISHED': '모든 일정 완료'
    };
    return statusTexts[state] || '진행 중';
  };

  const getNextScheduleText = (appointments) => {
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

  // 🔧 테스트용 데이터 주입 (실제 데이터가 없을 때)
  if (!todaysAppointments || todaysAppointments.length === 0) {
    console.warn('⚠️ No appointments data, injecting test data...');
    const testAppointments = [
      {
        appointment_id: 'test_1',
        status: 'completed',
        exam: { title: '혈액검사', average_duration: 15, department: '진단검사의학과' },
        scheduled_at: '09:00'
      },
      {
        appointment_id: 'test_2',
        status: 'completed',
        exam: { title: '심전도검사', average_duration: 10, department: '순환기내과' },
        scheduled_at: '09:30'
      },
      {
        appointment_id: 'test_3',
        status: 'in_progress',
        exam: { title: 'X-Ray', average_duration: 20, department: '영상의학과' },
        scheduled_at: '10:00'
      }
    ];

    // 테스트 데이터로 completionStats 재계산
    const completed = testAppointments.filter(apt => apt.status === 'completed');
    const testCompletionStats = {
      completedCount: completed.length,
      totalCount: testAppointments.length,
      completedAppointments: completed
    };

    const testTotalDuration = completed.reduce((sum, apt) => sum + (apt.exam?.average_duration || 30), 0);

    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <Template
          screenType={screenType}
          patientState={currentState}
          taggedLocation={taggedLocation}
          progressBar={<ProgressBar appointments={testAppointments} />}
          mainContent={<Content />}
          status={getStatusText(currentState)}
          nextSchedule={getNextScheduleText(testAppointments)}
          summaryCards={getSummaryCards(testAppointments, testCompletionStats, testTotalDuration)}
          todaysAppointments={testAppointments}
          todaySchedule={testAppointments.map((apt, index) => ({
            id: apt.appointment_id,
            examName: apt.exam?.title || `검사 ${index + 1}`,
            location: apt.exam?.department || '위치 미정',
            status: apt.status,
            description: apt.exam?.description,
            duration: apt.exam?.average_duration || 30,
            scheduled_at: apt.scheduled_at,
            exam: apt.exam
          }))}
          completionStats={testCompletionStats}
          completedAppointments={completed}
          totalDuration={testTotalDuration}
          completedCount={testCompletionStats.completedCount}
        />
      </React.Suspense>
    );
  }

  // 로딩 상태 처리
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // 🎯 완전 단순화된 렌더링: 조립만 담당
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Template
        screenType={screenType}
        patientState={currentState}
        taggedLocation={taggedLocation}
        // ✅ ProgressBar에 필요한 데이터 전달
        progressBar={<ProgressBar appointments={todaysAppointments} />}
        // ✅ Content 컴포넌트 전달
        mainContent={<Content />}
        // ✅ FormatBTemplate에 필요한 핵심 props 전달
        status={getStatusText(currentState)}
        nextSchedule={getNextScheduleText(todaysAppointments)}
        summaryCards={getSummaryCards(todaysAppointments, completionStats, totalDuration)}
        todaysAppointments={todaysAppointments}
        todaySchedule={todaySchedule}
        completionStats={completionStats}
        completedAppointments={completionStats.completedAppointments}
        totalDuration={totalDuration}
        completedCount={completionStats.completedCount}
      />
    </React.Suspense>
  );
};

export default JourneyContainer;