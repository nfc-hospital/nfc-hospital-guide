# authentication/views.py
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from nfc_hospital_system.utils import APIResponse
from .models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from rest_framework.views import APIView
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator


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
                'token_type': 'access',  # 토큰 타입 추가
                'exp': datetime.utcnow() + timedelta(hours=1),  # 1시간 후 만료
                'iat': datetime.utcnow(),  # 발급 시간
            }
            
            # JWT 토큰 생성
            access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # 리프레시 토큰 (7일)
            refresh_payload = payload.copy()
            refresh_payload['token_type'] = 'refresh'  # 리프레시 토큰 타입 설정
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
            return APIResponse.error(f"카카오 토큰 요청 실패: {token_json}", code="AUTH_002")
        
        # 2. 카카오 사용자 정보 요청
        user_url = "https://kapi.kakao.com/v2/user/me"
        headers = {"Authorization": f"Bearer {token_json['access_token']}"}
        
        user_response = requests.get(user_url, headers=headers)
        user_json = user_response.json()
        
        # 3. 사용자 생성 또는 조회 (실제 필드명에 맞게 수정)
        kakao_id = str(user_json['id'])
        nickname = user_json.get('kakao_account', {}).get('profile', {}).get('nickname', f'user_{kakao_id}')
        
        # 안전한 사용자 찾기/생성
        try:
            # 먼저 기존 카카오 사용자 찾기 (여러 방법으로 시도)
            user = None
            
            # 방법 1: 이름으로 찾기
            user = User.objects.filter(name__startswith=f'카카오_{kakao_id}').first()
            
            # 방법 2: 이메일로 찾기
            if not user:
                user = User.objects.filter(email=f'kakao_{kakao_id}@temp.com').first()
            
            # 방법 3: phoneNumber로 찾기
            if not user:
                user = User.objects.filter(phoneNumber=f'kakao_{kakao_id}').first()
            
            # 사용자가 없으면 새로 생성
            if not user:
                # 고유한 이메일 생성 (타임스탬프 추가)
                import time
                timestamp = int(time.time())
                unique_email = f'kakao_{kakao_id}_{timestamp}@temp.com'
                
                user = User.objects.create(
                    name=f'카카오_{nickname}',
                    phoneNumber=f'kakao_{kakao_id}',
                    birthDate='19900101',
                    email=unique_email,
                )
                
        except Exception as create_error:
            return APIResponse.error(f"카카오 사용자 생성 실패: {str(create_error)}", code="AUTH_006")
        
        # 4. JWT 토큰 생성 (수동으로 생성)
        try:
            import jwt
            from datetime import datetime, timedelta
            
            # UUID를 문자열로 변환
            user_id_str = str(user.pk)  # UUID를 문자열로 변환
            
            # 페이로드 생성
            payload = {
                'user_id': user_id_str,  # 문자열로 변환된 ID 사용
                'name': user.name,
                'token_type': 'access',  # 토큰 타입 추가
                'exp': datetime.utcnow() + timedelta(hours=1),  # 1시간 후 만료
                'iat': datetime.utcnow(),  # 발급 시간
            }
            
            # JWT 토큰 생성
            access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # 리프레시 토큰 (7일)
            refresh_payload = payload.copy()
            refresh_payload['token_type'] = 'refresh'  # 리프레시 토큰 타입 설정
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
    



