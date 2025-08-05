import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const NFCTagManagement = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    is_active: 'true',
    location: '',
    search: ''
  });

  useEffect(() => {
    loadTags();
  }, [currentPage, filters]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };
      
      const response = await adminAPI.nfc.getAllTags(params);
      if (response.success) {
        setTags(response.data?.items || []);
        setTotalPages(response.data?.pagination?.totalPages || 1);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Tags loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (tagData) => {
    try {
      await adminAPI.nfc.createTag(tagData);
      setShowCreateModal(false);
      loadTags();
    } catch (err) {
      console.error('Tag creation error:', err);
      alert('태그 생성 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleToggleTag = async (tag) => {
    const action = tag.is_active ? '비활성화' : '활성화';
    if (!confirm(`이 태그를 ${action}하시겠습니까?`)) return;
    
    try {
      if (tag.is_active) {
        await adminAPI.nfc.deleteTag(tag.tag_id);
      } else {
        // 활성화를 위해 벌크 작업 사용
        await adminAPI.nfc.bulkOperation({
          operation: 'activate',
          tag_ids: [tag.tag_id]
        });
      }
      loadTags();
    } catch (err) {
      console.error('Tag toggle error:', err);
      alert(`태그 ${action} 중 오류가 발생했습니다: ` + err.message);
    }
  };

  const handleBulkOperation = async (operation) => {
    if (selectedTags.length === 0) {
      alert('선택된 태그가 없습니다.');
      return;
    }

    try {
      await adminAPI.nfc.bulkOperation({
        operation,
        tag_ids: selectedTags
      });
      setSelectedTags([]);
      setShowBulkModal(false);
      loadTags();
    } catch (err) {
      console.error('Bulk operation error:', err);
      alert('일괄 작업 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleSelectTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTags.length === tags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(tags.map(tag => tag.tag_id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">NFC 태그 관리</h1>
        <p className="text-gray-600 mt-1">병원 내 NFC 태그 등록, 수정, 모니터링</p>
      </div>

      {/* 필터 및 액션 버튼 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          {/* 필터 */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({...filters, is_active: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">활성 태그</option>
              <option value="false">비활성 태그</option>
              <option value="">전체</option>
            </select>
            
            <input
              type="text"
              placeholder="태그 코드 또는 위치 검색"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              새 태그 등록
            </button>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                일괄 작업 ({selectedTags.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 태그 목록 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTags.length === tags.length && tags.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                태그 코드
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                위치
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마지막 스캔
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tags.map((tag) => (
              <tr key={tag.tag_id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.tag_id)}
                    onChange={() => handleSelectTag(tag.tag_id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{tag.code}</div>
                  <div className="text-sm text-gray-500">{tag.tag_id?.substring(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {tag.location?.building && `${tag.location.building} `}
                    {tag.location?.floor && `${tag.location.floor}층 `}
                    {tag.location?.room || tag.location?.description || tag.location}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    tag.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tag.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tag.last_scanned_at ? new Date(tag.last_scanned_at).toLocaleString('ko-KR') : '없음'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleToggleTag(tag)}
                    className={tag.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                  >
                    {tag.is_active ? '비활성화' : '활성화'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tags.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">태그가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 border rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </nav>
        </div>
      )}

      {/* 태그 생성 모달 */}
      {showCreateModal && (
        <CreateTagModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTag}
        />
      )}

      {/* 일괄 작업 모달 */}
      {showBulkModal && (
        <BulkOperationModal
          selectedCount={selectedTags.length}
          onClose={() => setShowBulkModal(false)}
          onOperation={handleBulkOperation}
        />
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
};

// 태그 생성 모달 컴포넌트
const CreateTagModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    code: '',
    tag_uid: '',
    building: '본관',
    floor: 1,
    room: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">새 NFC 태그 등록</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              태그 코드 *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: ENTRANCE_001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              태그 UID *
            </label>
            <input
              type="text"
              required
              value={formData.tag_uid}
              onChange={(e) => setFormData({...formData, tag_uid: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="NFC 태그의 고유 ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              건물 *
            </label>
            <select
              required
              value={formData.building || '본관'}
              onChange={(e) => setFormData({...formData, building: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="본관">본관</option>
              <option value="신관">신관</option>
              <option value="별관">별관</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                층수 *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.floor || ''}
                onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                호실
              </label>
              <input
                type="text"
                value={formData.room || ''}
                onChange={(e) => setFormData({...formData, room: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 304호"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="태그에 대한 추가 설명"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 일괄 작업 모달 컴포넌트
const BulkOperationModal = ({ selectedCount, onClose, onOperation }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">일괄 작업</h2>
        <p className="text-gray-600 mb-6">{selectedCount}개의 태그가 선택되었습니다.</p>
        
        <div className="space-y-3">
          <button
            onClick={() => onOperation('activate')}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            선택된 태그 활성화
          </button>
          <button
            onClick={() => onOperation('deactivate')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            선택된 태그 비활성화
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFCTagManagement;