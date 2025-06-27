import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NFCStatus from '../NFCStatus';

export default function Layout() {
  const nfcSupported = 'NDEFReader' in window;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NFCStatus />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      
      {nfcSupported && <NFCReader />}
    </div>
  );
}