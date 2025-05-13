import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => {
  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '페이지를 찾을 수 없음 - 서울 대학 병원';
  }, []);
  
  return (
    <div className="page-container">
      <div className="section-container not-found-content">
        <h1>404</h1>
        <h2>페이지를 찾을 수 없습니다</h2>
        <p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <Link to="/" className="home-button">
          메인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default NotFound;