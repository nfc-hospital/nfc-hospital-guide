# backend

Node.js + Express 기반 API 서버입니다.  
환자 위치 기록, 검사 내역 조회, 대기열 제어 등의 기능을 제공합니다.

## 주요 기술
- Node.js + Express
- JWT 인증 / 미들웨어
- Supabase 연동 (PostgreSQL)

## 주요 API
- `/tags` : 태그 정보 조회
- `/exams` : 검사/진료 정보
- `/queues` : 대기열 생성 및 상태 변경

## 개발 TODO
- [ ] JWT 기반 인증 미들웨어 작성
- [ ] API Swagger 문서화
- [ ] WebSocket 기반 대기 순서 푸시 설계
