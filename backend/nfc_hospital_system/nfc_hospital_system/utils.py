# backend/nfc_hospital_system/utils.py
from django.utils import timezone
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    API 명세서에 맞는 커스텀 예외 핸들러
    모든 응답을 {"success": boolean, "data": {}, "error": {}} 형태로 통일
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'success': False,
            'data': {},
            'error': {
                'code': response.status_code,
                'message': str(exc),
                'details': response.data if hasattr(response, 'data') else {}
            },
            'timestamp': timezone.now().isoformat()
        }
        
        # 로그 기록
        logger.error(f"API Error: {exc} - Context: {context}")
        
        response.data = custom_response_data
    
    return response


class APIResponse:
    """
    API 명세서에 맞는 표준 응답 클래스
    """
    @staticmethod
    def success(data=None, message="Success", status_code=status.HTTP_200_OK):
        """성공 응답"""
        return Response({
            'success': True,
            'data': data if data is not None else {},
            'message': message,
            'timestamp': timezone.now().isoformat()
        }, status=status_code)
    
    @staticmethod
    def error(message="Error", code=None, details=None, status_code=status.HTTP_400_BAD_REQUEST):
        """에러 응답"""
        return Response({
            'success': False,
            'data': {},
            'error': {
                'code': code or status_code,
                'message': message,
                'details': details or {}
            },
            'timestamp': timezone.now().isoformat()
        }, status=status_code)
    
    @staticmethod
    def paginated(data, pagination_info, message="Success"):
        """페이지네이션 응답"""
        return Response({
            'success': True,
            'data': {
                'items': data,
                'pagination': pagination_info
            },
            'message': message,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


# JWT 토큰 유틸리티
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

class JWTUtils:
    """JWT 토큰 관련 유틸리티"""
    
    @staticmethod
    def generate_tokens(user):
        """사용자를 위한 JWT 토큰 생성"""
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'expires_in': 3600,  # 1시간 (초 단위)
        }
    
    @staticmethod
    def blacklist_token(refresh_token):
        """토큰 블랙리스트 처리"""
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return True
        except Exception as e:
            logger.error(f"Token blacklist failed: {e}")
            return False


# 권한 확인 데코레이터
from functools import wraps
from django.http import JsonResponse

def admin_required(roles=['super', 'dept']):
    """관리자 권한 확인 데코레이터"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request.user, 'adminuser'):
                return JsonResponse({
                    'success': False,
                    'error': {
                        'code': 403,
                        'message': '관리자 권한이 필요합니다.'
                    }
                }, status=403)
            
            if request.user.adminuser.role not in roles:
                return JsonResponse({
                    'success': False,
                    'error': {
                        'code': 403,
                        'message': f'필요 권한: {", ".join(roles)}'
                    }
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# NFC 태그 유틸리티
import hashlib
import secrets

class NFCUtils:
    """NFC 태그 관련 유틸리티"""
    
    @staticmethod
    def generate_tag_id():
        """고유한 NFC 태그 ID 생성"""
        return f"nfc_{secrets.token_hex(8)}"
    
    @staticmethod
    def validate_tag_format(tag_id):
        """NFC 태그 ID 형식 검증"""
        if not tag_id or len(tag_id) < 8:
            return False
        return tag_id.startswith('nfc_') or tag_id.isalnum()
    
    @staticmethod
    def generate_qr_code_url(tag_id, base_url="https://hospital.example.com"):
        """QR 코드용 URL 생성"""
        return f"{base_url}/nfc/{tag_id}"


# 데이터 암호화 유틸리티
from cryptography.fernet import Fernet
from django.conf import settings
import base64

class EncryptionUtils:
    """개인정보 암호화 유틸리티"""
    
    @staticmethod
    def get_cipher():
        """암호화 키 생성/획득"""
        key = settings.SECRET_KEY.encode()[:32]  # 32바이트로 제한
        key = base64.urlsafe_b64encode(key.ljust(32, b'0'))
        return Fernet(key)
    
    @staticmethod
    def encrypt_data(data):
        """데이터 암호화"""
        if not data:
            return data
        cipher = EncryptionUtils.get_cipher()
        return cipher.encrypt(data.encode()).decode()
    
    @staticmethod
    def decrypt_data(encrypted_data):
        """데이터 복호화"""
        if not encrypted_data:
            return encrypted_data
        try:
            cipher = EncryptionUtils.get_cipher()
            return cipher.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None


# 전화번호 유틸리티
import re

class PhoneUtils:
    """전화번호 관련 유틸리티"""
    
    @staticmethod
    def normalize_phone(phone):
        """전화번호 정규화 (010-1234-5678 -> 01012345678)"""
        if not phone:
            return None
        return re.sub(r'[^0-9]', '', phone)
    
    @staticmethod
    def validate_phone(phone):
        """한국 휴대폰 번호 검증"""
        normalized = PhoneUtils.normalize_phone(phone)
        if not normalized:
            return False
        return re.match(r'^01[016789]\d{7,8}', normalized) is not None
    
    @staticmethod
    def mask_phone(phone):
        """전화번호 마스킹 (010-1234-5678 -> 010-****-5678)"""
        if not phone or len(phone) < 8:
            return phone
        normalized = PhoneUtils.normalize_phone(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-****-{normalized[7:]}"
        return phone


# 시간 유틸리티
from django.utils import timezone
from datetime import datetime, timedelta

class TimeUtils:
    """시간 관련 유틸리티"""
    
    @staticmethod
    def get_today_range():
        """오늘 0시~23시59분 범위 반환"""
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1) - timedelta(microseconds=1)
        return start, end
    
    @staticmethod
    def format_waiting_time(minutes):
        """대기시간을 사용자 친화적 형태로 변환"""
        if minutes < 1:
            return "곧 차례입니다"
        elif minutes < 60:
            return f"약 {minutes}분 대기"
        else:
            hours = minutes // 60
            remaining_minutes = minutes % 60
            if remaining_minutes == 0:
                return f"약 {hours}시간 대기"
            else:
                return f"약 {hours}시간 {remaining_minutes}분 대기"
    
    @staticmethod
    def get_business_hours():
        """병원 운영시간 확인"""
        now = timezone.now()
        weekday = now.weekday()  # 0=월요일, 6=일요일
        hour = now.hour
        
        # 기본 운영시간: 평일 9-18시, 토요일 9-13시, 일요일 휴무
        if weekday == 6:  # 일요일
            return False, "일요일은 휴무입니다"
        elif weekday == 5:  # 토요일
            if 9 <= hour < 13:
                return True, "운영 중"
            else:
                return False, "토요일 운영시간: 09:00-13:00"
        else:  # 평일
            if 9 <= hour < 18:
                return True, "운영 중"
            else:
                return False, "평일 운영시간: 09:00-18:00"