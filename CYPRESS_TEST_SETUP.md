# Cypress 테스트 환경 설정 가이드

## 문제 해결 요약

### 1. TypeError 해결
- `phone_last4` 속성명은 올바름
- 날짜 형식 변환 로직 유지 (API는 YYMMDD 형식 필요)

### 2. 404 오류 해결
- Django에 회원가입 API(`/auth/register/`)가 없음
- 대신 미리 생성된 테스트 사용자 사용

## 테스트 실행 전 준비사항

### 1. 테스트 사용자 생성
```bash
cd backend/nfc_hospital_system
python manage.py create_test_data
```

이 명령어는 다음 테스트 사용자를 생성합니다:
- 전화번호: 010-1234-5678 (뒷자리: 5678)
- 생년월일: 1990-01-01
- 간편 로그인 정보: phoneLast4: "5678", birthDate: "900101"

### 2. 백엔드 서버 실행
```bash
cd backend/nfc_hospital_system
python manage.py runserver
```

### 3. 프론트엔드 서버 실행
```bash
cd frontend-pwa
pnpm dev
```

### 4. Cypress 테스트 실행
```bash
cd frontend-pwa
pnpm cypress:run --spec "cypress/e2e/patient_journey_improved.cy.js"
```

## 코드 변경 사항

### createDynamicTestPatient() 수정
- 회원가입 API 대신 간편 로그인 사용
- 미리 생성된 테스트 사용자로 로그인

### setupTestEnvironment() 간소화
- 중복된 로그인 로직 제거
- createDynamicTestPatient에서 이미 로그인 처리

## 환경 변수 확인

`cypress.env.json` 또는 `cypress.config.js`에 다음 설정 확인:
```json
{
  "apiUrl": "http://localhost:8000/api/v1"
}
```

## 문제가 계속될 경우

1. **테스트 사용자 확인**
   ```bash
   python manage.py shell
   >>> from authentication.models import User
   >>> User.objects.filter(phone_number='010-1234-5678').exists()
   ```

2. **API 엔드포인트 확인**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/simple-login/ \
     -H "Content-Type: application/json" \
     -d '{"phoneLast4": "5678", "birthDate": "900101"}'
   ```

3. **Django 로그 확인**
   - 서버 콘솔에서 404 또는 500 오류 확인
   - CORS 오류 확인

## 추가 개선사항

나중에 회원가입 API를 추가하려면:
1. `authentication/views.py`에 `register` 뷰 추가
2. `authentication/urls.py`에 경로 추가
3. `createDynamicTestPatient()` 원래 로직으로 복원