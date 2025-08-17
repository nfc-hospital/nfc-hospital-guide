import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import apiService from '../api/apiService';
import PageTitle from '../components/common/PageTitle';
import LoadingSpinner from '../components/common/LoadingSpinner';

const MyExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' or 'past'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchExams();
  }, [filter, currentPage]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/exams/my-list/', {
        params: {
          is_past: filter === 'past' ? 'true' : 'false',
          page: currentPage,
          page_size: 10
        }
      });

      if (response.data.results) {
        setExams(response.data.results);
        setTotalPages(Math.ceil(response.data.count / 10));
      } else {
        setExams(response.data);
      }
    } catch (err) {
      console.error('검사 목록 조회 실패:', err);
      setError('검사 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `오늘 ${date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'waiting': { text: '대기중', className: 'bg-amber-100 text-amber-800' },
      'ongoing': { text: '진행중', className: 'bg-blue-100 text-blue-800' },
      'done': { text: '완료', className: 'bg-green-100 text-green-800' },
      'delayed': { text: '지연', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const handleExamClick = (exam) => {
    if (exam.has_result && exam.status === 'done') {
      // 검사 결과는 병원 시스템에서 확인하도록 안내
      alert('검사 결과는 병원 진료 시스템에서 확인하실 수 있습니다.\n\n원내 키오스크 또는 모바일 병원 앱을 이용해주세요.');
    } else if (exam.status === 'waiting' || exam.status === 'ongoing') {
      // 대기 화면으로 이동
      navigate(`/exam/${exam.exam_info.exam_id}`);
    } else {
      // 기타 상태는 상세 정보만 보여줌
      alert(`검사 상태: ${exam.status}\n\n검사가 완료되면 병원 시스템에서 결과를 확인하실 수 있습니다.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <PageTitle title="내 검사 목록" />
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-xl text-red-800 font-medium">{error}</p>
            <button
              onClick={fetchExams}
              className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="내 검사 목록" />
      
      {/* 필터 탭 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => {
                setFilter('upcoming');
                setCurrentPage(1);
              }}
              className={`flex-1 py-4 text-lg font-medium border-b-2 transition-colors ${
                filter === 'upcoming'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              예정된 검사
            </button>
            <button
              onClick={() => {
                setFilter('past');
                setCurrentPage(1);
              }}
              className={`flex-1 py-4 text-lg font-medium border-b-2 transition-colors ${
                filter === 'past'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              지난 검사
            </button>
          </div>
        </div>
      </div>

      {/* 검사 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {exams.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500">
              {filter === 'upcoming' ? '예정된 검사가 없습니다.' : '지난 검사 기록이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div
                key={exam.appointment_id}
                onClick={() => handleExamClick(exam)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {exam.exam_info.title}
                      </h3>
                      {getStatusBadge(exam.status)}
                    </div>
                    
                    <div className="space-y-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        <span className="text-lg">{formatDate(exam.scheduled_at)}</span>
                      </div>
                      
                      {exam.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          <span className="text-lg">
                            {exam.location.building} {exam.location.floor} {exam.location.room}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-lg">예상 소요시간: {exam.exam_info.average_duration}분</span>
                      </div>
                    </div>
                    
                    {exam.has_result && exam.status === 'done' && (
                      <div className="mt-3 flex items-center gap-2 text-green-600">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">검사 완료 - 병원 시스템에서 결과 확인</span>
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight className="w-6 h-6 text-gray-400 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyExams;