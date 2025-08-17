@echo off
echo ====================================
echo Updating chatbot packages...
echo ====================================

cd /d "%~dp0"

echo.
echo Upgrading pip...
venv\Scripts\python.exe -m pip install --upgrade pip

echo.
echo Uninstalling old openai package...
venv\Scripts\pip.exe uninstall -y openai

echo.
echo Installing updated packages...
venv\Scripts\pip.exe install -r requirements.txt

echo.
echo ====================================
echo Package update complete!
echo ====================================
pause