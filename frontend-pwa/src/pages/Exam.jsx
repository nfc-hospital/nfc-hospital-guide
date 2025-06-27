import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WaitingInfo from '../components/WaitingInfo';
import ExamPreparation from '../components/ExamPreparation';
import MapNavigator from '../components/MapNavigator';
import ChatbotButton from '../components/ChatbotButton';
import { useAuth } from '../context/AuthContext';
import PageTitle from '../components/common/PageTitle';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [waitingInfo, setWaitingInfo] = useState({ position: 0, etaMin: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examCompleted, setExamCompleted] = useState(false);
  
  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '검사 상세 - 서울 대학 병원';
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // 검사 정보 가져오기
    fetchExamDetails();
    
    // 대기 정보 실시간 업데이트를 위한 인터벌 설정
    const waitingInterval = setInterval(fetchWaitingInfo, 30000);
    
    return () => {
      clearInterval(waitingInterval);
    };
  }, [examId, isAuthenticated, navigate]);
  
  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      // TODO: API 호출로 변경
      // const response = await fetch(`/api/v1/exams/${examId}`);
      // const data = await response.json();
      
      // 임시 데이터
      const mockData = {
        id: examId,
        title: 'X-ray 검사',
        description: '흉부 X-ray 촬영',
        location: {
          building: '본관',
          floor: 3,
          department: '영상의학과',
          roomNumber: '304'
        },
        preparation: [
          '금속류 제거 필수',
          '촬영 전 탈의 필요',
          '임산부는 사전 고지 필수'
        ],
        estimatedDuration: 15,
        currentWaitingCount: 3,
        mapId: 'main-3f'
      };
      
      setExam(mockData);
      document.title = `${mockData.title} - 서울 대학 병원`;
      fetchWaitingInfo();
    } catch (err) {
      setError('검사 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWaitingInfo = async () => {
    try {
      // 임시 데이터
      const mockWaitingInfo = {
        position: Math.floor(Math.random() * 5),
        etaMin: Math.floor(Math.random() * 30)
      };
      
      setWaitingInfo(mockWaitingInfo);
    } catch (err) {
      console.error('대기 정보를 가져오는데 실패했습니다:', err);
    }
  };
  
  const handleExamComplete = async () => {
    try {
      setExamCompleted(true);
      
      // 3초 후 홈으로 이동
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      alert('검사 완료 처리에 실패했습니다. 다시 시도해주세요.');
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!exam) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <PageTitle title={exam.title} />
          
          {examCompleted ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-5xl text-green-500 mb-4">✓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">검사가 완료되었습니다!</h2>
              <p className="text-gray-600 mb-4">
                잠시 후 메인 화면으로 이동합니다...
              </p>
            </div>
          ) : (
            <>
              {/* 검사 정보 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{exam.title}</h2>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                    진행 예정
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{exam.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">위치</p>
                    <p className="text-base font-medium text-gray-900">
                      {exam.location.building} {exam.location.floor}층<br />
                      {exam.location.department} {exam.location.roomNumber}호
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">예상 소요시간</p>
                    <p className="text-base font-medium text-gray-900">{exam.estimatedDuration}분</p>
                  </div>
                </div>
              </div>

              {/* 검사 준비사항 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">검사 준비사항</h3>
                <ul className="space-y-2">
                  {exam.preparation.map((prep, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-primary-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-gray-700">{prep}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 대기 현황 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 대기 현황</h3>
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary-600">{exam.currentWaitingCount}명</p>
                    <p className="text-sm text-gray-500">대기 중</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary-600">{waitingInfo.etaMin}분</p>
                    <p className="text-sm text-gray-500">예상 대기시간</p>
                  </div>
                </div>
              </div>

              {/* 길찾기 지도 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">위치 안내</h3>
                  <MapNavigator mapId={exam.mapId} location={exam.location} />
                </div>
              </div>

              {/* 검사 완료 버튼 */}
              <button
                onClick={handleExamComplete}
                className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                검사 완료
              </button>
            </>
          )}

          {/* 챗봇 버튼 */}
          <div className="fixed bottom-6 right-6">
            <ChatbotButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exam;