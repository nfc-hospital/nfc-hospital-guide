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
      >
        <Content />
      </Template>
    </React.Suspense>
  );
};

export default JourneyContainer;