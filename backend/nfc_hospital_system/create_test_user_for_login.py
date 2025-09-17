#!/usr/bin/env python
"""
테스트 사용자 생성 스크립트
로그인 테스트를 위한 사용자 생성
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from authentication.models import User
from django.utils import timezone
from datetime import datetime

def create_test_users():
    """로그인 테스트용 사용자 생성"""
    
    test_users = [
        {
            'email': 'test1@example.com',
            'name': '김환자',
            'phone_number': '010-1234-5678',
            'birth_date': '1990-01-01',
            'password': 'test1234',
            'role': 'patient'
        },
        {
            'email': 'test2@example.com',
            'name': '이환자',
            'phone_number': '010-9876-5432',
            'birth_date': '1985-05-15',
            'password': 'test1234',
            'role': 'patient'
        },
        {
            'email': 'test3@example.com',
            'name': '박환자',
            'phone_number': '010-5555-5555',
            'birth_date': '2000-12-25',
            'password': 'test1234',
            'role': 'patient'
        },
        {
            'email': 'admin@hospital.com',
            'name': '관리자',
            'phone_number': '010-0000-0000',
            'birth_date': '1980-01-01',
            'password': 'admin1234',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True
        }
    ]
    
    created_users = []
    
    for user_data in test_users:
        try:
            # 이미 존재하는지 확인
            existing_user = User.objects.filter(
                phone_number=user_data['phone_number']
            ).first()
            
            if existing_user:
                print(f"✅ 사용자 이미 존재: {user_data['name']} ({user_data['phone_number']})")
                created_users.append(existing_user)
            else:
                # 새 사용자 생성
                password = user_data.pop('password')
                is_staff = user_data.pop('is_staff', False)
                is_superuser = user_data.pop('is_superuser', False)
                
                user = User.objects.create(
                    **user_data,
                    is_active=True,
                    is_staff=is_staff,
                    is_superuser=is_superuser
                )
                
                # 비밀번호 설정
                user.set_password(password)
                user.save()
                
                print(f"✨ 새 사용자 생성: {user.name} ({user.phone_number})")
                created_users.append(user)
                
        except Exception as e:
            print(f"❌ 사용자 생성 실패: {user_data['name']} - {str(e)}")
    
    print("\n" + "="*50)
    print("📋 테스트 사용자 목록")
    print("="*50)
    
    for user in created_users:
        birth_date_str = user.birth_date.strftime('%y%m%d') if user.birth_date else 'N/A'
        print(f"""
👤 {user.name} ({user.role})
   📱 전화번호: {user.phone_number}
   🎂 생년월일: {birth_date_str} (입력용)
   📧 이메일: {user.email}
   ✅ 활성화: {user.is_active}
""")
    
    print("="*50)
    print("🔐 로그인 방법:")
    print("1. 간편 로그인:")
    print("   - 전화번호: 전체 번호 입력 (예: 010-1234-5678)")
    print("   - 생년월일: 6자리 입력 (예: 900101)")
    print("\n2. 테스트 계정:")
    print("   - 김환자: 010-1234-5678 / 900101")
    print("   - 이환자: 010-9876-5432 / 850515")
    print("   - 박환자: 010-5555-5555 / 001225")
    print("   - 관리자: 010-0000-0000 / 800101")
    print("="*50)
    
    return created_users

def check_existing_users():
    """기존 사용자 확인"""
    users = User.objects.all()
    
    if users.exists():
        print("\n📌 현재 등록된 사용자:")
        print("-"*50)
        for user in users:
            birth_date_str = user.birth_date.strftime('%y%m%d') if user.birth_date else 'N/A'
            print(f"   {user.name}: {user.phone_number} / {birth_date_str} ({user.role})")
    else:
        print("\n⚠️ 등록된 사용자가 없습니다.")
    
    return users.count()

if __name__ == '__main__':
    print("🏥 NFC 병원 시스템 - 테스트 사용자 생성")
    print("="*50)
    
    # 기존 사용자 확인
    existing_count = check_existing_users()
    
    if existing_count > 0:
        response = input("\n새로운 테스트 사용자를 추가하시겠습니까? (y/n): ")
        if response.lower() != 'y':
            print("👋 종료합니다.")
            sys.exit(0)
    
    # 테스트 사용자 생성
    created_users = create_test_users()
    
    print("\n✅ 작업 완료!")
    print(f"총 {len(created_users)}명의 사용자가 준비되었습니다.")