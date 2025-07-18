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

REM .env 파일 생성 (manage.py와 같은 레벨)
if not exist .env (
    echo 🔐 .env 파일 생성...
    echo DJANGO_ENVIRONMENT=development >> .env
    echo SECRET_KEY=django-insecure-change-this-key >> .env
    echo DEBUG=True >> .env
    echo. >> .env
    echo JWT_SECRET_KEY=jwt-secret-key-here >> .env
    echo. >> .env
    echo AWS_DB_NAME=nfc_hospital >> .env
    echo AWS_DB_USER=admin >> .env
    echo AWS_DB_PASSWORD=your-rds-password >> .env
    echo AWS_DB_HOST=your-rds-endpoint.amazonaws.com >> .env
    echo AWS_DB_PORT=3306 >> .env
    echo. >> .env
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