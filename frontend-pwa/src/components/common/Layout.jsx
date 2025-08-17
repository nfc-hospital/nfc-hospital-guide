import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
// import NFCStatus from '../NFCStatus'; // NFC 상태 표시 비활성화

export default function Layout() {
  const nfcSupported = 'NDEFReader' in window;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* <NFCStatus /> */}  {/* NFC 사용 불가 메시지 비활성화 */}
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      
      {/* {nfcSupported && <NFCReader />} */}
    </div>
  );
}