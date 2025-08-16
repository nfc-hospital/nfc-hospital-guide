# authentication/management/commands/create_test_user.py
from django.core.management.base import BaseCommand
from authentication.models import User
from datetime import datetime


class Command(BaseCommand):
    help = 'Cypress 테스트용 사용자 생성'

    def handle(self, *args, **options):
        # 테스트 사용자 정보
        phone_number = '010-1234-5678'
        birth_date = datetime.strptime('19900101', '%Y%m%d').date()
        
        # 기존 사용자 확인
        existing_user = User.objects.filter(
            phone_number=phone_number,
            birth_date=birth_date
        ).first()
        
        if existing_user:
            self.stdout.write(self.style.SUCCESS(
                f'테스트 사용자가 이미 존재합니다: {existing_user.name} (ID: {existing_user.pk})'
            ))
            return
        
        # 새 사용자 생성
        try:
            user = User.objects.create(
                name='테스트환자5678',
                phone_number=phone_number,
                birth_date=birth_date,
                email=f'test5678@example.com',
                role='patient'
            )
            
            self.stdout.write(self.style.SUCCESS(
                f'테스트 사용자가 생성되었습니다: {user.name} (ID: {user.pk})'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'전화번호: {phone_number}'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'생년월일: {birth_date} (입력시 900101)'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'테스트 사용자 생성 실패: {str(e)}'
            ))