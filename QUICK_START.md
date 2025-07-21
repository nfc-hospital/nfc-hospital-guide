# 🚀 빠른 시작 가이드

## 📦 설치 및 실행 (3분 완성!)

### 1단계: 초기 설정
```bash
# 개발 환경 자동 설정 (한 번만 실행)
./scripts/dev-setup.sh
```

### 2단계: 통합 서버 실행
```bash
# Django + React + Admin 동시 실행
npm run dev
```

### 3단계: 접속
- **메인 앱**: http://localhost:3000 ← React PWA
- **API**: http://localhost:8000/api/
- **관리자**: http://localhost:8000/admin/

---

## 🎯 이제 뭘 할 수 있나요?

### ✅ 완료된 통합 기능들:
1. **한 번의 명령으로 모든 서버 실행**: `npm run dev`
2. **CORS 문제 없음**: React에서 Django API 자연스럽게 호출
3. **자동 토큰 관리**: JWT 인증 자동 처리
4. **타입 안전성**: Django 모델 → TypeScript 타입 자동 생성
5. **실시간 통신**: WebSocket 지원
6. **Hot Reload**: 코드 변경 시 자동 새로고침

### 🔧 개발 편의 기능들:
- **컬러 로그**: 서버별로 다른 색상으로 로그 표시
- **프록시 설정**: CORS 없이 API 호출 가능
- **자동 재시작**: 파일 변경 감지 시 자동 서버 재시작
- **통합 빌드**: `npm run build`로 전체 빌드

---

## 🎮 사용 예시

### Django 모델 생성 → React에서 즉시 사용

#### 1. Django 모델 생성
```python
# backend/nfc_hospital_system/appointments/models.py
class Appointment(models.Model):
    patient_name = models.CharField(max_length=100)
    department = models.CharField(max_length=50)
    appointment_date = models.DateTimeField()
```

#### 2. 마이그레이션
```bash
npm run dev:db
```

#### 3. React에서 바로 사용
```javascript
// frontend-pwa/src/components/AppointmentList.jsx
import { useAPI } from '@/hooks/useAPI';
import { appointmentAPI } from '@/api/client';

function AppointmentList() {
  const { data: appointments, loading } = useAPI(appointmentAPI.getAppointments);
  
  return (
    <div>
      {appointments?.map(apt => (
        <div key={apt.id}>
          {apt.patient_name} - {apt.department}
        </div>
      ))}
    </div>
  );
}
```

### API 호출 예시
```javascript
// 로그인
const loginResponse = await authAPI.login({
  username: 'user',
  password: 'pass'
});

// NFC 스캔
const scanResult = await nfcAPI.scan('TAG123');

// 예약 생성
const appointment = await appointmentAPI.createAppointment({
  department: '내과',
  appointment_date: '2024-01-15T10:00:00'
});
```

---

## 🔄 개발 워크플로우

### 새 기능 개발 과정:
1. Django 모델/API 수정
2. `npm run dev:db` (마이그레이션)
3. `npm run type:generate` (타입 생성)
4. React 컴포넌트 개발
5. 테스트

### 실시간 개발:
- Django 코드 수정 → 자동 재시작
- React 코드 수정 → 자동 새로고침
- 변경사항이 즉시 반영됨

---

## 📋 주요 명령어

```bash
# 🟢 개발 서버 (추천)
npm run dev              # Django + React + Admin

# 🔵 전체 실행
npm run dev:all          # 챗봇 포함 모든 서버

# 🟡 개별 실행
npm run dev:backend      # Django만
npm run dev:frontend     # React만
npm run dev:admin        # Admin만

# 🛠️ 유틸리티
npm run dev:db           # DB 마이그레이션
npm run type:generate    # 타입 생성
npm run build            # 전체 빌드
```

---

## ⚡ 성능 최적화 설정

### 자동 적용된 최적화:
- **프리플라이트 캐싱**: API 요청 최적화
- **토큰 자동 갱신**: 만료 시 자동 재발급  
- **WebSocket 자동 재연결**: 연결 끊김 시 자동 복구
- **번들 최적화**: Vite의 빠른 빌드
- **Hot Module Replacement**: 페이지 새로고침 없는 변경 반영

---

## 🎉 완성!

이제 Django와 React가 완전히 통합된 개발 환경에서 작업하실 수 있습니다!

**더 자세한 내용은 [DEVELOPMENT.md](./DEVELOPMENT.md)를 참고하세요.**

---

## 🆘 문제 해결

### 자주 묻는 질문:

**Q: 서버가 실행되지 않아요**
```bash
# 해결 방법
./scripts/dev-setup.sh  # 다시 설정
npm run dev             # 재실행
```

**Q: CORS 에러가 발생해요**
- ✅ 이미 해결됨! Vite 프록시로 CORS 문제 없습니다.

**Q: API가 호출되지 않아요**
```javascript
// React에서 이렇게 호출하세요 (프록시됨)
const response = await fetch('/api/appointments/');
```

**문제가 계속되면 GitHub Issues에 등록해주세요!**