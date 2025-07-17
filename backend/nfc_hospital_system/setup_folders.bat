@echo off
echo 🏗️ Django 프로젝트 폴더 구조 생성 중...

REM 현재 위치 확인 (manage.py가 있는 폴더)
if not exist manage.py (
    echo ❌ 에러: manage.py가 없습니다. manage.py가 있는 폴더에서 실행하세요.
    pause
    exit /b 1
)

REM Django 프로젝트 필수 폴더 생성
echo 📁 Django 프로젝트 기본 폴더 생성...
mkdir logs 2>nul
mkdir static 2>nul
mkdir staticfiles 2>nul
mkdir media 2>nul
mkdir templates 2>nul

REM 로그 폴더에 .gitkeep 파일 생성
echo # 로그 파일이 저장되는 폴더입니다 > logs\README.md

REM 각 앱의 추가 파일 생성 (이미 존재하는 앱들)
for %%a in (authentication nfc appointments p_queue admin_dashboard) do (
    if exist %%a (
        echo 📂 %%a 앱 추가 파일 생성...
        
        REM urls.py 파일이 없으면 생성
        if not exist %%a\urls.py (
            echo # %%a 앱 URL 설정 > %%a\urls.py
            echo from django.urls import path >> %%a\urls.py
            echo from . import views >> %%a\urls.py
            echo. >> %%a\urls.py
            echo urlpatterns = [ >> %%a\urls.py
            echo     # TODO: URL 패턴 추가 >> %%a\urls.py
            echo ] >> %%a\urls.py
        )
        
        REM serializers.py 파일이 없으면 생성
        if not exist %%a\serializers.py (
            echo # %%a 앱 시리얼라이저 > %%a\serializers.py
            echo from rest_framework import serializers >> %%a\serializers.py
            echo. >> %%a\serializers.py
            echo # TODO: 시리얼라이저 클래스 추가 >> %%a\serializers.py
        )
        
        REM permissions.py 파일이 없으면 생성
        if not exist %%a\permissions.py (
            echo # %%a 앱 권한 설정 > %%a\permissions.py
            echo from rest_framework import permissions >> %%a\permissions.py
            echo. >> %%a\permissions.py
            echo # TODO: 커스텀 권한 클래스 추가 >> %%a\permissions.py
        )
        
        REM tests 폴더 및 테스트 파일 생성
        mkdir %%a\tests 2>nul
        if not exist %%a\tests\__init__.py (
            echo # %%a 앱 테스트 패키지 > %%a\tests\__init__.py
        )
        if not exist %%a\tests\test_models.py (
            echo # %%a 앱 모델 테스트 > %%a\tests\test_models.py
            echo from django.test import TestCase >> %%a\tests\test_models.py
            echo. >> %%a\tests\test_models.py
            echo # TODO: 모델 테스트 추가 >> %%a\tests\test_models.py
        )
        if not exist %%a\tests\test_views.py (
            echo # %%a 앱 뷰 테스트 > %%a\tests\test_views.py
            echo from django.test import TestCase >> %%a\tests\test_views.py
            echo from django.urls import reverse >> %%a\tests\test_views.py
            echo. >> %%a\tests\test_views.py
            echo # TODO: 뷰 테스트 추가 >> %%a\tests\test_views.py
        )
        if not exist %%a\tests\test_api.py (
            echo # %%a 앱 API 테스트 > %%a\tests\test_api.py
            echo from rest_framework.test import APITestCase >> %%a\tests\test_api.py
            echo from rest_framework import status >> %%a\tests\test_api.py
            echo. >> %%a\tests\test_api.py
            echo # TODO: API 테스트 추가 >> %%a\tests\test_api.py
        )
        
        REM templates 폴더 생성 (앱별)
        mkdir %%a\templates\%%a 2>nul
        
        REM static 폴더 생성 (앱별)
        mkdir %%a\static\%%a 2>nul
        
    ) else (
        echo ⚠️  %%a 앱이 존재하지 않습니다. 건너뜁니다...
    )
)

