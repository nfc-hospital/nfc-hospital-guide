# 테스트 코드 개선 가이드

## 개요
이 문서는 patient_journey.cy.js와 백엔드 테스트 코드의 안정성 및 효율성을 개선한 내용을 설명합니다.

## 주요 개선 사항

### 1. Cypress 테스트 개선

#### 1.1 동적 데이터 생성
- **문제점**: 하드코딩된 appointment_id와 환자 데이터
- **해결책**: 각 테스트마다 고유한 데이터를 동적으로 생성

```javascript
// 기존 방식 (문제)
cy.visit('/journey/123')  // 하드코딩된 ID

// 개선된 방식
cy.setupTestEnvironment()  // 동적으로 환자와 약속 생성
```

#### 1.2 테스트 격리
- **문제점**: 테스트 간 의존성으로 인한 불안정성
- **해결책**: beforeEach/afterEach를 활용한 독립적인 테스트 환경

```javascript
beforeEach(() => {
  cy.setupTestEnvironment()  // 새로운 테스트 데이터 생성
})

afterEach(() => {
  cy.cleanupTestData()  // 생성된 데이터 정리
})
```

#### 1.3 Custom Commands 추가
- `createDynamicTestPatient()`: 테스트 환자 동적 생성
- `createDynamicAppointments()`: 테스트 약속 동적 생성
- `cleanupTestData()`: 테스트 데이터 정리
- `setupTestEnvironment()`: 전체 테스트 환경 설정

### 2. 백엔드 테스트 API 보안 강화

#### 2.1 테스트 환경 전용 데코레이터
```python
@test_environment_only
def set_patient_state(request):
    # DEBUG=True일 때만 실행 가능
    # X-Test-Environment 헤더 필수
```

#### 2.2 트랜잭션 보호
```python
with transaction.atomic():
    # 모든 데이터베이스 작업을 트랜잭션으로 감싸기
    # 오류 시 자동 롤백
```

#### 2.3 데이터 보호
- test- 접두사가 있는 데이터만 삭제
- 테스트 사용자 검증 강화
- 실제 데이터 보호 로직 추가

### 3. Django 테스트 케이스 작성

#### 3.1 TestCase 활용
```python
class PatientStateTestCase(TestCase):
    def setUp(self):
        # 각 테스트 전 실행
        
    def tearDown(self):
        # 각 테스트 후 실행 (자동 롤백)
```

#### 3.2 APITestCase 활용
```python
class QueueAPITestCase(APITestCase):
    def test_join_queue(self):
        # API 엔드포인트 테스트
```

## 실행 방법

### Cypress 테스트 실행

1. **개발 서버 실행**
```bash
# 백엔드 서버 (테스트 모드)
cd backend/nfc_hospital_system
python manage.py runserver --settings=nfc_hospital_system.settings.development

# 프론트엔드 서버
cd frontend-pwa
pnpm dev
```

2. **Cypress 실행**
```bash
cd frontend-pwa

# 헤드리스 모드
pnpm cypress:run

# 인터랙티브 모드
pnpm cypress:open
```

3. **개선된 테스트 실행**
```bash
# 특정 테스트 파일만 실행
pnpm cypress:run --spec "cypress/e2e/patient_journey_improved.cy.js"
```

### Django 테스트 실행

1. **단위 테스트**
```bash
cd backend/nfc_hospital_system

# 특정 앱의 테스트 실행
python manage.py test p_queue.tests.test_views_proper

# 특정 테스트 클래스 실행
python manage.py test p_queue.tests.test_views_proper.PatientStateTestCase

# 특정 테스트 메서드 실행
python manage.py test p_queue.tests.test_views_proper.PatientStateTestCase.test_patient_state_creation
```

2. **전체 테스트**
```bash
# 모든 테스트 실행
python manage.py test

# 병렬 실행 (더 빠름)
python manage.py test --parallel 4
```

## 환경 설정

### Cypress 환경 변수 (.env)
```
CYPRESS_apiUrl=http://localhost:8000/api/v1
CYPRESS_baseUrl=http://localhost:5174
```

### Django 테스트 설정
```python
# settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # 메모리 DB 사용으로 빠른 테스트
    }
}

DEBUG = True  # 테스트 API 활성화
```

## 주의사항

1. **프로덕션 환경**
   - `DEBUG=False`로 설정하여 테스트 API 비활성화
   - 테스트 헤더 없이는 접근 불가

2. **데이터 안전**
   - 테스트는 항상 격리된 환경에서 실행
   - 실제 데이터는 절대 수정/삭제되지 않음

3. **병렬 실행**
   - Cypress 테스트는 순차 실행 권장
   - Django 테스트는 병렬 실행 가능

## 문제 해결

### Cypress 테스트 실패 시
1. 개발 서버가 실행 중인지 확인
2. 테스트 데이터베이스 초기화
3. 브라우저 캐시 삭제

### Django 테스트 실패 시
1. 마이그레이션 상태 확인
2. 테스트 데이터베이스 권한 확인
3. 의존성 패키지 설치 확인

## 향후 개선 사항

1. **CI/CD 통합**
   - GitHub Actions 설정
   - 자동 테스트 실행

2. **테스트 커버리지**
   - 현재 커버리지 측정
   - 목표 커버리지 설정

3. **성능 테스트**
   - 부하 테스트 추가
   - 응답 시간 측정

## 참고 자료

- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Django Testing Documentation](https://docs.djangoproject.com/en/5.0/topics/testing/)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)