import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NFCStatus from '../components/NFCStatus';
import NFCReader from '../components/NFCReader';
import ChatbotButton from '../components/ChatbotButton';

const Home = () => {
  const navigate = useNavigate();
  const [tagScanned, setTagScanned] = useState(false);
  const isNFCSupported = 'NDEFReader' in window;

  const examInfo = {
    title: 'X-ray 검사',
    department: '영상의학과',
    roomNumber: '304호',
    floor: '3층',
    estimatedTime: 10,
    waitingCount: 3
  };

  const testExams = [
    { id: 1, name: '심전도 검사' },
    { id: 2, name: 'X-ray 검사' },
    { id: 3, name: '혈액 검사' },
    { id: 4, name: '소변 검사' }
  ];

  return (
    <div className="mobile-container">
      {/* 간단한 테스트 네비게이션 유지 */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3">🔧 테스트</h2>
        <div className="grid grid-cols-2 gap-2">
          {testExams.map(exam => (
            <button
              key={exam.id}
              onClick={() => navigate(`/exam/${exam.id}`)}
              className="bg-primary-blue-light hover:bg-blue-100 text-primary-blue py-3 px-4 rounded-xl text-lg font-medium"
            >
              {exam.name}
            </button>
          ))}
        </div>
      </div>

      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-primary-blue to-primary-blue-dark rounded-2xl text-white p-6 text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">
          안녕하세요, 김환자님! 👋
        </h1>
        <p className="text-blue-100 text-lg">
          {tagScanned 
            ? '검사실 위치를 확인해주세요'
            : 'NFC 태그를 스캔하여 시작하세요'}
        </p>
      </div>

      {/* NFC 상태 또는 검사 정보 */}
      {!tagScanned ? (
        <div className="card">
          <NFCStatus isSupported={isNFCSupported} />
          {isNFCSupported && <NFCReader onTagScanned={() => setTagScanned(true)} />}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 검사 정보 카드 */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-text-primary">{examInfo.title}</h2>
              <div className="bg-primary-blue-light text-primary-blue px-4 py-2 rounded-full text-lg font-semibold">
                진행 예정
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-text-secondary mb-1">진료과</p>
                <p className="text-lg font-semibold text-text-primary">{examInfo.department}</p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">검사실</p>
                <p className="text-lg font-semibold text-text-primary">{examInfo.roomNumber}</p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">위치</p>
                <p className="text-lg font-semibold text-text-primary">본관 {examInfo.floor}</p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">소요시간</p>
                <p className="text-lg font-semibold text-text-primary">{examInfo.estimatedTime}분</p>
              </div>
            </div>
          </div>

          {/* 대기 현황 */}
          <div className="card">
            <h3 className="text-xl font-bold text-text-primary mb-4 text-center">현재 대기 현황</h3>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-primary-blue mb-1">{examInfo.waitingCount}</div>
                <p className="text-text-secondary text-lg">명 대기 중</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-blue mb-1">{examInfo.waitingCount * 5}</div>
                <p className="text-text-secondary text-lg">분 예상</p>
              </div>
            </div>
          </div>

          {/* 길찾기 버튼 */}
          <button className="btn btn-primary w-full">
            <span className="text-2xl">🧭</span>
            길찾기 시작하기
          </button>
        </div>
      )}

      {/* 챗봇 버튼 */}
      <div className="fixed bottom-6 right-6">
        <ChatbotButton />
      </div>
    </div>
  );
};

export default Home;