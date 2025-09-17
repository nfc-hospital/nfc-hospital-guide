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

  // 🎯 순수한 조립: 상태에 따른 컴포넌트 선택만
  const currentState = patientState?.current_state || patientState || PatientJourneyState.REGISTERED;
  const { Template, Content, screenType } = getJourneyComponents(currentState);

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
        // ✅ FormatBTemplate에 필요한 데이터 전달
        todaysAppointments={todaysAppointments}
        todaySchedule={todaySchedule}
        completionStats={completionStats}
        completedAppointments={completionStats.completedAppointments}
        totalDuration={totalDuration}
        completedCount={completionStats.completedCount}
      >
        <Content />
      </Template>
    </React.Suspense>
  );
};

export default JourneyContainer;