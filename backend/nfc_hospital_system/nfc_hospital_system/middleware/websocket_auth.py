# WebSocket JWT 인증 미들웨어
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import jwt
from django.conf import settings
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token_key):
    """JWT 토큰에서 사용자 조회"""
    try:
        # JWT 토큰 검증
        UntypedToken(token_key)
        decoded_data = jwt.decode(token_key, settings.SECRET_KEY, algorithms=["HS256"])
        
        # 사용자 조회
        from authentication.models import User
        user = User.objects.get(user_id=decoded_data["user_id"])
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware:
    """JWT 토큰 기반 WebSocket 인증 미들웨어"""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # 데이터베이스 연결 정리
        close_old_connections()
        
        # 기본값: 익명 사용자
        scope['user'] = AnonymousUser()
        
        print(f"WebSocket connection attempt: {scope.get('path', 'unknown')}")
        print(f"Headers: {dict(scope.get('headers', []))}")
        print(f"Query string: {scope.get('query_string', b'').decode()}")
        
        try:
            # URL 쿼리 파라미터에서 토큰 추출
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            
            if 'token' in query_params:
                token_key = query_params['token'][0]
                print(f"Token found in query params: {token_key[:20]}...")
                scope['user'] = await get_user_from_token(token_key)
            
            # 헤더에서 토큰 추출 (fallback)
            elif 'headers' in scope:
                headers = dict(scope['headers'])
                if b'authorization' in headers:
                    auth_header = headers[b'authorization'].decode()
                    if auth_header.startswith('Bearer '):
                        token_key = auth_header.split(' ')[1]
                        print(f"Token found in headers: {token_key[:20]}...")
                        scope['user'] = await get_user_from_token(token_key)
            
            print(f"User authenticated: {scope['user'].is_authenticated}")
                        
        except Exception as e:
            print(f"WebSocket auth error: {e}")
            # 오류 시 익명 사용자 유지
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """JWT 인증이 포함된 미들웨어 스택"""
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))