import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NFCReader from '../components/NFCReader';
import NFCStatus from '../components/NFCStatus';
import WaitingInfo from '../components/WaitingInfo';
import ChatbotButton from '../components/ChatbotButton';
import PageTitle from '../components/common/PageTitle';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [tagScanned, setTagScanned] = useState(true); // 태그 인식 상태 (테스트를 위해 true로 설정)
  const [examInfo, setExamInfo] = useState({
    title: 'X-ray 검사',
    department: '영상의학과',
    roomNumber: '304호',
    floor: '3층',
    waitingCount: 3,
    estimatedTime: 15
  });

  useEffect(() => {
    // NFC 지원 여부 확인
    if ('NDEFReader' in window) {
      setIsNFCSupported(true);
    }
  }, []);

  // 테스트용 검사 페이지 목록
  const testExams = [
    { id: 1, name: 'X-ray 검사' },
    { id: 2, name: 'CT 검사' },
    { id: 3, name: 'MRI 검사' },
    { id: 4, name: '초음파 검사' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 테스트용 네비게이션 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 테스트 네비게이션</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">페이지 이동</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    홈
                  </button>
                  <button
                    onClick={() => navigate('/404')}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    404
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">검사 페이지</h3>
                <div className="flex flex-wrap gap-2">
                  {testExams.map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
                    >
                      {exam.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <PageTitle title="오늘의 검사" />
          
          {/* 환영 메시지 */}
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              안녕하세요, {user?.name || '홍길동'}님
            </h1>
            <p className="text-gray-600">
              {tagScanned 
                ? '검사실 위치를 확인해주세요'
                : 'NFC 태그를 스캔하여 검사실을 찾아보세요'}
            </p>
          </div>

          {/* NFC 상태 및 검사 정보 */}
          {!tagScanned ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <NFCStatus isSupported={isNFCSupported} />
              {isNFCSupported && <NFCReader onTagScanned={() => setTagScanned(true)} />}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 검사 정보 카드 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{examInfo.title}</h2>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                    진행 예정
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">진료과</p>
                    <p className="text-base font-medium text-gray-900">{examInfo.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">검사실</p>
                    <p className="text-base font-medium text-gray-900">{examInfo.roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">위치</p>
                    <p className="text-base font-medium text-gray-900">본관 {examInfo.floor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">예상 소요시간</p>
                    <p className="text-base font-medium text-gray-900">{examInfo.estimatedTime}분</p>
                  </div>
                </div>
              </div>

              {/* 대기 현황 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 대기 현황</h3>
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary-600">{examInfo.waitingCount}명</p>
                    <p className="text-sm text-gray-500">대기 중</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary-600">{examInfo.waitingCount * 5}분</p>
                    <p className="text-sm text-gray-500">예상 대기시간</p>
                  </div>
                </div>
              </div>

              {/* 길찾기 버튼 */}
              <button className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                길찾기 시작하기
              </button>
            </div>
          )}

          {/* 챗봇 버튼 */}
          <div className="fixed bottom-6 right-6">
            <ChatbotButton />
          </div>
        </div>
      </div>
    </div>
  );
}