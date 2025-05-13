import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NFCStatus from '../NFCStatus';
import '../../styles/Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          서울 대학 병원
        </Link>
      </div>
      
      <div className="header-center">
        {isAuthenticated && (
          <h1 className="current-page-title">
            {/* 현재 페이지 타이틀은 페이지 컴포넌트에서 설정 */}
            {document.title.replace(' - 서울 대학 병원', '')}
          </h1>
        )}
      </div>
      
      <div className="header-right">
        <NFCStatus />
        
        {isAuthenticated ? (
          <div className="user-menu">
            <span className="user-name">{user?.name || '환자'}</span>
            <button className="logout-button" onClick={logout}>
              로그아웃
            </button>
          </div>
        ) : (
          <Link to="/login" className="login-button">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;