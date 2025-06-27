import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NFCStatus from '../NFCStatus';

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
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </button>
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