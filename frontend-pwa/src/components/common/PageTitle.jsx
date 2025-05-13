import { useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../styles/PageTitle.css';

const PageTitle = ({ title }) => {
  useEffect(() => {
    // 페이지 제목 업데이트
    document.title = `${title} - 서울 대학 병원`;
  }, [title]);

  return (
    <div className="page-title">
      <h1>{title}</h1>
    </div>
  );
};

PageTitle.propTypes = {
  title: PropTypes.string.isRequired
};

export default PageTitle;