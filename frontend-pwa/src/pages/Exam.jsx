import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WaitingInfo from '../components/WaitingInfo';
import ExamPreparation from '../components/ExamPreparation';
import MapNavigator from '../components/MapNavigator';
import ChatbotButton from '../components/ChatbotButton';
import { useAuth } from '../context/AuthContext';
import PageTitle from '../components/common/PageTitle';
import '../styles/Exam.css';

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
      navigate('/');
      return;
    }
    
    // 검사 정보 가져오기
    fetchExamDetails();
    
    // 대기 정보 실시간 업데이트를 위한 인터벌 설정
    const waitingInterval = setInterval(fetchWaitingInfo, 30000);
    
    return () => {
      clearInterval(waitingInterval);
    };
  }, [examId, isAuthenticated]);
  
  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      // API 호출 예시 (실제 구현 시 서버 엔드포인트로 변경)
      // const response = await fetch(`/api/v1/exams/${examId}`);
      // const data = await response.json();
      
      // 임시 데이터
      const mockExam = {
        id: parseInt(examId),
        title: parseInt(examId) === 1 ? 'X-ray 검사' : '혈액 검사',
        location: parseInt(examId) === 1 ? '본관 3층 영상의학과' : '별관 1층 검사실',
        time: parseInt(examId) === 1 ? '10:30' : '11:00',
        preparation: parseInt(examId) === 1 ? '금속류 제거 필수' : '8시간 금식 필요',
        description: parseInt(examId) === 1 
          ? '흉부 X-ray를 촬영합니다. 상의를 탈의하셔야 합니다.' 
          : '일반 혈액 검사로, 채혈 후 5분 정도 지혈이 필요합니다.',
        nextExam: parseInt(examId) === 1 ? 2 : null
      };
      
      setExam(mockExam);
      document.title = `${mockExam.title} - 서울 대학 병원`;
      fetchWaitingInfo();
    } catch (err) {
      setError('검사 정보를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };
  
  const fetchWaitingInfo = async () => {
    try {
      // API 호출 예시 (실제 구현 시 서버 엔드포인트로 변경)
      // const response = await fetch(`/api/v1/queues/${examId}`);
      // const data = await response.json();
      
      // 임시 데이터
      const mockWaitingInfo = {
        position: Math.floor(Math.random() * 5),
        etaMin: Math.floor(Math.random() * 30)
      };
      
      setWaitingInfo(mockWaitingInfo);
      setLoading(false);
    } catch (err) {
      console.error('대기 정보를 가져오는데 실패했습니다:', err);
      // 실패해도 UI를 완전히 차단하지 않도록 로딩 상태 변경
      if (loading) setLoading(false);
    }
  };
  
  const handleExamComplete = async () => {
    try {
      // API 호출 예시 (실제 구현 시 서버 엔드포인트로 변경)
      // await fetch(`/api/v1/queues/${examId}`, { 
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ state: 'done' })
      // });
      
      setExamCompleted(true);
      
      // 다음 검사가 있으면 3초 후 자동 이동
      if (exam.nextExam) {
        setTimeout(() => {
          navigate(`/exam/${exam.nextExam}`);
        }, 3000);
      }
    } catch (err) {
      alert('검사 완료 처리에 실패했습니다. 다시 시도해주세요.');
    }
  };
  
  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>검사 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h2>오류가 발생했습니다</h2>
          <p>{error}</p>
          <button className="primary-button" onClick={() => navigate('/')}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }
  
  if (!exam) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h2>검사 정보를 찾을 수 없습니다</h2>
          <button className="primary-button" onClick={() => navigate('/')}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <PageTitle title={exam.title} />
      
      {examCompleted ? (
        <div className="section-container exam-completed">
          <div className="success-icon">✓</div>
          <h2>검사가 완료되었습니다!</h2>
          {exam.nextExam ? (
            <p>다음 검사실로 이동합니다...</p>
          ) : (
            <p>모든 검사가 완료되었습니다. 수납 창구로 이동해주세요.</p>
          )}
          <button 
            className="primary-button"
            onClick={() => navigate('/')}
          >
            목록으로 돌아가기
          </button>
        </div>
      ) : (
        <>
          <div className="section-container exam-info">
            <div className="exam-schedule">
              <p className="exam-time">예약시간: {exam.time}</p>
              <p className="exam-location">위치: {exam.location}</p>
            </div>
          </div>
          
          <WaitingInfo 
            position={waitingInfo.position} 
            etaMin={waitingInfo.etaMin} 
          />
          
          <ExamPreparation 
            preparation={exam.preparation} 
            description={exam.description} 
          />
          
          <MapNavigator location={exam.location} />
          
          <div className="section-container action-section">
            <button 
              className="complete-button"
              onClick={handleExamComplete}
            >
              검사 완료
            </button>
          </div>
          
          <ChatbotButton />
        </>
      )}
    </div>
  );
};

export default Exam;