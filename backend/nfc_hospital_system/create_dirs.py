"""
필요한 디렉토리 생성 스크립트
"""
import os
from pathlib import Path

# 기본 디렉토리
BASE_DIR = Path(__file__).resolve().parent

# 생성할 디렉토리 목록
directories = [
    'logs',
    'media',
    'static',
    'staticfiles',
    'templates',
]

for directory in directories:
    dir_path = BASE_DIR / directory
    if not dir_path.exists():
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {directory}")
    else:
        print(f"ℹ️  Directory already exists: {directory}")

# logs 디렉토리에 빈 로그 파일 생성
log_file = BASE_DIR / 'logs' / 'django.log'
if not log_file.exists():
    log_file.touch()
    print("✅ Created log file: logs/django.log")

print("\n✨ All directories created successfully!")