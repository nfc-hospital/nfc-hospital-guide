#!/usr/bin/env python
"""테이블 생성 확인 스크립트"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SHOW TABLES")
    all_tables = cursor.fetchall()
    
    print("\n🔍 Navigation 관련 테이블:")
    print("=" * 50)
    
    navigation_tables = []
    for table in all_tables:
        table_name = table[0]
        if 'navigation' in table_name or 'hospital_map' in table_name or 'route' in table_name:
            navigation_tables.append(table_name)
            print(f"  ✅ {table_name}")
    
    if navigation_tables:
        print(f"\n총 {len(navigation_tables)}개의 navigation 관련 테이블이 생성되었습니다.")
    else:
        print("  ❌ Navigation 관련 테이블을 찾을 수 없습니다.")
    
    print("\n📋 전체 테이블 목록:")
    print("=" * 50)
    for table in all_tables:
        print(f"  • {table[0]}")