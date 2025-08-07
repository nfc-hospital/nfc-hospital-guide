import { useState, useEffect } from 'react';
import ChatbotSystem from '../components/chatbot-v2';

const ChatbotTest = () => {
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [elderlyMode, setElderlyMode] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);

  // 테스트용 위치 데이터
  const testLocations = [
    {
      name: 'CT실',
      building: '본관',
      floor: '3',
      room: '304호',
      landmarks: ['엘리베이터', '안내데스크'],
      accessibility: ['휠체어 접근 가능', '시각장애인 안내'],
      openHours: '09:00 - 17:00',
      phone: '02-1234-5678',
      mapImage: '/images/maps/ct-room.jpg'
    },
    {
      name: 'MRI실',
      building: '본관',
      floor: '2',
      room: '205호',
      landmarks: ['중앙홀', '카페'],
      accessibility: ['휠체어 접근 가능'],
      openHours: '08:00 - 18:00',
      phone: '02-1234-5679'
    },
    {
      name: '내과',
      building: '본관',
      floor: '1',
      room: '101호',
      landmarks: ['메인 로비'],
      accessibility: ['휠체어 접근 가능', '보조견 동반 가능'],
      openHours: '09:00 - 16:00',
      phone: '02-1234-5680'
    }
  ];

  // 테스트용 대기 상태 데이터
  const testQueueStatuses = [
    {
      queueNumber: 15,
      beforeMe: 3,
      estimatedWaitTime: 20,
      location: 'CT실 대기실',
      status: 'waiting'
    },
    {
      queueNumber: 22,
      beforeMe: 0,
      estimatedWaitTime: 0,
      location: 'MRI실',
      status: 'called'
    },
    {
      queueNumber: 8,
      beforeMe: 1,
      estimatedWaitTime: 5,
      location: '내과 진료실',
      status: 'urgent'
    }
  ];

  // 새 메시지 알림 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      if (!chatbotOpen && Math.random() > 0.8) {
        setHasNewMessage(true);
        setTimeout(() => setHasNewMessage(false), 3000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [chatbotOpen]);

  const handleChatbotToggle = (open) => {
    setChatbotOpen(open);
    if (open) {
      setHasNewMessage(false);
    }
  };

  const handleLocationChange = (location) => {
    setCurrentLocation(location);
  };

  const handleQueueChange = (queue) => {
    setQueueStatus(queue);
  };

  const resetData = () => {
    setCurrentLocation(null);
    setQueueStatus(null);
    setChatbotOpen(false);
  };

  return (
    <div className="chatbot-test-page">
      {/* 테스트 컨트롤 패널 */}
      <div className="test-control-panel">
        <h1>챗봇 컴포넌트 테스트</h1>
        
        <div className="control-section">
          <h3>기본 설정</h3>
          <div className="control-group">
            <label className="control-item">
              <input
                type="checkbox"
                checked={elderlyMode}
                onChange={(e) => setElderlyMode(e.target.checked)}
              />
              <span>고령자 모드</span>
            </label>
            
            <label className="control-item">
              <input
                type="checkbox"
                checked={chatbotOpen}
                onChange={(e) => setChatbotOpen(e.target.checked)}
              />
              <span>챗봇 열기</span>
            </label>

            <button 
              className="test-btn"
              onClick={() => setHasNewMessage(!hasNewMessage)}
            >
              새 메시지 알림 {hasNewMessage ? '끄기' : '켜기'}
            </button>

            <button className="test-btn secondary" onClick={resetData}>
              데이터 초기화
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>위치 정보 테스트</h3>
          <div className="control-group">
            <select 
              onChange={(e) => {
                const selectedLocation = testLocations[parseInt(e.target.value)];
                handleLocationChange(selectedLocation);
              }}
              value={currentLocation ? testLocations.findIndex(loc => loc.name === currentLocation.name) : ''}
            >
              <option value="">위치 선택 안함</option>
              {testLocations.map((location, index) => (
                <option key={index} value={index}>
                  {location.name} ({location.building} {location.floor}층)
                </option>
              ))}
            </select>
          </div>
          
          {currentLocation && (
            <div className="current-data">
              <h4>현재 위치: {currentLocation.name}</h4>
              <p>{currentLocation.building} {currentLocation.floor}층 {currentLocation.room}</p>
            </div>
          )}
        </div>

        <div className="control-section">
          <h3>대기 상태 테스트</h3>
          <div className="control-group">
            <select 
              onChange={(e) => {
                const selectedQueue = testQueueStatuses[parseInt(e.target.value)];
                handleQueueChange(selectedQueue);
              }}
              value={queueStatus ? testQueueStatuses.findIndex(q => q.queueNumber === queueStatus.queueNumber) : ''}
            >
              <option value="">대기 상태 없음</option>
              {testQueueStatuses.map((queue, index) => (
                <option key={index} value={index}>
                  {queue.queueNumber}번 - {queue.status === 'waiting' ? '대기 중' : 
                   queue.status === 'called' ? '호출됨' : '긴급'}
                </option>
              ))}
            </select>
          </div>

          {queueStatus && (
            <div className="current-data">
              <h4>현재 대기: {queueStatus.queueNumber}번</h4>
              <p>앞 대기: {queueStatus.beforeMe}명, 예상시간: {queueStatus.estimatedWaitTime}분</p>
              <p>상태: {queueStatus.status}</p>
            </div>
          )}
        </div>

        <div className="control-section">
          <h3>테스트 시나리오</h3>
          <div className="scenario-buttons">
            <button 
              className="scenario-btn"
              onClick={() => {
                handleLocationChange(testLocations[0]);
                handleQueueChange(testQueueStatuses[0]);
                setChatbotOpen(true);
              }}
            >
              시나리오 1: CT 검사 대기
            </button>
            
            <button 
              className="scenario-btn"
              onClick={() => {
                handleLocationChange(testLocations[1]);
                handleQueueChange(testQueueStatuses[1]);
                setChatbotOpen(true);
                setHasNewMessage(true);
              }}
            >
              시나리오 2: MRI 검사 호출됨
            </button>
            
            <button 
              className="scenario-btn"
              onClick={() => {
                handleLocationChange(testLocations[2]);
                handleQueueChange(testQueueStatuses[2]);
                setElderlyMode(true);
                setChatbotOpen(true);
              }}
            >
              시나리오 3: 고령자 긴급 상황
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>테스트 가이드</h3>
          <div className="test-guide">
            <h4>테스트할 수 있는 기능:</h4>
            <ul>
              <li>✅ 플로팅 버튼 (일반/고령자 모드)</li>
              <li>✅ 팝업 챗봇 (드래그, 최소화, 전체화면)</li>
              <li>✅ 고령자 전용 UI (큰 글씨, 음성, 고대비)</li>
              <li>✅ 메시지 타입별 렌더링</li>
              <li>✅ 위치 기반 컨텍스트</li>
              <li>✅ 대기 상태 표시</li>
              <li>✅ 음성 입력/출력</li>
              <li>✅ 빠른 답변 버튼</li>
              <li>✅ 반응형 디자인</li>
            </ul>
            
            <h4>테스트 질문 예시:</h4>
            <ul>
              <li>"어디로 가야 하나요?"</li>
              <li>"얼마나 기다려야 하나요?"</li>
              <li>"뭘 준비해야 하나요?"</li>
              <li>"약은 어디서 받나요?"</li>
              <li>"화장실은 어디인가요?"</li>
              <li>"응급상황입니다"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="main-content">
        <h2>병원 안내 시스템</h2>
        <p>우측 하단의 챗봇 버튼을 클릭하여 AI 도우미와 대화해보세요.</p>
        
        <div className="content-cards">
          <div className="content-card">
            <h3>검사 안내</h3>
            <p>CT, MRI, 초음파 등 각종 검사 정보를 확인하세요.</p>
          </div>
          
          <div className="content-card">
            <h3>진료과 안내</h3>
            <p>내과, 외과, 정형외과 등 진료과별 위치를 찾아보세요.</p>
          </div>
          
          <div className="content-card">
            <h3>편의시설</h3>
            <p>약국, 카페, 화장실 등 편의시설 위치를 안내합니다.</p>
          </div>
        </div>
      </div>

      {/* 새로운 챗봇 시스템 */}
      <ChatbotSystem elderlyMode={elderlyMode} />

      <style jsx>{`
        .chatbot-test-page {
          min-height: 100vh;
          background: #f5f7fa;
          display: flex;
        }

        .test-control-panel {
          width: 400px;
          background: white;
          border-right: 1px solid #e0e0e0;
          padding: 20px;
          overflow-y: auto;
          height: 100vh;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .test-control-panel h1 {
          margin-top: 0;
          color: #333;
          font-size: 24px;
          margin-bottom: 30px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }

        .control-section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }

        .control-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #495057;
          font-size: 18px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #495057;
        }

        .control-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .test-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .test-btn:hover {
          background: #5a6fd8;
        }

        .test-btn.secondary {
          background: #6c757d;
        }

        .test-btn.secondary:hover {
          background: #5a6268;
        }

        select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
          background: white;
        }

        .current-data {
          margin-top: 12px;
          padding: 12px;
          background: #e3f2fd;
          border-radius: 6px;
          border-left: 4px solid #2196f3;
        }

        .current-data h4 {
          margin: 0 0 8px 0;
          color: #1565c0;
          font-size: 14px;
        }

        .current-data p {
          margin: 4px 0;
          font-size: 13px;
          color: #1976d2;
        }

        .scenario-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scenario-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          transition: background 0.2s ease;
        }

        .scenario-btn:hover {
          background: #218838;
        }

        .test-guide {
          font-size: 13px;
          line-height: 1.5;
        }

        .test-guide h4 {
          margin: 16px 0 8px 0;
          color: #495057;
          font-size: 14px;
        }

        .test-guide ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .test-guide li {
          margin-bottom: 4px;
          color: #6c757d;
        }

        .main-content {
          flex: 1;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }

        .main-content h2 {
          color: #333;
          font-size: 32px;
          margin-bottom: 16px;
        }

        .main-content p {
          color: #666;
          font-size: 18px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .content-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-top: 40px;
        }

        .content-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid #e9ecef;
        }

        .content-card h3 {
          color: #333;
          font-size: 20px;
          margin-bottom: 12px;
        }

        .content-card p {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        }

        @media (max-width: 768px) {
          .chatbot-test-page {
            flex-direction: column;
          }

          .test-control-panel {
            width: 100%;
            height: auto;
            max-height: 300px;
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .main-content {
            padding: 20px;
          }

          .content-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatbotTest;