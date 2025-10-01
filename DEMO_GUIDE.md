# 🚀 LSTM 데모 시스템 실행 가이드

## 개요
5분간 실시간으로 LSTM 예측 데이터가 변화하는 데모 시스템입니다.
데이터베이스 부하 없이 메모리 캐시만 사용하여 비용을 최소화했습니다.

## 시스템 구조
- **데모 시작**: 5분간의 예측 데이터를 미리 생성하여 캐시에 저장
- **실시간 업데이트**: 모든 Dashboard 컴포넌트가 자동으로 데모 데이터 표시
- **자동 종료**: 5분 후 자동으로 정상 모드 복귀

## 실행 방법

### 1. 백엔드 서버 실행
```bash
cd backend/nfc_hospital_system
python manage.py runserver
```

### 2. 프론트엔드 실행
```bash
cd frontend-pwa
pnpm dev
# 또는 npm run dev
```

### 3. 데모 시작
1. 브라우저에서 `http://localhost:5174` 접속
2. 관리자로 로그인
3. Dashboard 페이지 진입
4. 사이드바 상단의 **"🚀 5분 실시간 데모 시작"** 버튼 클릭

### 4. 데모 진행 중
- 상단에 녹색 배너가 표시됨
- 남은 시간이 카운트다운으로 표시
- 모든 LSTM 관련 컴포넌트가 실시간 데이터 표시:
  - LSTMPrediction
  - DelayDominoPrediction
  - WeeklyCongestionCalendar
  - RiskHeatmap
  - CongestionAlert

### 5. 데모 종료
- 5분 후 자동 종료
- 또는 상단 배너의 "데모 종료" 버튼 클릭

## 테스트 스크립트
```bash
# API 레벨 테스트 (로그인 필요 없음)
python test_demo_system.py

# LSTM API 단독 테스트
python test_lstm_api.py
```

## 주요 특징
✅ **비용 최적화**
- DB 쿼리 0회 (캐시만 사용)
- 5분 후 자동 정리 (TTL)
- 서버 부하 최소

✅ **프론트엔드 무수정**
- 기존 컴포넌트 그대로 사용
- predictions API가 자동으로 데모 데이터 반환
- 추가 WebSocket 연결 불필요

✅ **일관된 데이터**
- 모든 컴포넌트가 동일한 타임라인 데이터 사용
- 시간 경과에 따른 점진적 변화
- 부서별 연관성 있는 예측값

## 데모 시나리오
1. **0-60초**: 정상 상태, 낮은 혼잡도
2. **60-180초**: 점진적 혼잡도 증가
3. **180-240초**: 피크 타임, 최대 혼잡
4. **240-300초**: 서서히 안정화

## 문제 해결
- **데모가 시작되지 않음**: Django 서버 실행 확인
- **데이터가 업데이트되지 않음**: 브라우저 캐시 삭제 후 재시도
- **5분 후에도 종료되지 않음**: 페이지 새로고침

## 기술 스택
- Backend: Django + Redis/LocMemCache
- Frontend: React + Dashboard Components
- Cache: 5분 TTL 자동 만료
- API: RESTful + 데모 모드 분기