import React from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import FormatBTemplate from '../templates/FormatBTemplate';

export default function UnregisteredScreen({ taggedLocation }) {
  const navigate = useNavigate();
  const { user, todaysAppointments = [] } = useJourneyStore();

  // 다음 일정 정보 (첫 번째 예약)
  const nextSchedule = todaysAppointments.length > 0 
    ? `${new Date(todaysAppointments[0].scheduled_at).toLocaleDateString('ko-KR')} ${new Date(todaysAppointments[0].scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : '예정된 일정 없음';

  // 상단 요약 카드
  const summaryCards = [
    { label: '병원 전화번호', value: '02-1234-5678' },
    { label: '접수 시간', value: '08:00~17:00' }
  ];

  // 오늘의 일정 준비
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: '검사 전 준비사항을 확인해주세요',
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department
  })) || [];

  // 준비사항 체크리스트
  const preparationItems = [
    {
      icon: '📄',
      title: '서류 준비사항',
      description: '필수 서류를 확인해주세요',
      items: [
        { text: '신분증 (주민등록증, 운전면허증)' },
        { text: '건강보험증' },
        { text: '의뢰서 (타 병원에서 온 경우)' },
        { text: '이전 검사 결과지 (있는 경우)' }
      ]
    },
    {
      icon: '💊',
      title: '복용 약물 정보',
      description: '현재 복용 중인 약물을 확인해주세요',
      items: [
        { text: '현재 복용 중인 처방약 목록' },
        { text: '약물 알레르기 정보' },
        { text: '건강보조식품 또는 영양제' },
        { text: '최근 중단한 약물 정보' }
      ]
    },
    {
      icon: '🚫',
      title: '금식 관련',
      description: '검사별 금식 요구사항을 확인하세요',
      items: [
        { text: '검사 8시간 전부터 금식' },
        { text: '물 섭취도 2시간 전부터 중단' },
        { text: '혈압약 등 필수 약물은 의료진과 상담' },
        { text: '껌, 담배, 사탕 등도 금지' }
      ]
    },
    {
      icon: '📝',
      title: '기타 준비사항',
      description: '편안한 검사를 위한 추가 준비사항',
      items: [
        { text: '편안한 복장 착용 (원피스보다 상하 분리)' },
        { text: '충분한 수면 (최소 6-7시간)' },
        { text: '보호자 동반 (필요시)' },
        { text: '교통편 미리 확인' }
      ]
    }
  ];

  return (
    <FormatBTemplate
      screenType="unregistered"
      status="접수 전"
      nextSchedule={nextSchedule}
      summaryCards={summaryCards}
      todaySchedule={todaySchedule}
      preparationItems={preparationItems}
    />
  );
}