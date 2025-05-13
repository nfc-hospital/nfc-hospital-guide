import { useParams } from 'react-router-dom';

function Exam() {
  const { examId } = useParams();

  return (
    <div style={{ padding: '2rem' }}>
      <h2>검사 정보</h2>
      <p>검사 ID: {examId}</p>
      <p>💡 이 페이지는 실제 병원 검사 데이터와 연결될 예정입니다.</p>
    </div>
  );
}

export default Exam;
