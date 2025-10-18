import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedJourneyTemplate from '../components/templates/UnifiedJourneyTemplate';
import useJourneyStore from '../store/journeyStore';

/**
 * TestNewLayout - 새로운 통합 레이아웃 테스트 페이지
 *
 * 경로: /test-new-layout
 *
 * 전체 환자 여정 시뮬레이션 (접수 ~ 수납까지)
 */
const TestNewLayout = () => {
  const navigate = useNavigate();
  const user = useJourneyStore(state => state.user);

  // 전체 여정 시뮬레이션 데이터 주입
  useEffect(() => {
    const mockJourneyData = {
      // 전체 여정을 appointments 배열로 통합
      appointments: [
        // 1. 접수
        {
          appointment_id: 'reg-001',
          status: 'completed',
          exam: {
            exam_id: 'reg-001',
            title: '접수',
            description: '병원 접수 및 환자 등록 절차',
            department: '원무과',
            average_duration: 5,
            location: {
              building: '본관',
              floor: '1층',
              room: '원무과'
            }
          }
        },
        // 2. 혈액 검사 (완료)
        {
          appointment_id: 'apt-001',
          status: 'completed',
          exam: {
            exam_id: 'exam-001',
            title: '혈액 검사',
            description: '혈액을 채취하여 혈당, 콜레스테롤, 간 기능, 신장 기능 등을 확인하는 검사',
            department: '진단검사의학과',
            average_duration: 10,
            location: {
              building: '본관',
              floor: '2층',
              room: '201호'
            }
          }
        },
        // 3. CT 촬영 (현재 진행 중)
        {
          appointment_id: 'apt-002',
          status: 'waiting',
          exam: {
            exam_id: 'exam-002',
            title: 'CT 촬영',
            description: '흉부를 CT로 촬영하여 폐, 심장, 혈관의 상태를 정밀하게 확인하는 검사',
            department: '영상의학과',
            average_duration: 30,
            location: {
              building: '본관',
              floor: '2층',
              room: '304호'
            }
          }
        },
        // 4. MRI 검사 (대기)
        {
          appointment_id: 'apt-003',
          status: 'pending',
          exam: {
            exam_id: 'exam-003',
            title: 'MRI 검사',
            description: '뇌를 자기장으로 촬영하여 뇌 구조와 혈관 상태를 정밀하게 확인하는 검사',
            department: '영상의학과',
            average_duration: 45,
            location: {
              building: '암센터',
              floor: '1층',
              room: 'MRI실'
            }
          }
        },
        // 5. X-ray 촬영 (대기)
        {
          appointment_id: 'apt-004',
          status: 'pending',
          exam: {
            exam_id: 'exam-004',
            title: 'X-ray 촬영',
            description: '흉부를 X-ray로 촬영하여 폐와 심장의 상태를 확인하는 검사',
            department: '영상의학과',
            average_duration: 15,
            location: {
              building: '본관',
              floor: '1층',
              room: 'X-ray실'
            }
          }
        },
        // 6. 수납 (대기)
        {
          appointment_id: 'pay-001',
          status: 'pending',
          exam: {
            exam_id: 'pay-001',
            title: '수납',
            description: '진료비 및 검사비 수납',
            department: '원무과',
            average_duration: 5,
            location: {
              building: '본관',
              floor: '1층',
              room: '수납창구'
            }
          }
        }
      ],
      // 현재 대기 정보
      currentQueue: {
        state: 'waiting',
        queue_number: 104,
        estimated_wait_time: 15
      },
      // 위치 정보
      locationInfo: {
        name: '본관 2층 304호',
        building: '본관',
        floor: '2층',
        room: '304호',
        mapId: 'main_2f'
      }
    };

    // Store에 직접 데이터 주입
    const store = useJourneyStore.getState();
    store.todaysAppointments = mockJourneyData.appointments;
    store.currentQueues = [mockJourneyData.currentQueue];
    store.locationInfo = mockJourneyData.locationInfo;
    store.patientState = 'WAITING';
  }, []);

  return <UnifiedJourneyTemplate />;
};

export default TestNewLayout;
