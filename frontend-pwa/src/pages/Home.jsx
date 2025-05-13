import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const simulateNFCTag = () => {
    navigate('/exams/xray-001');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>병원 검사 안내 시스템</h1>
      <p>NFC 태그를 스캔하면 검사 정보를 확인할 수 있습니다.</p>
      <button onClick={simulateNFCTag}>NFC 태그 시뮬레이션</button>
    </div>
  );
}

export default Home;
