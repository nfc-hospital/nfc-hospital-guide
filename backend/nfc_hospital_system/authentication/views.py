# authentication/views.py
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from nfc_hospital_system.utils import APIResponse
from .models import User
# 제거된 import: JsonResponse, csrf_exempt, require_http_methods, json (더 이상 사용하지 않음)
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
    """간편 로그인 (전화번호 뒷자리 + 생년월일)
    
    자동 로그인 옵션을 선택하면 refresh 토큰을 httpOnly 쿠키에 저장
    """
    try:
        phone_number = request.data.get('phoneNumber')  # 전체 전화번호
        birth_date = request.data.get('birthDate')
        
        if not phone_number or not birth_date:
            return APIResponse.error("전화번호와 생년월일이 필요합니다", code="AUTH_003")
        
        # 전화번호 형식 검증 (010-xxxx-xxxx)
        import re
        phone_pattern = re.compile(r'^[0-9]{3}-[0-9]{4}-[0-9]{4}$')
        if not phone_pattern.match(phone_number):
            return APIResponse.error("올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)", code="AUTH_003")
        
        # birthDate 형식 변환: YYMMDD -> YYYY-MM-DD
        if len(birth_date) == 6:  # YYMMDD 형식인 경우
            yy = birth_date[:2]
            mm = birth_date[2:4]
            dd = birth_date[4:6]
            # 90년대생은 19xx, 00년대생은 20xx로 가정
            year_prefix = '19' if int(yy) >= 90 else '20'
            birth_date_formatted = f"{year_prefix}{yy}-{mm}-{dd}"
        else:
            birth_date_formatted = birth_date
        
        # 기존 사용자 찾기만 허용 (자동 생성 비활성화)
        try:
            user = User.objects.filter(
                phone_number=phone_number,
                birth_date=birth_date_formatted
            ).first()
            
            if not user:
                return APIResponse.error("등록되지 않은 사용자입니다. 병원 접수처에서 등록 후 이용해주세요.", code="AUTH_USER_NOT_FOUND")
            
        except Exception as lookup_error:
            return APIResponse.error(f"사용자 조회 실패: {str(lookup_error)}", code="AUTH_004")
        
        # JWT 토큰 생성 (수동 방식)
        try:
            if not jwt:
                return APIResponse.error("JWT 모듈이 설치되지 않았습니다", code="AUTH_005")
                
            # 토큰 페이로드 생성
            now = datetime.utcnow()
            access_payload = {
                'user_id': str(user.user_id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'token_type': 'access',
                'exp': now + timedelta(hours=1),  # 1시간 만료
                'iat': now,
            }
            
            refresh_payload = {
                'user_id': str(user.user_id),
                'token_type': 'refresh',
                'exp': now + timedelta(days=7),  # 7일 만료
                'iat': now,
            }
            
            # 토큰 생성
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            tokens = {
                'access': access_token,
                'refresh': refresh_token,
                'expires_in': 3600,
            }
        except Exception as token_error:
            return APIResponse.error(f"토큰 생성 실패: {str(token_error)}", code="AUTH_005")
        
        # last_login 업데이트
        from django.utils import timezone
        current_time = timezone.now()
        user.last_login = current_time
        user.last_login_at = current_time
        user.save(update_fields=['last_login', 'last_login_at'])
        
        # PatientState 생성 또는 업데이트
        from p_queue.models import PatientState
        patient_state, created = PatientState.objects.get_or_create(
            user=user,
            defaults={
                'current_state': 'ARRIVED',  # 로그인 시 기본적으로 ARRIVED 상태
                'is_logged_in': True
            }
        )
        
        # 이미 존재하는 경우 is_logged_in만 업데이트
        if not created:
            patient_state.is_logged_in = True
            # 상태가 UNREGISTERED인 경우에만 ARRIVED로 변경
            if patient_state.current_state == 'UNREGISTERED':
                patient_state.current_state = 'ARRIVED'
            patient_state.save()
        
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
        
        # 자동 로그인 옵션 확인
        remember_me = request.data.get('rememberMe', False)
        
        # 응답 생성
        response_data = {
            "user": {
                "id": str(user.pk),  # UUID를 문자열로 변환
                "name": user.name,
                "phone": phone_number.split('-')[-1] if '-' in phone_number else phone_number[-4:],  # 뒷자리 4자리만 반환
            },
            "tokens": tokens
        }
        
        response = APIResponse.success(response_data, message="간편 로그인 성공")
        
        # 자동 로그인이 선택된 경우 httpOnly 쿠키 설정
        if remember_me:
            # refresh 토큰을 httpOnly 쿠키에 저장
            response.set_cookie(
                key='refresh_token',
                value=tokens['refresh'],
                max_age=60 * 60 * 24 * 7,  # 7일
                httponly=True,
                secure=True if not settings.DEBUG else False,  # 운영 환경에서는 HTTPS만
                samesite='Lax',
                path='/'
            )
            
            # access 토큰도 httpOnly 쿠키에 저장 (선택사항)
            response.set_cookie(
                key='access_token',
                value=tokens['access'],
                max_age=60 * 60,  # 1시간
                httponly=True,
                secure=True if not settings.DEBUG else False,
                samesite='Lax',
                path='/'
            )
        
        return response
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"간편 로그인 오류 상세: {error_detail}")
        return APIResponse.error(f"간편 로그인 처리 중 오류: {str(e)}", code="AUTH_500", data={"detail": str(e)})


