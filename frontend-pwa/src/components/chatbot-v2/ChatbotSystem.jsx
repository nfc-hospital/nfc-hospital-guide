import React, { useState, useEffect } from 'react';
import Stage1_FloatingButton from './stages/Stage1_FloatingButton';
import Stage2_QuickSelect from './stages/Stage2_QuickSelect';
import Stage3_FullChat from './stages/Stage3_FullChat';
import './ChatbotSystem.css';

const ChatbotSystem = ({ elderlyMode = false }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isTyping, setIsTyping] = useState(false);

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
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: '안녕하세요! 병원 안내 도우미입니다. 무엇을 도와드릴까요?',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error('챗봇 응답 오류:', error);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (messageText) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: '죄송합니다. 현재 개발 중인 기능입니다. 곧 더 나은 서비스로 찾아뵙겠습니다!',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
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