@csrf_exempt
@require_http_methods(["GET"])
def profile(request):
    """사용자 프로필 조회 - 일반 Django 뷰"""
    try:
        # Authorization 헤더에서 토큰 추출
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({
                "success": False,
                "error": {
                    "code": "AUTH_401",
                    "message": "인증 토큰이 필요합니다"
                }
            }, status=401)
        
        token = auth_header.split(' ')[1]
        
        try:
            import jwt
            from datetime import datetime
            
            # 커스텀 JWT 토큰 디코딩
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
        except jwt.ExpiredSignatureError:
            return JsonResponse({
                "success": False,
                "error": {
                    "code": "AUTH_402", 
                    "message": "토큰이 만료되었습니다"
                }
            }, status=401)
        except jwt.InvalidTokenError as e:
            return JsonResponse({
                "success": False,
                "error": {
                    "code": "AUTH_403",
                    "message": f"유효하지 않은 토큰입니다: {str(e)}"
                }
            }, status=401)
        
        if not user_id:
            return JsonResponse({
                "success": False,
                "error": {
                    "code": "AUTH_404",
                    "message": "토큰에 사용자 정보가 없습니다"
                }
            }, status=400)
        
        # 사용자 정보 조회
        try:
            from uuid import UUID
            user = User.objects.get(pk=UUID(user_id))
        except User.DoesNotExist:
            return JsonResponse({
                "success": False,
                "error": {
                    "code": "AUTH_405",
                    "message": "사용자를 찾을 수 없습니다"
                }
            }, status=404)
        
        return JsonResponse({
            "success": True,
            "data": {
                "user": {
                    "id": str(user.pk),
                    "name": user.name,
                    "phoneNumber": getattr(user, 'phoneNumber', ''),
                }
            },
            "message": "프로필 조회 성공",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": {
                "code": "AUTH_500",
                "message": f"프로필 조회 중 오류: {str(e)}"
            }
        }, status=500)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    """
    CSRF 토큰을 쿠키로 설정하는 엔드포인트.
    이 뷰는 GET 요청에 대해 아무것도 반환하지 않아도 Django가 csrftoken 쿠키를 설정합니다.
    """
    permission_classes = [AllowAny] # 모든 사용자가 접근 가능하도록 설정

    def get(self, request):
        return Response({"success": True, "detail": "CSRF cookie set"})
    


# views.py에 추가할 테스트용 뷰

@api_view(['POST'])
@permission_classes([AllowAny])
def kakao_login_mock(request):
    """카카오 로그인 Mock 테스트 (개발용)"""
    try:
        # 테스트용 사용자 생성
        kakao_id = "test_kakao_123"
        nickname = "테스트사용자"
        
        # 안전한 사용자 찾기/생성
        try:
            user = None
            
            # 방법 1: 이름으로 찾기
            user = User.objects.filter(name__startswith=f'카카오_{kakao_id}').first()
            
            # 방법 2: 이메일로 찾기
            if not user:
                user = User.objects.filter(email=f'kakao_{kakao_id}@temp.com').first()
            
            # 방법 3: phoneNumber로 찾기
            if not user:
                user = User.objects.filter(phoneNumber=f'kakao_{kakao_id}').first()
            
            # 사용자가 없으면 새로 생성
            if not user:
                # 고유한 이메일 생성 (타임스탬프 추가)
                import time
                timestamp = int(time.time())
                unique_email = f'kakao_{kakao_id}_{timestamp}@temp.com'
                
                user = User.objects.create(
                    name=f'카카오_{nickname}',
                    phoneNumber=f'kakao_{kakao_id}',
                    birthDate='19900101',
                    email=unique_email,
                )
                
        except Exception as create_error:
            return APIResponse.error(f"카카오 사용자 생성 실패: {str(create_error)}", code="AUTH_006")
        
        # JWT 토큰 생성
        try:
            import jwt
            from datetime import datetime, timedelta
            
            # UUID를 문자열로 변환
            user_id_str = str(user.pk)
            
            # 페이로드 생성
            payload = {
                'user_id': user_id_str,
                'name': user.name,
                'exp': datetime.utcnow() + timedelta(hours=1),
                'iat': datetime.utcnow(),
            }
            
            # JWT 토큰 생성
            access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # 리프레시 토큰 (7일)
            refresh_payload = payload.copy()
            refresh_payload['token_type'] = 'refresh'  # 리프레시 토큰 타입 설정
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
                "id": str(user.pk),
                "name": user.name,
            },
            "tokens": tokens
        }, message="카카오 로그인 Mock 테스트 성공")
        
    except Exception as e:
        return APIResponse.error(f"카카오 로그인 Mock 테스트 중 오류: {str(e)}", code="AUTH_500")