@api_view(['POST'])
@permission_classes([AllowAny])
def kakao_login(request):
    """카카오 OAuth 로그인
    
    자동 로그인 옵션을 선택하면 refresh 토큰을 httpOnly 쿠키에 저장
    """
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
        
        # 3. 기존 사용자 조회만 허용 (자동 생성 비활성화)
        kakao_id = str(user_json['id'])
        
        # 기존 카카오 사용자 찾기만 허용
        try:
            user = None
            
            # 방법 1: 이름으로 찾기
            user = User.objects.filter(name__startswith=f'카카오_{kakao_id}').first()
            
            # 방법 2: 이메일로 찾기
            if not user:
                user = User.objects.filter(email__icontains=f'kakao_{kakao_id}').first()
            
            # 방법 3: phoneNumber로 찾기
            if not user:
                user = User.objects.filter(phone_number=f'kakao_{kakao_id}').first()
            
            # 사용자가 없으면 에러 반환
            if not user:
                return APIResponse.error("카카오 계정이 병원 시스템에 등록되지 않았습니다. 병원 접수처에서 계정 연동 후 이용해주세요.", code="AUTH_KAKAO_NOT_REGISTERED")
                
        except Exception as lookup_error:
            return APIResponse.error(f"카카오 사용자 조회 실패: {str(lookup_error)}", code="AUTH_006")
        
        # 4. JWT 토큰 생성 (수동 방식)
        try:
            if not jwt:
                return APIResponse.error("JWT 모듈이 설치되지 않았습니다", code="AUTH_007")
                
            # 토큰 페이로드 생성
            now = datetime.utcnow()
            access_payload = {
                'user_id': str(user.user_id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'token_type': 'access',
                'exp': now + timedelta(hours=1),  # 1시간 만료
                'iat': now,
            }
            
            refresh_payload = {
                'user_id': str(user.user_id),
                'token_type': 'refresh',
                'exp': now + timedelta(days=7),  # 7일 만료
                'iat': now,
            }
            
            # 토큰 생성
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            tokens = {
                'access': access_token,
                'refresh': refresh_token,
                'expires_in': 3600,
            }
        except Exception as token_error:
            return APIResponse.error(f"토큰 생성 실패: {str(token_error)}", code="AUTH_007")
        
        # last_login 업데이트
        from django.utils import timezone
        current_time = timezone.now()
        user.last_login = current_time
        user.last_login_at = current_time
        user.save(update_fields=['last_login', 'last_login_at'])
        
        # PatientState 생성 또는 업데이트
        from p_queue.models import PatientState
        patient_state, created = PatientState.objects.get_or_create(
            user=user,
            defaults={
                'current_state': 'ARRIVED',  # 로그인 시 기본적으로 ARRIVED 상태
                'is_logged_in': True
            }
        )
        
        # 이미 존재하는 경우 is_logged_in만 업데이트
        if not created:
            patient_state.is_logged_in = True
            # 상태가 UNREGISTERED인 경우에만 ARRIVED로 변경
            if patient_state.current_state == 'UNREGISTERED':
                patient_state.current_state = 'ARRIVED'
            patient_state.save()
        
        # 자동 로그인 옵션 확인
        remember_me = request.data.get('rememberMe', False)
        
        # 응답 생성
        response_data = {
            "user": {
                "id": str(user.pk),  # UUID를 문자열로 변환
                "name": user.name,
            },
            "tokens": tokens
        }
        
        response = APIResponse.success(response_data, message="카카오 로그인 성공")
        
        # 자동 로그인이 선택된 경우 httpOnly 쿠키 설정
        if remember_me:
            # refresh 토큰을 httpOnly 쿠키에 저장
            response.set_cookie(
                key='refresh_token',
                value=tokens['refresh'],
                max_age=60 * 60 * 24 * 7,  # 7일
                httponly=True,
                secure=True if not settings.DEBUG else False,  # 운영 환경에서는 HTTPS만
                samesite='Lax',
                path='/'
            )
            
            # access 토큰도 httpOnly 쿠키에 저장 (선택사항)
            response.set_cookie(
                key='access_token',
                value=tokens['access'],
                max_age=60 * 60,  # 1시간
                httponly=True,
                secure=True if not settings.DEBUG else False,
                samesite='Lax',
                path='/'
            )
        
        return response
        
    except Exception as e:
        return APIResponse.error(f"카카오 로그인 처리 중 오류: {str(e)}", code="AUTH_500")


@api_view(['GET'])
@permission_classes([AllowAny])
def test_view(request):
    """테스트용 뷰"""
    return Response({"message": "테스트 성공!"})


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """토큰 갱신 - refresh 토큰을 사용하여 새로운 access 토큰 발급"""
    try:
        # refresh 토큰 추출 (request body 또는 쿠키에서)
        refresh_token = request.data.get('refresh_token')
        if not refresh_token and 'refresh_token' in request.COOKIES:
            refresh_token = request.COOKIES.get('refresh_token')
            
        if not refresh_token:
            return APIResponse.error("Refresh 토큰이 필요합니다", code="AUTH_406")
            
        # refresh 토큰 검증
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # 토큰 타입 확인
            if payload.get('token_type') != 'refresh':
                return APIResponse.error("유효하지 않은 refresh 토큰입니다", code="AUTH_407")
                
            user_id = payload.get('user_id')
            if not user_id:
                return APIResponse.error("유효하지 않은 토큰입니다", code="AUTH_408")
                
            # 사용자 조회
            user = User.objects.get(user_id=user_id, is_active=True)
            
            # 새로운 access 토큰 생성
            now = datetime.utcnow()
            access_payload = {
                'user_id': str(user.user_id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'token_type': 'access',
                'exp': now + timedelta(hours=1),  # 1시간 만료
                'iat': now,
            }
            
            new_access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            
            response_data = {
                "access": new_access_token,
                "expires_in": 3600,
            }
            
            response = APIResponse.success(response_data, message="토큰 갱신 성공")
            
            # access_token 쿠키가 있었다면 갱신
            if 'access_token' in request.COOKIES:
                response.set_cookie(
                    key='access_token',
                    value=new_access_token,
                    max_age=60 * 60,  # 1시간
                    httponly=True,
                    secure=True if not settings.DEBUG else False,
                    samesite='Lax',
                    path='/'
                )
            
            return response
            
        except jwt.ExpiredSignatureError:
            return APIResponse.error("Refresh 토큰이 만료되었습니다", code="AUTH_409")
        except jwt.InvalidTokenError:
            return APIResponse.error("유효하지 않은 refresh 토큰입니다", code="AUTH_410")
        except User.DoesNotExist:
            return APIResponse.error("사용자를 찾을 수 없습니다", code="AUTH_411")
            
    except Exception as e:
        return APIResponse.error(f"토큰 갱신 중 오류: {str(e)}", code="AUTH_500")


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    """로그아웃 - 쿠키 삭제"""
    try:
        response = APIResponse.success(message="로그아웃 성공")
        
        # httpOnly 쿠키 삭제
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        
        return response
    except Exception as e:
        return APIResponse.error(f"로그아웃 처리 중 오류: {str(e)}", code="AUTH_500")
    



@api_view(['GET'])
@permission_classes([AllowAny])  # JWT를 수동으로 검증할 것이므로 AllowAny
def profile(request):
    """사용자 프로필 조회 - 수동 JWT 검증"""
    try:
        # Authorization 헤더에서 토큰 추출
        auth_header = request.headers.get('Authorization', '')
        
        # 쿠키에서 토큰 확인 (헤더에 없는 경우)
        access_token = None
        if auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
        elif 'access_token' in request.COOKIES:
            access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            return APIResponse.error("인증 토큰이 필요합니다", code="AUTH_401")
        
        # JWT 토큰 검증
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                return APIResponse.error("유효하지 않은 토큰입니다", code="AUTH_402")
                
            # 사용자 조회
            user = User.objects.get(user_id=user_id, is_active=True)
            
        except jwt.ExpiredSignatureError:
            return APIResponse.error("토큰이 만료되었습니다", code="AUTH_403")
        except jwt.InvalidTokenError:
            return APIResponse.error("유효하지 않은 토큰입니다", code="AUTH_404")
        except User.DoesNotExist:
            return APIResponse.error("사용자를 찾을 수 없습니다", code="AUTH_405")
        
        # ProfileSerializer를 사용하여 사용자 정보 직렬화
        from .serializers import ProfileSerializer
        serializer = ProfileSerializer(user)
        
        return APIResponse.success({
            "user": serializer.data
        }, message="프로필 조회 성공")
        
    except Exception as e:
        return APIResponse.error(f"프로필 조회 중 오류: {str(e)}", code="AUTH_500")

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    """
    CSRF 토큰을 쿠키로 설정하는 엔드포인트.
    이 뷰는 GET 요청에 대해 아무것도 반환하지 않아도 Django가 csrftoken 쿠키를 설정합니다.
    """
    permission_classes = [AllowAny] # 모든 사용자가 접근 가능하도록 설정

    def get(self, request):
        return Response({"success": True, "detail": "CSRF cookie set"})


@api_view(['POST'])
@permission_classes([AllowAny])
def kakao_login_mock(request):
    """카카오 로그인 Mock 테스트 (개발용)"""
    try:
        # 테스트용 사용자 생성
        kakao_id = "test_kakao_123"
        nickname = "테스트사용자"
        
        # 기존 카카오 사용자 찾기만 허용 (자동 생성 비활성화)
        try:
            user = None
            
            # 방법 1: 이름으로 찾기
            user = User.objects.filter(name__startswith=f'카카오_{kakao_id}').first()
            
            # 방법 2: 이메일로 찾기
            if not user:
                user = User.objects.filter(email__icontains=f'kakao_{kakao_id}').first()
            
            # 방법 3: phone_number로 찾기
            if not user:
                user = User.objects.filter(phone_number=f'kakao_{kakao_id}').first()
            
            # 사용자가 없으면 에러 반환
            if not user:
                return APIResponse.error("카카오 계정이 병원 시스템에 등록되지 않았습니다. Mock 테스트는 비활성화되었습니다.", code="AUTH_KAKAO_MOCK_DISABLED")
                
        except Exception as lookup_error:
            return APIResponse.error(f"카카오 사용자 조회 실패: {str(lookup_error)}", code="AUTH_006")
        
        # JWT 토큰 생성 (수동 방식)
        try:
            if not jwt:
                return APIResponse.error("JWT 모듈이 설치되지 않았습니다", code="AUTH_007")
                
            # 토큰 페이로드 생성
            now = datetime.utcnow()
            access_payload = {
                'user_id': str(user.user_id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'token_type': 'access',
                'exp': now + timedelta(hours=1),  # 1시간 만료
                'iat': now,
            }
            
            refresh_payload = {
                'user_id': str(user.user_id),
                'token_type': 'refresh',
                'exp': now + timedelta(days=7),  # 7일 만료
                'iat': now,
            }
            
            # 토큰 생성
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            tokens = {
                'access': access_token,
                'refresh': refresh_token,
                'expires_in': 3600,
            }
        except Exception as token_error:
            return APIResponse.error(f"토큰 생성 실패: {str(token_error)}", code="AUTH_007")
        
        # last_login 업데이트
        from django.utils import timezone
        current_time = timezone.now()
        user.last_login = current_time
        user.last_login_at = current_time
        user.save(update_fields=['last_login', 'last_login_at'])
        
        # PatientState 생성 또는 업데이트
        from p_queue.models import PatientState
        patient_state, created = PatientState.objects.get_or_create(
            user=user,
            defaults={
                'current_state': 'ARRIVED',  # 로그인 시 기본적으로 ARRIVED 상태
                'is_logged_in': True
            }
        )
        
        # 이미 존재하는 경우 is_logged_in만 업데이트
        if not created:
            patient_state.is_logged_in = True
            # 상태가 UNREGISTERED인 경우에만 ARRIVED로 변경
            if patient_state.current_state == 'UNREGISTERED':
                patient_state.current_state = 'ARRIVED'
            patient_state.save()
        
        return APIResponse.success({
            "user": {
                "id": str(user.pk),
                "name": user.name,
            },
            "tokens": tokens
        }, message="카카오 로그인 Mock 테스트 성공")
        
    except Exception as e:
        return APIResponse.error(f"카카오 로그인 Mock 테스트 중 오류: {str(e)}", code="AUTH_500")