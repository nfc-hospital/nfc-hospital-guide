"""
JWT WebSocket 인증 미들웨어
"""
import jwt
from urllib.parse import parse_qs
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from django.utils import timezone
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from authentication.models import User
import logging

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """
    JWT 토큰을 사용한 WebSocket 인증 미들웨어
    """
    
    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        # WebSocket이 아닌 경우 원래대로 진행
        if scope['type'] != 'websocket':
            return await super().__call__(scope, receive, send)
        
        # DB 연결 정리
        close_old_connections()
        
        try:
            # 쿼리 파라미터에서 토큰 추출
            query_string = scope.get('query_string', b'').decode('utf-8')
            query_params = parse_qs(query_string)
            token = None
            
            # token 파라미터에서 추출
            if 'token' in query_params:
                token = query_params['token'][0]
            
            # Authorization 헤더에서 추출 (HTTP 헤더가 있는 경우)
            headers = dict(scope.get('headers', []))
            if b'authorization' in headers:
                auth_header = headers[b'authorization'].decode('utf-8')
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if token:
                # JWT 토큰 검증
                user = await self.get_user_from_token(token)
                scope['user'] = user
                logger.info(f"WebSocket authenticated user: {user.username if user.is_authenticated else 'Anonymous'}")
            else:
                scope['user'] = AnonymousUser()
                logger.warning("WebSocket connection without token")
                
        except Exception as e:
            logger.error(f"JWT WebSocket auth error: {str(e)}")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    async def get_user_from_token(self, token):
        """JWT 토큰에서 사용자 조회 (jti 클레임 없이)"""
        try:
            # 토큰 직접 디코딩 (UntypedToken 사용 안 함으로써 jti 체크 회피)
            decoded_token = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.SIMPLE_JWT.get('ALGORITHM', 'HS256')]
            )
            
            # 토큰 타입 확인 (선택적)
            token_type = decoded_token.get(settings.SIMPLE_JWT.get('TOKEN_TYPE_CLAIM', 'token_type'))
            if token_type not in ['access', 'refresh']:
                logger.warning(f"Invalid token type: {token_type}")
                return AnonymousUser()
            
            # 사용자 ID 추출
            user_id = decoded_token.get(settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id'))
            if not user_id:
                logger.warning("No user ID in JWT token")
                return AnonymousUser()
            
            # 토큰 만료 시간 확인
            exp = decoded_token.get('exp')
            if exp and exp < int(timezone.now().timestamp()):
                logger.warning("JWT token has expired")
                return AnonymousUser()
            
            # 사용자 조회
            from channels.db import database_sync_to_async
            
            @database_sync_to_async
            def get_user(user_id):
                try:
                    return User.objects.get(user_id=user_id, is_active=True)
                except User.DoesNotExist:
                    return None
            
            user = await get_user(user_id)
            
            if user:
                return user
            else:
                logger.warning(f"User not found or inactive: {user_id}")
                return AnonymousUser()
                
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return AnonymousUser()
        except jwt.DecodeError as e:
            logger.warning(f"Invalid JWT token format: {str(e)}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Unexpected error in JWT auth: {str(e)}")
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    """
    JWT 인증이 포함된 미들웨어 스택
    """
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))