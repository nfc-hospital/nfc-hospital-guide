# authentication/jwt_auth.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from .models import User
import jwt

class ManualJWTAuthentication(BaseAuthentication):
    """수동 JWT 인증 클래스 - httpOnly 쿠키와 헤더 모두 지원"""
    
    def authenticate(self, request):
        # Authorization 헤더에서 토큰 추출
        auth_header = request.headers.get('Authorization', '')
        
        # 쿠키에서 토큰 확인 (헤더에 없는 경우)
        access_token = None
        if auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
        elif 'access_token' in request.COOKIES:
            access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            return None  # 인증 정보가 없으면 None 반환
        
        # JWT 토큰 검증
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise AuthenticationFailed('유효하지 않은 토큰입니다')
                
            # 토큰 타입 확인
            if payload.get('token_type') != 'access':
                raise AuthenticationFailed('Access 토큰이 아닙니다')
                
            # 사용자 조회
            try:
                user = User.objects.get(user_id=user_id, is_active=True)
            except User.DoesNotExist:
                raise AuthenticationFailed('사용자를 찾을 수 없습니다')
            
            return (user, access_token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('토큰이 만료되었습니다')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('유효하지 않은 토큰입니다')
        except Exception as e:
            raise AuthenticationFailed(f'인증 오류: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'