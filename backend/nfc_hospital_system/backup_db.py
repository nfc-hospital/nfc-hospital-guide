#!/usr/bin/env python
"""
데이터베이스 백업 스크립트
마이그레이션 전 안전을 위한 백업 생성
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
    
    if db_config['ENGINE'] == 'django.db.backends.mysql':
        # MySQL 백업 명령
        command = [
            'mysqldump',
            '-h', db_config['HOST'],
            '-P', str(db_config.get('PORT', 3306)),
            '-u', db_config['USER'],
            f'-p{db_config["PASSWORD"]}',
            db_config['NAME'],
            '--single-transaction',
            '--routines',
            '--triggers',
            '--add-drop-table',
            '--complete-insert',
            '--extended-insert',
            '--result-file', str(backup_path)
        ]
        
        print(f"🔵 MySQL 데이터베이스 백업 시작...")
        print(f"   호스트: {db_config['HOST']}")
        print(f"   데이터베이스: {db_config['NAME']}")
        print(f"   백업 파일: {backup_path}")
        
        try:
            # mysqldump 실행
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                print(f"✅ 백업 성공: {backup_path}")
                print(f"   파일 크기: {backup_path.stat().st_size / 1024 / 1024:.2f} MB")
                return str(backup_path)
            else:
                print(f"❌ 백업 실패: {result.stderr}")
                return None
                
        except FileNotFoundError:
            print("❌ mysqldump 명령을 찾을 수 없습니다.")
            print("   MySQL 클라이언트가 설치되어 있는지 확인하세요.")
            return None
        except Exception as e:
            print(f"❌ 백업 중 오류 발생: {e}")
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


def list_recent_backups():
    """최근 백업 목록 표시"""
    backup_dir = Path('backups')
    if not backup_dir.exists():
        return
    
    backups = list(backup_dir.glob('*.sql')) + list(backup_dir.glob('*.db'))
    backups.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    if backups:
        print("\n📁 최근 백업 목록:")
        for backup in backups[:5]:
            size_mb = backup.stat().st_size / 1024 / 1024
            modified = datetime.datetime.fromtimestamp(backup.stat().st_mtime)
            print(f"   • {backup.name} ({size_mb:.2f} MB) - {modified}")


def main():
    """메인 함수"""
    print("=" * 60)
    print("🔧 NFC Hospital System - 데이터베이스 백업")
    print("=" * 60)
    
    # 확인 프롬프트
    response = input("\n데이터베이스를 백업하시겠습니까? (y/n): ")
    if response.lower() != 'y':
        print("백업을 취소했습니다.")
        return
    
    # 백업 실행
    backup_file = create_backup()
    
    if backup_file:
        print("\n" + "=" * 60)
        print("✅ 백업 완료!")
        print(f"   백업 파일: {backup_file}")
        print("   이제 안전하게 마이그레이션을 진행할 수 있습니다.")
        print("=" * 60)
        
        # 최근 백업 목록 표시
        list_recent_backups()
    else:
        print("\n❌ 백업에 실패했습니다.")
        print("   마이그레이션을 진행하기 전에 수동으로 백업하세요.")


if __name__ == '__main__':
    main()