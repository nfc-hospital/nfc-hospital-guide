@echo off
echo 패키지 설치 시작...
call venv\Scripts\activate
pip install --upgrade pip
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers python-decouple pymysql cryptography django-debug-toolbar PyJWT pillow requests channels channels-redis redis daphne
echo 패키지 설치 완료!
pause