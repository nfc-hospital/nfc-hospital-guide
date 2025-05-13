import { useState } from 'react';
import '../styles/ChatbotButton.css';

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      text: '안녕하세요! 무엇을 도와드릴까요?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };
  
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage = {
      type: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    try {
      // 실제 API 호출 (현재는 Mock)
      // const response = await fetch('/api/chatbot', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: input })
      // });
      // const data = await response.json();
      
      // 임시 응답 Mock
      const botResponses = {
        '검사': '검사 전 준비사항은 각 검사별로 다릅니다. X-ray는 금속 제거, 혈액검사는 금식이 필요합니다.',
        '위치': '현재 위치에서 검사실까지 경로는 앱 하단의 지도 버튼을 누르면 확인하실 수 있습니다.',
        '대기': '현재 예상 대기시간은 약 15분입니다. 정확한 시간은 검사실 화면에서 확인하실 수 있습니다.',
        '결과': '검사 결과는 보통 1-3일 내에 확인 가능합니다. 결과가 나오면 알림을 보내드립니다.',
        '주차': '병원 지하 1층과 별관 옆 주차장을 이용하실 수 있습니다. 4시간까지 무료입니다.',
        '시간': '병원 운영시간은 평일 9시부터 18시까지, 토요일은 9시부터 13시까지입니다.',
        '약': '약 처방은 진료 후 수납창구에서 발급받을 수 있습니다.',
        '화장실': '각 층 엘리베이터 옆에 화장실이 있습니다.'
      };
      
      // 간단한 키워드 매칭
      let botResponse = '죄송합니다, 해당 질문에 대한 답변을 찾을 수 없습니다. 다른 질문을 해주세요.';
      
      for (const [keyword, response] of Object.entries(botResponses)) {
        if (input.includes(keyword)) {
          botResponse = response;
          break;
        }
      }
      
      // 타이핑 효과를 위한 지연
      setTimeout(() => {
        const botMessage = {
          type: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('챗봇 응답 오류:', error);
      
      setTimeout(() => {
        const errorMessage = {
          type: 'bot',
          text: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 1000);
    }
  };
  
  const handleVoiceInput = () => {
    // 음성 인식 기능 (WebSpeech API 사용 예정)
    alert('음성 인식 기능은 준비 중입니다.');
  };
  
  return (
    <div className="chatbot-container">
      <button 
        className={`chatbot-button ${isOpen ? 'active' : ''}`}
        onClick={toggleChatbot}
      >
        {isOpen ? '✕' : '💬'}
      </button>
      
      {isOpen && (
        <div className="chatbot-dialog">
          <div className="chatbot-header">
            <h3>AI 도우미</h3>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.type}`}
              >
                <div className="message-content">{msg.text}</div>
                <div className="message-time">{msg.time}</div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="질문을 입력하세요..."
              disabled={isTyping}
            />
            <button 
              type="button" 
              className="voice-button"
              onClick={handleVoiceInput}
            >
              🎤
            </button>
            <button 
              type="submit" 
              className="send-button"
              disabled={isTyping || !input.trim()}
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotButton;