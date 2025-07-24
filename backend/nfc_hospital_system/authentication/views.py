# authentication/views.py
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from nfc_hospital_system.utils import APIResponse
from .models import User

# 조건부 import
try:
    import requests
except ImportError:
    requests = None

try:
    import jwt
except ImportError:
    jwt = None

@api_view(['POST'])
@permission_classes([AllowAny])
def simple_login(request):
    """간편 로그인 (전화번호 뒷자리 + 생년월일)"""
    try:
        phone_last4 = request.data.get('phoneLast4')
        birth_date = request.data.get('birthDate')
        
        if not phone_last4 or not birth_date:
            return APIResponse.error("전화번호 뒷자리와 생년월일이 필요합니다", code="AUTH_003")
        
        # 단순화된 사용자 찾기/생성
        try:
            # 먼저 기존 사용자 찾기
            user = User.objects.filter(
                phoneNumber__endswith=phone_last4,
                birthDate=birth_date
            ).first()
            
            if not user:
                # 없으면 새로 생성
                user = User.objects.create(
                    name=f'환자{phone_last4}',
                    phoneNumber=f'010****{phone_last4}',
                    birthDate=birth_date,
                )
            
        except Exception as create_error:
            return APIResponse.error(f"사용자 생성 실패: {str(create_error)}", code="AUTH_004")
        
        # JWT 토큰 생성 (수동으로 생성)
        try:
            try:
                import jwt
            except ImportError:
                return APIResponse.error("PyJWT 패키지가 설치되지 않았습니다", code="AUTH_010")
            
            from datetime import datetime, timedelta
            from django.conf import settings
            
            # UUID를 문자열로 변환
            user_id_str = str(user.pk)  # UUID를 문자열로 변환
            
            # 페이로드 생성
            payload = {
                'user_id': user_id_str,  # 문자열로 변환된 ID 사용
                'name': user.name,
                'exp': datetime.utcnow() + timedelta(hours=1),  # 1시간 후 만료
                'iat': datetime.utcnow(),  # 발급 시간
            }
            
            # JWT 토큰 생성
            access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # 리프레시 토큰 (7일)
            refresh_payload = payload.copy()
            refresh_payload['exp'] = datetime.utcnow() + timedelta(days=7)
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            tokens = {
                'refresh': refresh_token,
                'access': access_token,
                'expires_in': 3600,
            }
        except Exception as token_error:
            return APIResponse.error(f"토큰 생성 실패: {str(token_error)}", code="AUTH_005")
        
        # User 모델의 실제 기본키 필드 확인
        user_id = None
        for field_name in ['user_id', 'pk', 'id']:
            if hasattr(user, field_name):
                user_id = getattr(user, field_name)
                break
        
        # 디버깅용: 사용자 객체의 모든 속성 확인
        user_attrs = [attr for attr in dir(user) if not attr.startswith('_')]
        print(f"User 객체 속성들: {user_attrs}")
        print(f"사용자 ID: {user_id}, PK: {user.pk}")
        
        return APIResponse.success({
            "user": {
                "id": str(user.pk),  # UUID를 문자열로 변환
                "name": user.name,
                "phone": phone_last4,  # 디버깅용
            },
            "tokens": tokens
        }, message="간편 로그인 성공")
        
    except Exception as e:
        return APIResponse.error(f"간편 로그인 처리 중 오류: {str(e)}", code="AUTH_500")


@api_view(['POST'])
@permission_classes([AllowAny])
def kakao_login(request):
    """카카오 OAuth 로그인"""
    try:
        code = request.data.get('code')
        if not code:
            return APIResponse.error("인가 코드가 필요합니다", code="AUTH_001")
        
        # 1. 카카오 토큰 요청
        token_url = "https://kauth.kakao.com/oauth/token"
        token_data = {
            "grant_type": "authorization_code",
            "client_id": settings.KAKAO_CLIENT_ID,
            "client_secret": settings.KAKAO_CLIENT_SECRET,
            "redirect_uri": settings.KAKAO_REDIRECT_URI,
            "code": code,
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        if 'access_token' not in token_json:
            return APIResponse.error("카카오 토큰 요청 실패", code="AUTH_002")
        
        # 2. 카카오 사용자 정보 요청
        user_url = "https://kapi.kakao.com/v2/user/me"
        headers = {"Authorization": f"Bearer {token_json['access_token']}"}
        
        user_response = requests.get(user_url, headers=headers)
        user_json = user_response.json()
        
        # 3. 사용자 생성 또는 조회 (실제 필드명에 맞게 수정)
        kakao_id = str(user_json['id'])
        nickname = user_json.get('kakao_account', {}).get('profile', {}).get('nickname', f'user_{kakao_id}')
        
        # kakao_id 필드가 없을 수 있으므로 안전한 방법 사용
        try:
            user = User.objects.filter(name__startswith=f'카카오_{kakao_id}').first()
            if not user:
                user = User.objects.create(
                    name=f'카카오_{nickname}',
                    phoneNumber=f'kakao_{kakao_id}',  # 임시 전화번호
                    # 다른 필수 필드들도 기본값 설정
                )
        except Exception as create_error:
            return APIResponse.error(f"카카오 사용자 생성 실패: {str(create_error)}", code="AUTH_006")
        
        # 4. JWT 토큰 생성 (수동으로 생성)
        try:
            import jwt
            from datetime import datetime, timedelta
            from django.conf import settings
            
            # UUID를 문자열로 변환
            user_id_str = str(user.pk)  # UUID를 문자열로 변환
            
            # 페이로드 생성
            payload = {
                'user_id': user_id_str,  # 문자열로 변환된 ID 사용
                'name': user.name,
                'exp': datetime.utcnow() + timedelta(hours=1),  # 1시간 후 만료
                'iat': datetime.utcnow(),  # 발급 시간
            }
            
            # JWT 토큰 생성
            access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # 리프레시 토큰 (7일)
            refresh_payload = payload.copy()
            refresh_payload['exp'] = datetime.utcnow() + timedelta(days=7)
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            tokens = {
                'refresh': refresh_token,
                'access': access_token,
                'expires_in': 3600,
            }
        except Exception as token_error:
            return APIResponse.error(f"토큰 생성 실패: {str(token_error)}", code="AUTH_007")
        
        return APIResponse.success({
            "user": {
                "id": str(user.pk),  # UUID를 문자열로 변환
                "name": user.name,
            },
            "tokens": tokens
        }, message="카카오 로그인 성공")
        
    except Exception as e:
        return APIResponse.error(f"카카오 로그인 처리 중 오류: {str(e)}", code="AUTH_500")


@api_view(['GET'])
@permission_classes([AllowAny])
def test_view(request):
    """테스트용 뷰"""
    return Response({"message": "테스트 성공!"})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    """로그아웃"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            # 토큰 블랙리스트 처리
            success = JWTUtils.blacklist_token(refresh_token)
            if success:
                return APIResponse.success(message="로그아웃 성공")
            else:
                return APIResponse.error("토큰 무효화 실패", code="AUTH_008")
        else:
            return APIResponse.success(message="로그아웃 성공")
    except Exception as e:
        return APIResponse.error(f"로그아웃 처리 중 오류: {str(e)}", code="AUTH_500")