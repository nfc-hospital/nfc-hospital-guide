# admin-dashboard

의료진과 병원 운영자를 위한 관리자 대시보드입니다.  
환자의 대기열, 검사 준비사항, 태그 매핑 등을 실시간으로 관리할 수 있습니다.

## 주요 기술
- React + Chakra UI
- Supabase (PostgreSQL)
- JWT 인증 / RBAC 권한 분리

## 주요 기능
- 검사/진료 콘텐츠 CRUD
- NFC 태그 ↔ 검사 매핑
- 대기열 상태 조회 및 수동 수정
- 알림 전송 및 로그 확인

## 개발 TODO
- [ ] Supabase 연결 및 데이터베이스 테스트
- [ ] RBAC에 따른 메뉴 표시 제어
- [ ] 대기열 상태 변경 로직 구현
