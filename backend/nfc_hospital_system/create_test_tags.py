#!/usr/bin/env python
"""테스트용 NFC 태그 생성 스크립트"""

import os
import sys
import django
from pathlib import Path

# Django 설정
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from nfc.models import NFCTag
import uuid

def create_test_nfc_tags():
    """테스트용 NFC 태그 생성"""
    
    test_tags = [
        {
            'code': 'NFC001',
            'tag_uid': 'test_uid_001', 
            'building': '본관',
            'floor': 1,
            'room': '응급의료센터',
            'x_coord': 180,
            'y_coord': 190,
            'description': '본관 1층 응급의료센터 앞'
        },
        {
            'code': 'NFC002',
            'tag_uid': 'test_uid_002',
            'building': '본관', 
            'floor': 1,
            'room': '진단검사의학과',
            'x_coord': 480,
            'y_coord': 160,
            'description': '본관 1층 진단검사의학과 앞'
        },
        {
            'code': 'NFC003',
            'tag_uid': 'test_uid_003',
            'building': '본관',
            'floor': 1,
            'room': '약국',
            'x_coord': 530,
            'y_coord': 320,
            'description': '본관 1층 약국 앞'
        },
        {
            'code': 'NFC004', 
            'tag_uid': 'test_uid_004',
            'building': '본관',
            'floor': 1,
            'room': '엘리베이터',
            'x_coord': 355,
            'y_coord': 355,
            'description': '본관 1층 엘리베이터 앞'
        },
        {
            'code': 'NFC005',
            'tag_uid': 'test_uid_005',
            'building': '본관',
            'floor': 2,
            'room': '내과 대기실',
            'x_coord': 450,
            'y_coord': 140,
            'description': '본관 2층 내과 대기실 앞'
        }
    ]
    
    created_count = 0
    for tag_data in test_tags:
        tag, created = NFCTag.objects.get_or_create(
            code=tag_data['code'],
            defaults=tag_data
        )
        if created:
            print(f'✅ NFC 태그 생성: {tag.code} - {tag.building} {tag.room}')
            created_count += 1
        else:
            print(f'ℹ️  NFC 태그 이미 존재: {tag.code} - {tag.building} {tag.room}')
    
    total_tags = NFCTag.objects.count()
    print(f'\n📊 총 NFC 태그 수: {total_tags}')
    print(f'🆕 새로 생성된 태그: {created_count}')
    
    # 활성화된 태그 목록 출력
    active_tags = NFCTag.objects.filter(is_active=True)
    print(f'\n🟢 활성화된 태그 목록:')
    for tag in active_tags:
        print(f'   {tag.code}: {tag.building} {tag.room} ({tag.x_coord}, {tag.y_coord})')

if __name__ == '__main__':
    create_test_nfc_tags()