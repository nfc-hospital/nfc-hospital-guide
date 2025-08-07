@echo off
echo ========================================
echo  Django ASGI Server with Daphne
echo  WebSocket 지원을 위한 ASGI 서버 실행
echo ========================================
cd /d C:\Users\jyhne\Desktop\hywu\hanium\nfc-hospital-guide\backend\nfc_hospital_system

echo 가상환경 활성화 중...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo ✅ 가상환경 활성화됨
) else (
    echo ⚠️  가상환경을 찾을 수 없습니다. 직접 실행합니다.
)

echo.
echo 🚀 Daphne ASGI 서버 시작 중...
echo    - HTTP: http://localhost:8000
echo    - WebSocket: ws://localhost:8000/ws/
echo    - Admin: http://localhost:8000/admin/
echo.

daphne -b 0.0.0.0 -p 8000 nfc_hospital_system.asgi:application

echo.
echo ❌ 서버가 중단되었습니다.
pause