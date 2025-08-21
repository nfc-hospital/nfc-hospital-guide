# 🏥 NFC Hospital Guide - 통합 개발 환경 가이드

## 📋 목차
- [프로젝트 개요](#프로젝트-개요)
- [빠른 시작](#빠른-시작)
- [개발 환경 구조](#개발-환경-구조)
- [통합 스크립트 사용법](#통합-스크립트-사용법)
- [API 연동 가이드](#api-연동-가이드)
- [개발 워크플로우](#개발-워크플로우)
- [트러블슈팅](#트러블슈팅)
- [배포 가이드](#배포-가이드)

---

## 🎯 프로젝트 개요

**NFC Hospital Guide**는 Django 백엔드와 React PWA 프론트엔드가 완전히 통합된 병원 안내 시스템입니다.

### 기술 스택
- **Backend**: Django 5.2 + DRF + PostgreSQL/MySQL + Redis
- **Frontend**: React 18 + Vite + Tailwind CSS + PWA
- **Admin Dashboard**: React Admin
- **Real-time**: WebSocket (Django Channels)
- **Authentication**: JWT
- **Development**: pnpm workspace + concurrently

### 포트 구성
| 서비스 | 포트 | URL | 설명 |
|-------|------|-----|------|
| Django API | 8000 | http://localhost:8000 | 백엔드 API 서버 |
| React PWA | 3000 | http://localhost:3000 | 프론트엔드 (환자용) |
| Admin Dashboard | 3001 | http://localhost:3001 | 관리자 대시보드 |
| Chatbot Server | 5000 | http://localhost:5000 | AI 챗봇 서버 (예정) |

---

## 🚀 빠른 시작

### 1. 저장소 클론 및 초기 설정
\`\`\`bash
# 1. 저장소 클론
git clone https://github.com/nfc-hospital/nfc-hospital-guide.git
cd nfc-hospital-guide

# 2. 자동 개발 환경 설정 실행
./scripts/dev-setup.sh

# 3. Django 관리자 계정 생성 (선택사항)
cd backend/nfc_hospital_system
python manage.py createsuperuser
cd ../..
\`\`\`

### 2. 통합 개발 서버 실행
\`\`\`bash
# Django + React + Admin 동시 실행
npm run dev

# 또는 개별 실행
npm run dev:backend   # Django만
npm run dev:frontend  # React PWA만
npm run dev:admin     # Admin Dashboard만
\`\`\`

### 3. 접속
- **React PWA**: http://localhost:3000 ← **메인 앱**
- **Django API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/
- **API 문서**: http://localhost:8000/api/docs/

---

## 🏗️ 개발 환경 구조

### 디렉토리 구조
\`\`\`
nfc-hospital-guide/
├── 📦 package.json                 # 루트 워크스페이스 설정
├── 📦 pnpm-workspace.yaml         # pnpm 워크스페이스
├── 📁 backend/                     # Django 백엔드
│   ├── 📦 requirements.txt
│   ├── 📄 .env                    # 환경 변수
│   └── 📁 nfc_hospital_system/    # Django 프로젝트
│       ├── 📄 manage.py
│       ├── 📁 settings/           # 환경별 설정
│       ├── 📁 authentication/     # 인증 앱
│       ├── 📁 nfc/               # NFC 태그 앱
│       ├── 📁 appointments/      # 예약 앱
│       └── 📁 p_queue/           # 대기열 앱
├── 📁 frontend-pwa/               # React PWA
│   ├── 📦 package.json
│   ├── 📄 vite.config.js         # Vite 설정 (프록시 포함)
│   └── 📁 src/
│       ├── 📁 api/               # API 클라이언트
│       ├── 📁 hooks/             # 커스텀 Hook들
│       ├── 📁 components/        # React 컴포넌트
│       └── 📁 types/            # TypeScript 타입 (자동생성)
├── 📁 admin-dashboard/           # 관리자 대시보드
├── 📁 scripts/                   # 개발 도구
│   ├── 🔧 dev-setup.sh          # 초기 설정
│   └── 🔧 generate-types.js     # 타입 생성
└── 📄 DEVELOPMENT.md            # 이 문서
\`\`\`

### 환경별 설정 파일

#### Django 설정
- **base.py**: 공통 설정 (CORS, JWT, DB)
- **development.py**: 개발용 (느슨한 CORS, 디버그 모드)
- **production.py**: 운영용 (엄격한 보안, HTTPS)

#### React 설정
- **vite.config.js**: Vite 개발 서버 + 프록시 설정
- **package.json**: 개발/빌드 스크립트

---

## 📜 통합 스크립트 사용법

### 개발 서버 실행
\`\`\`bash
# 🟢 추천: Django + React PWA + Admin Dashboard 동시 실행
npm run dev

# 🔵 전체 실행 (챗봇 포함)
npm run dev:all

# 🟡 개별 실행
npm run dev:backend    # Django만 실행
npm run dev:frontend   # React PWA만 실행  
npm run dev:admin      # Admin Dashboard만 실행
npm run dev:chatbot    # 챗봇 서버만 실행 (예정)
\`\`\`

### 데이터베이스 관리
\`\`\`bash
# 마이그레이션 생성 및 적용
npm run dev:db

# 개별 실행
cd backend/nfc_hospital_system
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
\`\`\`

### 빌드 및 배포
\`\`\`bash
# 전체 빌드
npm run build

# React PWA만 빌드
npm run build:frontend

# 프로덕션 준비
npm run clean && npm run build
\`\`\`

### API 타입 자동 생성
\`\`\`bash
# Django 모델에서 TypeScript 타입 자동 생성
npm run type:generate
\`\`\`

---

## 🔌 API 연동 가이드

### CORS 설정이 완료되어 프록시를 통해 자연스럽게 연동됩니다!

#### 1. API 클라이언트 사용법
\`\`\`javascript
// frontend-pwa/src/api/client.js
import { api, authAPI, nfcAPI, appointmentAPI } from '@/api/client'; 

// 로그인
const login = async (credentials) => {
  try {
    const response = await authAPI.login(credentials);
    // 토큰 자동 저장됨
    return response;
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};

// NFC 태그 스캔
const scanNFC = async (tagId) => {
  try {
    const response = await nfcAPI.scan(tagId);
    return response;
  } catch (error) {
    console.error('NFC scan failed:', error.message);
  }
};
\`\`\`

#### 2. React Hook 사용법
\`\`\`javascript
// frontend-pwa/src/hooks/useAPI.js
import { useAPI, useMutation, useAuth } from '@/hooks/useAPI';
import { appointmentAPI } from '@/api/client';

// 컴포넌트에서 사용
function AppointmentList() {
  // 예약 목록 가져오기 (자동 실행)
  const { data: appointments, loading, error } = useAPI(
    appointmentAPI.getAppointments
  );

  // 예약 생성 (수동 실행)
  const { mutate: createAppointment } = useMutation(
    appointmentAPI.createAppointment,
    {
      onSuccess: () => {
        alert('예약이 생성되었습니다!');
        // 목록 새로고침 등
      }
    }
  );

  if (loading) return <div>로딩중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <div>
      {appointments?.map(appointment => (
        <div key={appointment.id}>
          {appointment.department} - {appointment.date}
        </div>
      ))}
      <button onClick={() => createAppointment(newData)}>
        새 예약 생성
      </button>
    </div>
  );
}
\`\`\`

#### 3. 인증 상태 관리
\`\`\`javascript
import { useAuth } from '@/hooks/useAPI';

function App() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div>
      <h1>안녕하세요, {user?.name}님!</h1>
      <button onClick={logout}>로그아웃</button>
      {/* 메인 앱 내용 */}
    </div>
  );
}
\`\`\`

---

## 🔄 개발 워크플로우

### Django 모델 → React 컴포넌트 연동 흐름

#### 1. Django 모델 생성/수정
\`\`\`python
# backend/nfc_hospital_system/appointments/models.py
class Appointment(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.CharField(max_length=100)
    date = models.DateTimeField()
    status = models.CharField(max_length=20, default='scheduled')
    
    class Meta:
        ordering = ['-date']
\`\`\`

#### 2. API Serializer & ViewSet
\`\`\`python
# appointments/serializers.py
class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'

# appointments/views.py
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    queryset = Appointment.objects.all()
\`\`\`

#### 3. URL 등록
\`\`\`python
# appointments/urls.py
router.register('appointments', AppointmentViewSet)
\`\`\`

#### 4. 마이그레이션
\`\`\`bash
npm run dev:db
\`\`\`

#### 5. TypeScript 타입 생성 (자동)
\`\`\`bash
npm run type:generate
# frontend-pwa/src/types/api.ts 파일 업데이트됨
\`\`\`

#### 6. React 컴포넌트에서 사용
\`\`\`javascript
// frontend-pwa/src/components/AppointmentCard.jsx
import { useAPI } from '@/hooks/useAPI';
import { appointmentAPI } from '@/api/client';

function AppointmentCard() {
  const { data: appointments, loading } = useAPI(
    appointmentAPI.getAppointments
  );

  return (
    <div>
      {appointments?.map(appointment => (
        <div key={appointment.id} className="card">
          <h3>{appointment.department}</h3>
          <p>날짜: {appointment.date}</p>
          <span className={`status ${appointment.status}`}>
            {appointment.status}
          </span>
        </div>
      ))}
    </div>
  );
}
\`\`\`

### 실시간 업데이트 (WebSocket)
\`\`\`javascript
// 대기열 상태 실시간 업데이트
import { useRealtime } from '@/hooks/useAPI';

function QueueStatus() {
  const { data: queueData, connected } = useRealtime('/ws/queue/');
  
  return (
    <div>
      <div className={connected ? 'online' : 'offline'}>
        {connected ? '🟢 연결됨' : '🔴 연결 끊김'}
      </div>
      <p>대기 번호: {queueData?.position}</p>
      <p>예상 시간: {queueData?.estimated_time}분</p>
    </div>
  );
}
\`\`\`

---

## 🛠️ 트러블슈팅

### 자주 발생하는 문제들

#### 1. CORS 에러
**증상**: \`Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy\`

**해결방법**:
- ✅ **이미 해결됨**: Vite 프록시 설정으로 CORS 문제 없음
- React에서 \`/api/\` 경로로 요청하면 자동으로 Django 서버로 프록시됨

#### 2. Django 서버 실행 실패
**증상**: \`ModuleNotFoundError\` 또는 데이터베이스 연결 오류

**해결방법**:
\`\`\`bash
# 1. 가상환경 활성화 확인
cd backend
source venv/bin/activate  # Linux/Mac
# 또는
venv\\Scripts\\activate  # Windows

# 2. 패키지 재설치
pip install -r requirements.txt

# 3. 환경 변수 확인
cp .env.example .env
# .env 파일에서 데이터베이스 설정 확인

# 4. 마이그레이션
cd nfc_hospital_system
python manage.py migrate
\`\`\`

#### 3. React 개발 서버 실행 실패
**증상**: \`Module not found\` 또는 포트 충돌

**해결방법**:
\`\`\`bash
# 1. 패키지 재설치
pnpm install

# 2. 포트 변경 (필요한 경우)
# frontend-pwa/vite.config.js에서 port 수정

# 3. 캐시 삭제
pnpm clean
pnpm install
\`\`\`

#### 4. API 타입 생성 실패
**증상**: TypeScript 타입 파일이 생성되지 않음

**해결방법**:
\`\`\`bash
# 1. Django 서버가 실행 중인지 확인
npm run dev:backend

# 2. 수동으로 타입 생성
cd backend/nfc_hospital_system
python manage.py spectacular --file openapi-schema.yml

# 3. TypeScript 타입 변환
npx openapi-typescript openapi-schema.yml -o ../../frontend-pwa/src/types/api.ts
\`\`\`

#### 5. 인증 토큰 관련 오류
**증상**: 401 Unauthorized 또는 토큰 갱신 실패

**해결방법**:
\`\`\`bash
# 1. Django 설정 확인
# backend/nfc_hospital_system/settings/base.py의 JWT 설정 확인

# 2. 브라우저 localStorage 초기화
# 개발자 도구 > Application > Local Storage > Clear All

# 3. Django 로그 확인
tail -f backend/nfc_hospital_system/logs/django.log
\`\`\`

### 개발 환경 초기화
\`\`\`bash
# 완전 초기화 후 재설정
git clean -fdx
./scripts/dev-setup.sh
npm run dev
\`\`\`

---

## 🚀 배포 가이드

### 프로덕션 빌드
\`\`\`bash
# 1. React PWA 빌드
npm run build:frontend

# 2. Django 정적 파일 수집
cd backend/nfc_hospital_system
python manage.py collectstatic --noinput

# 3. 마이그레이션 (프로덕션 DB)
python manage.py migrate --settings=nfc_hospital_system.settings.production
\`\`\`

### 환경 변수 설정
\`\`\`bash
# 프로덕션 .env 설정
DJANGO_ENVIRONMENT=production
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 데이터베이스 (운영용)
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-password

# Redis (운영용)
REDIS_URL=redis://your-redis-host:6379

# AWS S3 (정적 파일용)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-s3-bucket
\`\`\`

### Docker 배포 (선택사항)
\`\`\`dockerfile
# Dockerfile
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend-pwa/ ./
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./
COPY --from=frontend-builder /app/dist ./static/
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["gunicorn", "nfc_hospital_system.wsgi:application"]
\`\`\`

---

## 📚 추가 리소스

### 공식 문서
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React 공식 문서](https://react.dev/)
- [Vite 가이드](https://vitejs.dev/guide/)
- [pnpm 워크스페이스](https://pnpm.io/workspaces)

### 프로젝트 구조 참고
- [Django 프로젝트 구조 모범 사례](https://docs.djangoproject.com/en/stable/intro/reusable-apps/)
- [React PWA 가이드](https://create-react-app.dev/docs/making-a-progressive-web-app/)

---

## 🤝 기여 가이드

1. 이슈 생성 또는 기능 요청
2. 브랜치 생성: \`git checkout -b feature/새기능\`
3. 변경사항 커밋: \`git commit -m 'feat: 새 기능 추가'\`
4. Push: \`git push origin feature/새기능\`
5. Pull Request 생성

### 커밋 메시지 규칙
- **feat**: 새 기능 추가
- **fix**: 버그 수정  
- **docs**: 문서 수정
- **style**: 코드 스타일 변경
- **refactor**: 코드 리팩토링
- **test**: 테스트 추가/수정
- **chore**: 기타 작업

---

## 📞 지원

문제가 있거나 도움이 필요하시면:

1. **이슈 등록**: [GitHub Issues](https://github.com/nfc-hospital/nfc-hospital-guide/issues)
2. **디스커션**: [GitHub Discussions](https://github.com/nfc-hospital/nfc-hospital-guide/discussions)
3. **위키**: [프로젝트 위키](https://github.com/nfc-hospital/nfc-hospital-guide/wiki)

**Happy Coding! 🎉**