REM utils.py 파일 생성 (manage.py와 같은 레벨)
if not exist utils.py (
    echo 🔧 utils.py 파일 생성...
    echo # Django 공통 유틸리티 함수들 > utils.py
    echo from rest_framework.response import Response >> utils.py
    echo from rest_framework import status >> utils.py
    echo from django.utils import timezone >> utils.py
    echo. >> utils.py
    echo class APIResponse: >> utils.py
    echo     """API 응답 표준화 클래스""" >> utils.py
    echo     @staticmethod >> utils.py
    echo     def success(data=None, message="Success"): >> utils.py
    echo         return Response({ >> utils.py
    echo             'success': True, >> utils.py
    echo             'data': data or {}, >> utils.py
    echo             'message': message, >> utils.py
    echo             'timestamp': timezone.now().isoformat() >> utils.py
    echo         }) >> utils.py
)

REM requirements.txt 파일 생성 (manage.py와 같은 레벨)
if not exist requirements.txt (
    echo 📦 requirements.txt 파일 생성...
    echo Django==4.2.7 > requirements.txt
    echo djangorestframework==3.14.0 >> requirements.txt
    echo djangorestframework-simplejwt==5.3.0 >> requirements.txt
    echo django-cors-headers==4.3.1 >> requirements.txt
    echo python-decouple==3.8 >> requirements.txt
    echo mysqlclient==2.2.0 >> requirements.txt
    echo redis==5.0.1 >> requirements.txt
    echo django-redis==5.4.0 >> requirements.txt
    echo channels==4.0.0 >> requirements.txt
    echo channels-redis==4.1.0 >> requirements.txt
    echo cryptography==41.0.7 >> requirements.txt
    echo drf-spectacular==0.26.5 >> requirements.txt
    echo Pillow==10.1.0 >> requirements.txt
    echo requests==2.31.0 >> requirements.txt
)

REM .env 파일 생성 (manage.py와 같은 레벨)
if not exist .env (
    echo 🔐 .env 파일 생성...
    echo # Django 환경 설정 > .env
    echo DJANGO_ENVIRONMENT=development >> .env
    echo SECRET_KEY=django-insecure-change-this-key >> .env
    echo DEBUG=True >> .env
    echo. >> .env
    echo # JWT 설정 >> .env
    echo JWT_SECRET_KEY=jwt-secret-key-here >> .env
    echo. >> .env
    echo # AWS RDS MySQL 설정 >> .env
    echo AWS_DB_NAME=nfc_hospital >> .env
    echo AWS_DB_USER=admin >> .env
    echo AWS_DB_PASSWORD=your-rds-password >> .env
    echo AWS_DB_HOST=your-rds-endpoint.amazonaws.com >> .env
    echo AWS_DB_PORT=3306 >> .env
    echo. >> .env
    echo # CORS 설정 >> .env
    echo CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173 >> .env
)

REM gitignore 업데이트 (manage.py와 같은 레벨)
echo. >> .gitignore
echo # Django 프로젝트 파일 >> .gitignore
echo logs/ >> .gitignore
echo media/ >> .gitignore
echo staticfiles/ >> .gitignore
echo db.sqlite3 >> .gitignore
echo .env >> .gitignore
echo __pycache__/ >> .gitignore
echo *.pyc >> .gitignore
echo .coverage >> .gitignore
echo htmlcov/ >> .gitignore
echo venv/ >> .gitignore
echo .vscode/ >> .gitignore
echo .idea/ >> .gitignore

echo ✅ 폴더 구조 생성 완료!
echo 📍 현재 위치: %CD%
echo 📋 다음 단계:
echo    1. .env 파일 수정 (AWS RDS 정보 입력)
echo    2. pip install -r requirements.txt
echo    3. python manage.py makemigrations
echo    4. python manage.py migrate
echo    5. python manage.py runserver
pause