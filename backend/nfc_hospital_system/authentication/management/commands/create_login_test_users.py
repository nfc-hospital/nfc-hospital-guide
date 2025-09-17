"""
로그인 테스트용 사용자 생성 관리 명령어
사용법: python manage.py create_login_test_users
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import User
from p_queue.models import PatientState


class Command(BaseCommand):
    help = '로그인 테스트용 사용자 생성'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n🏥 NFC 병원 시스템 - 테스트 사용자 생성'))
        self.stdout.write('='*50)
        
        # 테스트 사용자 데이터
        test_users = [
            {
                'email': 'test1@example.com',
                'name': '김환자',
                'phone_number': '010-1234-5678',
                'birth_date': '1990-01-01',
                'password': 'test1234',
                'role': 'patient',
                'patient_id': 'P001'
            },
            {
                'email': 'test2@example.com',
                'name': '이환자',
                'phone_number': '010-9876-5432',
                'birth_date': '1985-05-15',
                'password': 'test1234',
                'role': 'patient',
                'patient_id': 'P002'
            },
            {
                'email': 'test3@example.com',
                'name': '박환자',
                'phone_number': '010-5555-5555',
                'birth_date': '2000-12-25',
                'password': 'test1234',
                'role': 'patient',
                'patient_id': 'P003'
            },
            {
                'email': 'test99@example.com',
                'name': '테스트환자',
                'phone_number': '010-9999-9999',
                'birth_date': '1999-09-09',
                'password': 'test1234',
                'role': 'patient',
                'patient_id': 'P099'
            },
            {
                'email': 'admin@hospital.com',
                'name': '관리자',
                'phone_number': '010-0000-0000',
                'birth_date': '1980-01-01',
                'password': 'admin1234',
                'role': 'admin',
                'patient_id': 'A001'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for user_data in test_users:
            try:
                # 전화번호로 기존 사용자 확인
                user, created = User.objects.get_or_create(
                    phone_number=user_data['phone_number'],
                    defaults={
                        'email': user_data['email'],
                        'name': user_data['name'],
                        'birth_date': user_data['birth_date'],
                        'role': user_data['role'],
                        'patient_id': user_data.get('patient_id'),
                        'is_active': True,
                        'is_staff': user_data['role'] == 'admin',
                        'is_superuser': user_data['role'] == 'admin'
                    }
                )
                
                if created:
                    # 비밀번호 설정
                    user.set_password(user_data['password'])
                    user.save()
                    
                    # PatientState 생성
                    PatientState.objects.get_or_create(
                        user=user,
                        defaults={
                            'current_state': 'UNREGISTERED',
                            'is_logged_in': False
                        }
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'✨ 새 사용자 생성: {user.name} ({user.phone_number})')
                    )
                    created_count += 1
                else:
                    # 기존 사용자 정보 업데이트 (필요시)
                    user.is_active = True
                    user.save()
                    
                    self.stdout.write(
                        self.style.WARNING(f'✅ 기존 사용자 확인: {user.name} ({user.phone_number})')
                    )
                    updated_count += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ 오류 발생: {user_data["name"]} - {str(e)}')
                )
        
        # 결과 출력
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('📋 테스트 사용자 목록'))
        self.stdout.write('='*50)
        
        # 모든 활성 사용자 출력
        all_users = User.objects.filter(is_active=True).order_by('name')
        for user in all_users:
            birth_date_str = user.birth_date.strftime('%y%m%d') if user.birth_date else 'N/A'
            self.stdout.write(f"""
👤 {user.name} ({user.role})
   📱 전화번호: {user.phone_number}
   🎂 생년월일: {birth_date_str} (6자리 입력용)
   📧 이메일: {user.email}
   🆔 환자번호: {user.patient_id or 'N/A'}
   ✅ 활성화: {user.is_active}
""")
        
        self.stdout.write('='*50)
        self.stdout.write(self.style.SUCCESS('🔐 로그인 테스트 방법:'))
        self.stdout.write("""
1. 프론트엔드에서 간편 로그인:
   - URL: http://localhost:5174/login
   - 전화번호: 전체 번호 입력 (예: 010-1234-5678)
   - 생년월일: 6자리 입력 (예: 900101)

2. 테스트 계정 정보:
   📱 김환자: 010-1234-5678 / 900101
   📱 이환자: 010-9876-5432 / 850515
   📱 박환자: 010-5555-5555 / 001225
   📱 테스트: 010-9999-9999 / 990909
   📱 관리자: 010-0000-0000 / 800101

3. API 직접 테스트:
   POST /api/v1/auth/simple-login
   {
     "phoneNumber": "010-1234-5678",
     "birthDate": "900101"
   }
""")
        
        self.stdout.write('='*50)
        self.stdout.write(
            self.style.SUCCESS(f'\n✅ 작업 완료! 생성: {created_count}명, 확인: {updated_count}명')
        )