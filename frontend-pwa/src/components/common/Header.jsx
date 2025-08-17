import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// import NFCStatus from '../NFCStatus'; // NFC 상태 표시 비활성화

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="h-8 w-auto"
            />
            <span className="text-xl font-semibold text-gray-900">
              NFC 병원 안내
            </span>
          </Link>

          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 관리자 메뉴 - 권한에 따라 표시 */}
                {(user.role === 'super_admin' || user.role === 'dept_admin' || user.role === 'staff') && (
                  <div className="relative group">
                    <button className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                      <span>관리자</span>
                      <span className="text-xs">▼</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 대시보드
                      </Link>
                      {(user.role === 'super_admin' || user.role === 'dept_admin') && (
                        <>
                          <Link
                            to="/dashboard/nfc-tags"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            🏷️ 태그 관리
                          </Link>
                          <Link
                            to="/dashboard/analytics"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            📈 통계 분석
                          </Link>
                        </>
                      )}
                      <Link
                        to="/dashboard/queue"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ⏱️ 대기열 모니터링
                      </Link>
                    </div>
                  </div>
                )}
                
                <span className="text-sm text-gray-600">
                  {user.name || user.phoneNumber}님
                </span>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}