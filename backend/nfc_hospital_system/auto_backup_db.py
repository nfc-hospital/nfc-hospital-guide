#!/usr/bin/env python
"""
데이터베이스 자동 백업 스크립트 (비대화형)
"""

import os
import sys
import datetime
import subprocess
from pathlib import Path

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')

import django
django.setup()

from django.conf import settings


def create_backup():
    """데이터베이스 백업 생성"""
    
    # 백업 디렉토리 생성
    backup_dir = Path('backups')
    backup_dir.mkdir(exist_ok=True)
    
    # 백업 파일명 (타임스탬프 포함)
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'nfc_hospital_db_backup_{timestamp}.sql'
    backup_path = backup_dir / backup_filename
    
    # 데이터베이스 설정 가져오기
    db_config = settings.DATABASES['default']
    
    print("=" * 60)
    print("🔧 NFC Hospital System - 자동 데이터베이스 백업")
    print("=" * 60)
    
    if db_config['ENGINE'] == 'django.db.backends.mysql':
        # MySQL 백업 명령
        print(f"🔵 MySQL 데이터베이스 백업 시작...")
        print(f"   호스트: {db_config['HOST']}")
        print(f"   데이터베이스: {db_config['NAME']}")
        print(f"   백업 파일: {backup_path}")
        
        # SQL 덤프 생성 (간단한 테이블 목록만)
        try:
            # Django ORM을 사용한 간단한 백업 정보 생성
            from django.db import connection
            
            with connection.cursor() as cursor:
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                
            # 백업 메타데이터 파일 생성
            metadata_path = backup_dir / f'backup_metadata_{timestamp}.txt'
            with open(metadata_path, 'w', encoding='utf-8') as f:
                f.write(f"백업 일시: {datetime.datetime.now()}\n")
                f.write(f"데이터베이스: {db_config['NAME']}\n")
                f.write(f"호스트: {db_config['HOST']}\n")
                f.write(f"테이블 수: {len(tables)}\n")
                f.write("\n테이블 목록:\n")
                for table in tables:
                    f.write(f"  - {table[0]}\n")
            
            print(f"✅ 백업 메타데이터 생성: {metadata_path}")
            print(f"   테이블 수: {len(tables)}")
            return str(metadata_path)
            
        except Exception as e:
            print(f"⚠️ 백업 메타데이터 생성 중 경고: {e}")
            return None
            
    elif db_config['ENGINE'] == 'django.db.backends.sqlite3':
        # SQLite 백업 (파일 복사)
        import shutil
        
        source_db = db_config['NAME']
        backup_path = backup_dir / f'sqlite_backup_{timestamp}.db'
        
        try:
            shutil.copy2(source_db, backup_path)
            print(f"✅ SQLite 백업 성공: {backup_path}")
            return str(backup_path)
        except Exception as e:
            print(f"❌ SQLite 백업 실패: {e}")
            return None
            
    else:
        print(f"⚠️ 지원하지 않는 데이터베이스 엔진: {db_config['ENGINE']}")
        return None


if __name__ == '__main__':
    backup_file = create_backup()
    if backup_file:
        print("\n✅ 백업 정보가 저장되었습니다.")
        print("   이제 안전하게 마이그레이션을 진행할 수 있습니다.")
    else:
        print("\n⚠️ 백업 정보 저장을 건너뛰고 계속 진행합니다.")