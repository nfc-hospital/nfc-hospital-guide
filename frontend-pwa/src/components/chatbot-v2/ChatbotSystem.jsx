import React, { useState, useEffect } from 'react';
import Stage1_FloatingButton from './stages/Stage1_FloatingButton';
import Stage2_QuickSelect from './stages/Stage2_QuickSelect';
import Stage3_FullChat from './stages/Stage3_FullChat';
import './ChatbotSystem.css';
import apiService from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import useJourneyStore from '../../store/journeyStore';
import { PatientJourneyState, QueueDetailState } from '../../constants/states';

const ChatbotSystem = ({ elderlyMode = false }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();
  const { 
    currentQueues, 
    todaysAppointments,
    queuePosition,
    estimatedWaitTime,
    currentLocation,
    patientState,
    user: journeyUser
  } = useJourneyStore();

  // 사용자 컨텍스트 가져오기 (journeyStore 데이터 활용)
  const getUserContext = async () => {
    const context = {
      // 기본 병원 정보
      hospitalInfo: {
        mainNumber: '1588-0000',
        address: '서울특별시 종로구 한이음로 119',
        emergency: '02-0000-0000',
        consultation: '02-0000-0001',
        departments: {
          '내과': '02-0000-0200',
          '정형외과': '02-0000-0300',
          '재활의학과': '02-0000-0400',
          '영상의학과': '02-0000-0500',
          '이비인후과': '02-0000-0600',
          '진단검사의학과': '02-0000-0700',
          '응급실': '02-0000-0000'
        },
        operatingHours: {
          weekday: '평일: 09:00 - 17:30',
          saturday: '토요일: 09:00 - 13:00',
          sunday: '일요일/공휴일: 응급실만 운영'
        },
        facilities: {
          cafe: '본관 1층 카페',
          store: '본관 1층 편의점',
          pharmacy: '본관 1층 원내약국',
          bank: '본관 1층 은행',
          administration: '본관 1층 원무과',
          infoDesk: '본관 1층 안내데스크'
        }
      },
      // 초기값 설정
      isLoggedIn: false,
      hasAppointment: false,
      isInQueue: false,
      currentLocation: null,
      patientState: null,
      userInfo: null
    };

    // 로그인한 사용자만 journeyStore 데이터 활용
    if (user && journeyUser) {
      context.isLoggedIn = true;
      context.patientState = patientState || journeyUser.state || 'UNREGISTERED';
      
      // 사용자 기본 정보 (개인정보 제외)
      context.userInfo = {
        role: journeyUser.role,
        state: context.patientState,
        stateDescription: getPatientStateDescription(context.patientState)
      };
      // 오늘의 예약 정보 (journeyStore에서)
      if (todaysAppointments?.length > 0) {
        context.hasAppointment = true;
        context.appointmentInfo = {
          count: todaysAppointments.length,
          appointments: todaysAppointments.map(apt => ({
            time: formatTime(apt.scheduled_at),
            examName: apt.exam?.title || '검사',
            examCategory: apt.exam?.category || apt.exam?.department || '일반',
            location: apt.exam ? `${apt.exam.building || '본관'} ${apt.exam.floor || ''}${apt.exam.room ? ' ' + apt.exam.room : ''}` : '미정',
            status: apt.status,
            hasQueue: apt.queue_info ? true : false
          }))
        };
      }

      // 현재 대기열 정보 (journeyStore에서)
      if (currentQueues?.length > 0) {
        context.isInQueue = true;
        context.queueInfo = currentQueues.map(queue => ({
          queueNumber: queue.queue_number || queuePosition,
          estimatedWaitMinutes: queue.estimated_wait_time || estimatedWaitTime || 0,
          estimatedWaitText: formatWaitTime(queue.estimated_wait_time || estimatedWaitTime),
          examName: queue.exam?.title || '검사',
          examLocation: queue.exam ? `${queue.exam.building || '본관'} ${queue.exam.floor || ''}${queue.exam.room ? ' ' + queue.exam.room : ''}` : '미정',
          state: queue.state,
          stateText: getQueueStateText(queue.state),
          priority: queue.priority,
          calledAt: queue.called_at ? formatTime(queue.called_at) : null
        }));
      }

      // 현재 위치 정보
      if (currentLocation) {
        context.currentLocationInfo = {
          display: `${currentLocation.building} ${currentLocation.floor} ${currentLocation.room || ''}`.trim(),
          building: currentLocation.building,
          floor: currentLocation.floor,
          room: currentLocation.room,
          description: currentLocation.description
        };
      }
    } else {
      // 비로그인 사용자
      context.isLoggedIn = false;
      context.loginRequired = true;
      context.userInfo = {
        role: 'guest',
        state: 'NOT_LOGGED_IN',
        stateDescription: '로그인이 필요합니다'
      };
    }

    // 챗봇에게 명확한 지침 추가
    context.instructions = {
      responseGuideline: '화면에 표시된 정보만 사용하여 답변해주세요. 환자의 현재 상태와 대기 정보를 기반으로 안내해주세요.',
      availableData: '사용 가능한 정보: 환자 상태(9단계), 대기 번호, 예상 시간, 검사 종류, 검사 위치, 현재 위치, 병원 시설 정보',
      forbiddenInfo: '요구하지 말아야 할 정보: 환자 이름, 생년월일, 전화번호, 주민등록번호, 병력, 진단명',
      nonLoginResponse: context.isLoggedIn ? null : '로그인하지 않은 사용자입니다. 개인화된 정보는 제공할 수 없으며, 로그인하시거나 본관 1층 안내데스크를 방문하시기 바랍니다.'
    };

    return context;
  };

  // 헬퍼 함수들
  const formatTime = (dateString) => {
    if (!dateString) return '미정';
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}시${minutes > 0 ? ' ' + minutes + '분' : ''}`;
  };

  const formatWaitTime = (minutes) => {
    if (!minutes || minutes === 0) return '진료 준비 중';
    if (minutes < 60) return `약 ${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `약 ${hours}시간${mins > 0 ? ' ' + mins + '분' : ''}`;
  };

  const getQueueStateText = (state) => {
    const stateMap = {
      'waiting': '대기 중',
      'called': '호출됨',
      [QueueDetailState.IN_PROGRESS]: '진료 중',
      'completed': '완료',
      'delayed': '지연',
      'no_show': '미방문',
      'cancelled': '취소'
    };
    return stateMap[state] || state;
  };

  const getPatientStateDescription = (state) => {
    const stateDescriptions = {
      'UNREGISTERED': '병원 도착 전',
      'ARRIVED': '병원 도착',
      'REGISTERED': '접수 완료',
      'WAITING': '대기 중',
      'CALLED': '호출됨',
      [PatientJourneyState.IN_PROGRESS]: '검사/진료 진행 중',
      'COMPLETED': '검사/진료 완료',
      'PAYMENT': '수납 대기',
      'FINISHED': '모든 절차 완료'
    };
    return stateDescriptions[state] || '상태 확인 중';
  };

  const handleStageTransition = (newStage, data = null) => {
    setCurrentStage(newStage);
    if (data) {
      if (data.question) {
        setSelectedQuestion(data.question);
        if (newStage === 3) {
          initializeChat(data.question);
        }
      }
    }
  };

  const initializeChat = async (question) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: question,
      timestamp: new Date()
    };
    
    setMessages([userMessage]);
    setIsTyping(true);

    try {
      // 사용자 컨텍스트 가져오기
      const context = await getUserContext();
      
      // 컨텍스트를 chatbotAPI의 fallback에서 사용할 수 있도록 전달
      const { chatbotAPI: chatbot } = await import('./utils/chatbotAPI');
      
      const response = await chatbot.sendMessage(question, {
        currentQueues: currentQueues,
        todaysAppointments: todaysAppointments,
        patientState: context.patientState,
        userInfo: context.userInfo,
        ...context
      });
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message || '죄송합니다, 답변을 가져올 수 없습니다.',
        structuredData: response.structuredData || null,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '죄송합니다, 챗봇 서버와 통신 중 오류가 발생했습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };


  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 프론트엔드는 단순히 질문만 전송
      // 서버가 JWT 토큰으로 사용자를 식별하고 컨텍스트를 조회함
      const { chatbotAPI: chatbot } = await import('./utils/chatbotAPI');
      
      // 컨텍스트 전송 제거 - 서버가 직접 조회
      const response = await chatbot.sendMessage(text);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message || '죄송합니다, 답변을 가져올 수 없습니다.',
        structuredData: response.structuredData || null,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '죄송합니다, 답변을 가져오는 데 실패했습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-system">
      {currentStage >= 1 && (
        <Stage1_FloatingButton
          isActive={currentStage === 1}
          elderlyMode={elderlyMode}
          onClick={() => handleStageTransition(2)}
          position={position}
        />
      )}

      {currentStage === 2 && (
        <Stage2_QuickSelect
          elderlyMode={elderlyMode}
          onClose={() => handleStageTransition(1)}
          onSelectQuestion={(question) => 
            handleStageTransition(3, { question })
          }
          position={position}
        />
      )}

      {currentStage === 3 && (
        <Stage3_FullChat
          elderlyMode={elderlyMode}
          messages={messages}
          isTyping={isTyping}
          onBack={() => handleStageTransition(2)}
          onClose={() => handleStageTransition(1)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default ChatbotSystem;