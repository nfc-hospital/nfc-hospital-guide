import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../api/apiService';

const TestDataManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(new Set());

  // 환자 상태 색상 매핑
  const stateColors = {
    UNREGISTERED: 'bg-gray-100 text-gray-700',
    ARRIVED: 'bg-blue-100 text-blue-700',
    REGISTERED: 'bg-indigo-100 text-indigo-700',
    WAITING: 'bg-amber-100 text-amber-700',
    CALLED: 'bg-green-100 text-green-700',
    ONGOING: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-teal-100 text-teal-700',
    PAYMENT: 'bg-orange-100 text-orange-700',
    FINISHED: 'bg-gray-300 text-gray-700'
  };

  // 상태 흐름 순서
  const stateFlow = [
    'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING', 
    'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT', 'FINISHED'
  ];

  // 환자 목록 조회
  const fetchPatients = async () => {
    try {
      const response = await apiService.api.get('/api/v1/test/patients/');
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // 환자 상태 업데이트
  const updatePatientState = async (userId, newState) => {
    try {
      await apiService.api.put('/api/v1/test/patient-state/', {
        user_id: userId,
        new_state: newState
      });
      await fetchPatients(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to update patient state:', error);
    }
  };

  // 환자 시뮬레이션 (자동 진행)
  const simulatePatient = async (userId) => {
    setSimulating(prev => new Set(prev).add(userId));
    
    try {
      const response = await apiService.api.post('/api/v1/test/simulate/', {
        user_id: userId
      });
      
      if (!response.data.is_final) {
        // 3초 후 다음 단계로 자동 진행
        setTimeout(() => {
          simulatePatient(userId);
        }, 3000);
      } else {
        setSimulating(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
      
      await fetchPatients();
    } catch (error) {
      console.error('Failed to simulate patient:', error);
      setSimulating(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // 모든 환자 초기화
  const resetAllPatients = async () => {
    if (!window.confirm('모든 환자 상태를 REGISTERED로 초기화하시겠습니까?')) {
      return;
    }
    
    try {
      await apiService.api.post('/api/v1/test/reset/');
      await fetchPatients();
    } catch (error) {
      console.error('Failed to reset patients:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            시연용 테스트 데이터 관리
          </h1>
          <button
            onClick={resetAllPatients}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            모든 환자 초기화
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            ℹ️ 이 페이지는 시연용 가상 EMR 데이터를 관리합니다. 
            환자 상태를 직접 변경하거나 자동 시뮬레이션을 실행할 수 있습니다.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  환자명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  현재 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태 변경
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시뮬레이션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {patient.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${stateColors[patient.current_state]}`}>
                      {patient.current_state}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={patient.current_state}
                      onChange={(e) => updatePatientState(patient.user_id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      disabled={simulating.has(patient.user_id)}
                    >
                      {stateFlow.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => simulatePatient(patient.user_id)}
                      disabled={simulating.has(patient.user_id)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        simulating.has(patient.user_id)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {simulating.has(patient.user_id) ? '진행 중...' : '자동 진행'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            테스트 환자가 없습니다. 먼저 테스트 데이터를 생성해주세요.
          </div>
        )}
      </div>
    </div>
  );
};

export default TestDataManager;