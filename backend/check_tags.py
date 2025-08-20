#!/usr/bin/env python
import os
import sys
import django

# Django 설정
sys.path.append('/mnt/d/2025/nfc-hospital-guide/backend/nfc_hospital_system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from nfc.models import NFCTag

# 모든 태그 확인
tags = NFCTag.objects.all()
print(f"총 태그 수: {tags.count()}")
print("-" * 50)

for tag in tags[:10]:  # 처음 10개만 출력
    print(f"Tag ID: {tag.tag_id}")
    print(f"Code: {tag.code}")
    print(f"UID: {tag.tag_uid}")
    print(f"Location: {tag.get_location_display()}")
    print(f"Active: {tag.is_active}")
    print("-" * 50)

# 특정 코드로 태그 검색
test_codes = ['nfc-xray-001', 'nfc-ct-001', 'nfc-mri-001']
print("\n특정 코드로 태그 검색:")
for code in test_codes:
    try:
        tag = NFCTag.objects.get(code=code)
        print(f"✓ {code}: 존재함 - {tag.get_location_display()}")
    except NFCTag.DoesNotExist:
        print(f"✗ {code}: 존재하지 않음")