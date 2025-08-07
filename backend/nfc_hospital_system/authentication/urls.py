# authentication/urls.py
from django.urls import path
from .views import CSRFTokenView, simple_login, kakao_login, logout, profile, kakao_login_mock
from . import views

# JWT Token views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('test/', views.test_view, name='test'),
    path('simple-login/', views.simple_login, name='simple-login'),
    path('kakao/', views.kakao_login, name='kakao-login'),
    path('logout/', views.logout, name='logout'),  
    path('profile/', views.profile, name='profile'),
    path('kakao-mock/', views.kakao_login_mock, name='kakao_login_mock'),
    path('csrf-token/', CSRFTokenView.as_view(), name='csrf_token'),
    
    # JWT 토큰 관리
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
