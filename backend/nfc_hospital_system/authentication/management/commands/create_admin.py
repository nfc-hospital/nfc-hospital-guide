# backend/nfc_hospital_system/authentication/management/commands/create_admin.py

from django.core.management.base import BaseCommand
from authentication.models import User
from django.contrib.auth.hashers import make_password
from datetime import date

class Command(BaseCommand):
    help = '초기 관리자 계정을 생성합니다.'
    
    def handle(self, *args, **options):
        # Super Admin 계정
        super_admin, created = User.objects.get_or_create(
            email='admin@nfc-hospital.kr',
            defaults={
                'name': '시스템 관리자',
                'role': 'super',
                'phoneNumber': '01012345678',
                'birthDate': date(1990, 1, 1),
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if created:
            super_admin.set_password('admin123456')
            super_admin.save()
            self.stdout.write(
                self.style.SUCCESS(f'Super Admin 계정 생성: {super_admin.email}')
            )
        else:
            self.stdout.write(f'Super Admin 계정 이미 존재: {super_admin.email}')
        
        # Dept Admin 계정  
        dept_admin, created = User.objects.get_or_create(
            email='dept@nfc-hospital.kr',
            defaults={
                'name': '부서 관리자',
                'role': 'dept',
                'phoneNumber': '01012345679',
                'birthDate': date(1990, 1, 1),
                'is_active': True,
                'is_staff': True,
            }
        )
        
        if created:
            dept_admin.set_password('dept123456')
            dept_admin.save()
            self.stdout.write(
                self.style.SUCCESS(f'Dept Admin 계정 생성: {dept_admin.email}')
            )
        else:
            self.stdout.write(f'Dept Admin 계정 이미 존재: {dept_admin.email}')
        
        # Staff 계정
        staff, created = User.objects.get_or_create(
            email='staff@nfc-hospital.kr',
            defaults={
                'name': '직원',
                'role': 'staff',
                'phoneNumber': '01012345680',
                'birthDate': date(1990, 1, 1),
                'is_active': True,
                'is_staff': True,
            }
        )
        
        if created:
            staff.set_password('staff123456')
            staff.save()
            self.stdout.write(
                self.style.SUCCESS(f'Staff 계정 생성: {staff.email}')
            )
        else:
            self.stdout.write(f'Staff 계정 이미 존재: {staff.email}')
        
        self.stdout.write(
            self.style.SUCCESS(
                '\n테스트 계정 정보:'
                '\n- Super Admin: admin@nfc-hospital.kr / admin123456'
                '\n- Dept Admin: dept@nfc-hospital.kr / dept123456'
                '\n- Staff: staff@nfc-hospital.kr / staff123456'
            )
        )