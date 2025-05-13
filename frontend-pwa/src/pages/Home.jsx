import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NFCStatus from '../components/NFCStatus';
import ExamCard from '../components/ExamCard';
import ChatbotButton from '../components/ChatbotButton';
import { useAuth } from '../context/AuthContext';
import PageTitle from '../components/common/PageTitle';
import '../styles/Home.css';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [todayExams, setTodayExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '검사 안내 - 서울 대학 병원';
    
    if (isAuthenticated) {
      // 사용자 검사 정보 가져오기
      fetchUserExams();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  const fetchUserExams = async () => {
    try {
      setLoading(true);
      // API 호출 예시 (실제 구현 시 서버 엔드포인트로 변경)
      // const response = await fetch(`/api/v1/exams/today`);
      // const data = await response.json();
      
      // 임시 데이터
      const mockData = [
        {
          id: 1,
          title: 'X-ray 검사',
          location: '본관 3층 영상의학과',
          time: '10:30',
          preparation: '금속류 제거 필수',
          nextExam: 2
        },
        {
          id: 2,
          title: '혈액 검사',
          location: '별관 1층 검사실',
          time: '11:00',
          preparation: '8시간 금식 필요',
          nextExam: null
        }
      ];
      
      setTodayExams(mockData);
      setLoading(false);
    } catch (err) {
      setError('검사 정보를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };
  
  return (
    <div className="page-container">
      <PageTitle title="오늘의 검사" />
      
      <div className="section-container welcome-section">
        <h2 className="welcome-heading">{user?.name || '환자'}님, 안녕하세요</h2>
        <p className="welcome-text">오늘 예약된 검사를 확인하세요</p>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>검사 정보를 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={fetchUserExams}>
            다시 시도
          </button>
        </div>
      ) : todayExams.length > 0 ? (
        <div className="section-container exams-section">
          {todayExams.map(exam => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className="section-container no-exams">
          <p>오늘 예약된 검사가 없습니다.</p>
        </div>
      )}
      
      <div className="section-container help-section">
        <h3>도움이 필요하세요?</h3>
        <p>질문이 있으시면 AI 도우미에게 물어보세요!</p>
        <ChatbotButton />
      </div>
    </div>
  );
};

export default Home;