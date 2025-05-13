import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NFCReader from '../NFCReader';
import '../../styles/Layout.css';

const Layout = () => {
  const nfcSupported = 'NDEFReader' in window;
  
  return (
    <div className="app-container">
      <Header />
      
      <main className="app-content">
        <Outlet />
      </main>
      
      <Footer />
      
      {nfcSupported && <NFCReader />}
    </div>
  );
};

export default Layout;