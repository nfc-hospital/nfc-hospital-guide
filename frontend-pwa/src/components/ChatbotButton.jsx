import { useState } from 'react';

export default function ChatbotButton() {
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
  
  const toggleChat = () => {
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
    <>
      {/* 챗봇 버튼 */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              AI 도우미
            </h3>
          </div>
          
          <div className="h-96 p-4 overflow-y-auto">
            {/* 챗봇 메시지들 */}
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex justify-${msg.type === 'user' ? 'end' : 'start'}`}
                >
                  <div className={`bg-${msg.type === 'user' ? 'primary' : 'gray'}-100 rounded-lg px-4 py-2 max-w-xs`}>
                    <p className="text-sm text-gray-900">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-xs">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <form className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                disabled={isTyping}
              />
              <button
                type="button"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={handleVoiceInput}
              >
                🎤
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isTyping || !input.trim()}
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}