from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import User
from appointments.models import Exam
import time


class PredictionAPITestCase(TestCase):
    def setUp(self):
        """테스트에 필요한 기본 데이터 설정"""
        self.client = APIClient()

        # 테스트용 사용자 생성 (실제 시스템 형식에 맞게)
        # 관리자 계정 (dept 권한)
        self.admin_user = User.objects.create(
            email='admin@test.com',
            name='관리자',
            role='dept',
            phone_number='010-1234-5678',
            birth_date='1990-01-01'
        )
        # 비밀번호는 전화번호 뒷자리 + 생년월일
        self.admin_user.set_password('5678900101')
        self.admin_user.save()

        # 환자 계정
        self.patient_user = User.objects.create(
            email='patient@test.com',
            name='환자',
            role='patient',
            phone_number='010-2222-2222',
            birth_date='2002-01-30'
        )
        self.patient_user.set_password('2222020130')
        self.patient_user.save()

        # Super admin 계정
        self.super_admin = User.objects.create(
            email='super@test.com',
            name='최고관리자',
            role='super',
            phone_number='010-9999-9999',
            birth_date='1985-05-15'
        )
        self.super_admin.set_password('9999850515')
        self.super_admin.save()

        # 테스트용 진료과 생성
        Exam.objects.create(
            exam_id='test-exam-1',
            title='내과진료',
            department='내과',
            description='내과 일반 진료',
            average_duration=30,
            buffer_time=10,
            x_coord=0.0,
            y_coord=0.0
        )

        # URL 설정 (analytics 앱의 predictions 뷰)
        self.url = '/api/v1/analytics/predictions/'

    def _get_auth_token(self, user):
        """JWT 토큰 생성 헬퍼 메서드"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_prediction_api_success_for_admin(self):
        """관리자 사용자가 API에 성공적으로 접근하는지 테스트"""
        # JWT 토큰으로 인증
        token = self._get_auth_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        # 응답 데이터 구조 확인
        data = response.json()['data']
        self.assertIn('timestamp', data)
        self.assertIn('timeframe', data)
        self.assertIn('overall', data)
        self.assertIn('departments', data)
        self.assertIn('recommendations', data)

    def test_prediction_api_permission_denied_for_patient(self):
        """일반 환자 사용자의 접근이 차단되는지 테스트"""
        token = self._get_auth_token(self.patient_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json()['success'])
        self.assertIn('부서 관리자 이상의 권한이 필요합니다', response.json()['message'])

    def test_cache_works_correctly(self):
        """API 응답이 정상적으로 캐싱되는지 테스트"""
        token = self._get_auth_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        cache.clear()

        # 첫 번째 호출 (캐시 없음)
        start_time = time.time()
        response1 = self.client.get(self.url)
        first_call_duration = time.time() - start_time

        # 두 번째 호출 (캐시 있음)
        start_time = time.time()
        response2 = self.client.get(self.url)
        second_call_duration = time.time() - start_time

        # 응답 상태 확인
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        # 캐시된 데이터는 동일해야 함
        # Note: timestamp가 다를 수 있으므로 departments만 비교
        if 'departments' in response1.json()['data'] and 'departments' in response2.json()['data']:
            self.assertEqual(
                response1.json()['data']['departments'],
                response2.json()['data']['departments']
            )

        # 캐시 성능 출력
        print(f"\n=== Cache Test Results ===")
        print(f"  First call took: {first_call_duration:.4f}s")
        print(f"  Second call took: {second_call_duration:.4f}s")
        if first_call_duration > 0:
            improvement = ((first_call_duration - second_call_duration) / first_call_duration * 100)
            print(f"  Speed improvement: {improvement:.1f}%")

    def test_super_admin_access(self):
        """super 권한 사용자도 API에 접근 가능한지 테스트"""
        token = self._get_auth_token(self.super_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        print(f"\n✅ Super admin access test passed")

    def test_unauthenticated_access_denied(self):
        """인증되지 않은 사용자의 접근이 차단되는지 테스트"""
        # 인증 헤더 없이 요청
        response = self.client.get(self.url)

        # 인증되지 않은 경우 401 반환
        self.assertEqual(response.status_code, 401)
        print(f"\n✅ Unauthenticated access properly blocked")

    def test_timeframe_parameter(self):
        """timeframe 파라미터가 정상 동작하는지 테스트"""
        token = self._get_auth_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 다양한 timeframe 값 테스트
        for timeframe in ['30min', '1hour', '2hour']:
            response = self.client.get(f'{self.url}?timeframe={timeframe}')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['data']['timeframe'], timeframe)

        print(f"\n✅ Timeframe parameter test passed for all values")

    def test_department_filter(self):
        """특정 부서 필터링이 동작하는지 테스트"""
        token = self._get_auth_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get(f'{self.url}?department=내과')
        self.assertEqual(response.status_code, 200)

        # 필터링된 경우 해당 부서만 포함되어야 함
        data = response.json()['data']
        if data['departments']:
            # 내과만 포함되어 있는지 확인
            self.assertIn('내과', data['departments'])
            self.assertEqual(len(data['departments']), 1)

        print(f"\n✅ Department filter test passed")

    def test_model_loading(self):
        """LSTM 모델이 정상적으로 로드되는지 테스트"""
        from integrations.services.model_loader import predictor

        # 모델이 로드되었는지 확인
        self.assertIsNotNone(predictor.interpreter)
        self.assertIsNotNone(predictor.input_details)
        self.assertIsNotNone(predictor.output_details)

        print(f"\n✅ LSTM model loaded successfully")
        print(f"  - Input shape: {predictor.input_details[0]['shape']}")
        print(f"  - Output shape: {predictor.output_details[0]['shape']}")