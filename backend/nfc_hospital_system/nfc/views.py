from django.shortcuts import render, get_object_or_404
from django.db import models
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone
from django.db import transaction
import logging

from .models import NFCTag, TagLog, NFCTagExam
from appointments.models import Exam
from .serializers import (
    NFCTagSerializer, NFCTagDetailSerializer, NFCScanRequestSerializer,
    NFCScanResponseSerializer, TagLogSerializer, 
    NFCTagExamDetailSerializer, 
    NFCTagExamMappingRequestSerializer,
    AdminNFCTagCreateSerializer,
    AdminNFCTagUpdateSerializer
)
from appointments.serializers import ExamSerializer 

from nfc_hospital_system.utils import APIResponse
from authentication.models import User

logger = logging.getLogger(__name__)

# 공통 헬퍼 함수
def _check_admin_permission(request):
    """관리자 권한 확인 헬퍼 함수"""
    try:
        admin_user = User.objects.get(user=request.user)
        if admin_user.role not in ['super', 'deft']:
            return False, "관리자 권한이 필요합니다."
        return True, None
    except User.DoesNotExist:
        return False, "관리자 권한이 필요합니다."

# 환자용 API
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def nfc_scan(request):
    """
    NFC 태그 스캔 처리 API - POST /nfc/scan
    
    태그 스캔 시 위치 인식 및 맞춤 안내 제공
    """
    try:
        serializer = NFCScanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="잘못된 요청 데이터입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        tag_id = serializer.validated_data['tag_id']
        action_type = serializer.validated_data.get('action_type', 'scan')
        
        # 태그 ID 또는 UID로 태그 찾기
        tag = None
        try:
            # UUID 형식인 경우 tag_id로 검색
            if len(tag_id) == 36 and '-' in tag_id:
                tag = NFCTag.objects.get(tag_id=tag_id, is_active=True)
            else:
                # 그 외의 경우 tag_uid 또는 code로 검색
                tag = NFCTag.objects.filter(
                    models.Q(tag_uid=tag_id) | models.Q(code=tag_id),
                    is_active=True
                ).first()
        except NFCTag.DoesNotExist:
            pass
        
        if not tag:
            return APIResponse.error(
                message="존재하지 않거나 비활성화된 NFC 태그입니다.",
                code="TAG_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 스캔 로그 생성
        with transaction.atomic():
            scan_log = TagLog.objects.create(
                user=request.user,
                tag=tag,
                action_type=action_type,
                timestamp=serializer.validated_data.get('timestamp', timezone.now())
            )
            
            # 태그의 마지막 스캔 시간 업데이트
            tag.update_scan_time()
        
        # 응답 데이터 구성
        response_data = {
            'tag_info': tag,
            'scan_log_id': scan_log.log_id
        }
        
        # 시리얼라이저로 응답 형식 맞춤
        response_serializer = NFCScanResponseSerializer(response_data)
        
        logger.info(f"NFC scan successful - User: {request.user.user_id}, Tag: {tag.code}")
        
        return APIResponse.success(
            data=response_serializer.data,
            message=f"{tag.get_location_display()} 위치를 확인했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"NFC scan error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="NFC 스캔 처리 중 오류가 발생했습니다.",
            code="SCAN_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_tag_info(request, tag_id):
    """
    태그 위치정보 조회 API - GET /nfc/tags/{tagId}
    
    특정 NFC 태그의 위치 및 연결된 검사/진료 정보
    """
    try:
        # 태그 조회 (tag_id, tag_uid, code 모두 지원)
        tag = None
        try:
            if len(tag_id) == 36 and '-' in tag_id:
                tag = NFCTag.objects.get(tag_id=tag_id, is_active=True)
            else:
                tag = NFCTag.objects.filter(
                    models.Q(tag_uid=tag_id) | models.Q(code=tag_id),
                    is_active=True
                ).first()
        except NFCTag.DoesNotExist:
            pass
            
        if not tag:
            return APIResponse.error(
                message="존재하지 않거나 비활성화된 NFC 태그입니다.",
                code="TAG_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        serializer = NFCTagDetailSerializer(tag)
        
        return APIResponse.success(
            data=serializer.data,
            message="태그 정보를 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Tag info retrieval error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 정보 조회 중 오류가 발생했습니다.",
            code="TAG_INFO_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 관리자용 API

class AdminNFCTagViewSet(ModelViewSet):
    """
    관리자용 NFC 태그 관리 ViewSet
    
    POST /admin/nfc/tags - 태그 등록
    PUT /admin/nfc/tags/{tagId} - 태그 수정
    GET /admin/nfc/tags - 태그 목록 조회
    DELETE /admin/nfc/tags/{tagId} - 태그 비활성화
    """
    queryset = NFCTag.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'tag_id'
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AdminNFCTagCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AdminNFCTagUpdateSerializer
        else:
            return NFCTagDetailSerializer
    
    def get_permissions(self):
        """권한 확인 - 관리자만 접근 가능"""
        permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def check_admin_permission(self):
        """관리자 권한 확인"""
        try:
            admin_user = User.objects.get(user=self.request.user)
            if admin_user.role not in ['super', 'dept']:
                return False, "관리자 권한이 필요합니다."
            return True, None
        except User.DoesNotExist:
            return False, "관리자 권한이 필요합니다."
    
    def create(self, request, *args, **kwargs):
        """새로운 NFC 태그 등록"""
        is_admin, error_msg = self.check_admin_permission()
        if not is_admin:
            return APIResponse.error(
                message=error_msg,
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        try:
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return APIResponse.error(
                    message="유효하지 않은 태그 정보입니다.",
                    details=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            tag = serializer.save()
            response_serializer = NFCTagDetailSerializer(tag)
            
            logger.info(f"NFC tag created - Admin: {request.user.user_id}, Tag: {tag.code}")
            
            return APIResponse.success(
                data=response_serializer.data,
                message="NFC 태그가 성공적으로 등록되었습니다.",
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"NFC tag creation error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="태그 등록 중 오류가 발생했습니다.",
                code="TAG_CREATE_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """NFC 태그 정보 수정"""
        is_admin, error_msg = self.check_admin_permission()
        if not is_admin:
            return APIResponse.error(
                message=error_msg,
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            
            if not serializer.is_valid():
                return APIResponse.error(
                    message="유효하지 않은 태그 정보입니다.",
                    details=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            tag = serializer.save()
            response_serializer = NFCTagDetailSerializer(tag)
            
            logger.info(f"NFC tag updated - Admin: {request.user.user_id}, Tag: {tag.code}")
            
            return APIResponse.success(
                data=response_serializer.data,
                message="NFC 태그 정보가 수정되었습니다.",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"NFC tag update error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="태그 수정 중 오류가 발생했습니다.",
                code="TAG_UPDATE_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """NFC 태그 비활성화 (soft delete)"""
        is_admin, error_msg = self.check_admin_permission()
        if not is_admin:
            return APIResponse.error(
                message=error_msg,
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        try:
            instance = self.get_object()
            instance.is_active = False
            instance.save(update_fields=['is_active'])
            
            logger.info(f"NFC tag deactivated - Admin: {request.user.user_id}, Tag: {instance.code}")
            
            return APIResponse.success(
                message="NFC 태그가 비활성화되었습니다.",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"NFC tag deactivation error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="태그 비활성화 중 오류가 발생했습니다.",
                code="TAG_DELETE_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_tag_exam_mapping(request):
    """
    태그-검사 연결 API - POST /admin/nfc/tag-exam-mapping
    
    NFC 태그와 검사/진료 연결 (1:N 매핑)
    """
    try:
        # 관리자 권한 확인
        try:
            admin_user = User.objects.get(user=request.user)
            if admin_user.role not in ['super', 'dept']:
                return APIResponse.error(
                    message="관리자 권한이 필요합니다.",
                    code="FORBIDDEN",
                    status_code=status.HTTP_403_FORBIDDEN
                )
        except User.DoesNotExist:
            return APIResponse.error(
                message="관리자 권한이 필요합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        serializer = NFCTagExamMappingRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="유효하지 않은 매핑 정보입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        tag_id = serializer.validated_data['tag_id']
        exam_id = serializer.validated_data['exam_id']
        exam_name = serializer.validated_data['exam_name']
        exam_room = serializer.validated_data['exam_room']
        
        # 태그 조회
        tag = get_object_or_404(NFCTag, tag_id=tag_id, is_active=True)
        
        # 기존 매핑 확인 (중복 방지)
        existing_mapping = NFCTagExam.objects.filter(
            tag=tag, exam_id=exam_id, is_active=True
        ).first()
        
        if existing_mapping:
            return APIResponse.error(
                message="이미 연결된 태그-검사 매핑입니다.",
                code="MAPPING_EXISTS",
                status_code=status.HTTP_409_CONFLICT
            )
        
        # 새 매핑 생성
        mapping = NFCTagExam.objects.create(
            tag=tag,
            exam_id=exam_id,
            exam_name=exam_name,
            exam_room=exam_room
        )
        
        response_serializer = NFCTagExamDetailSerializer(mapping)
        
        logger.info(f"Tag-exam mapping created - Admin: {request.user.user_id}, Tag: {tag.code}, Exam: {exam_id}")
        
        return APIResponse.success(
            data=response_serializer.data,
            message="태그-검사 연결이 생성되었습니다.",
            status_code=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        logger.error(f"Tag-exam mapping error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그-검사 연결 중 오류가 발생했습니다.",
            code="MAPPING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 추가: 관리자용 태그 목록 조회
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_tag_list(request):
    """
    관리자용 태그 목록 조회 (페이지네이션 지원)
    """
    try:
        # 관리자 권한 확인
        is_admin, error_msg = _check_admin_permission(request)
        if not is_admin:
            return APIResponse.error(
                message=error_msg,
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # 쿼리 파라미터 처리
        page = int(request.GET.get('page', 1))
        limit = min(int(request.GET.get('limit', 10)), 100)
        is_active = request.GET.get('is_active', 'true').lower() == 'true'
        
        # 태그 목록 조회
        tags = NFCTag.objects.filter(is_active=is_active).order_by('-created_at')
        total_count = tags.count()
        
        # 페이지네이션 처리
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_tags = tags[start_idx:end_idx]
        
        serializer = NFCTagDetailSerializer(page_tags, many=True)
        
        # 페이지네이션 정보 구성
        pagination_info = {
            "currentPage": page,
            "totalPages": (total_count + limit - 1) // limit,
            "totalItems": total_count,
            "hasNext": end_idx < total_count,
            "hasPrev": page > 1
        }
        
        return APIResponse.paginated(
            data=serializer.data,
            pagination_info=pagination_info,
            message="태그 목록을 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Admin tag list error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 목록 조회 중 오류가 발생했습니다.",
            code="TAG_LIST_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
# 검사-태그 매핑 API

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def nfc_tag_exam_mapping_create(request):
    """
    API 명세: POST /tags/mapping
    NFC 태그와 검사 매핑 생성
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )

    try:
        serializer = NFCTagExamMappingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="유효하지 않은 매핑 정보입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        tag_instance = serializer.validated_data['tag']
        exam_instance = serializer.validated_data['exam']

        # 매핑 생성
        mapping = serializer.save() # NFCTagExamMappingCreateSerializer의 create 메서드 호출

        response_serializer = NFCTagExamDetailSerializer(mapping)
        
        logger.info(f"Tag-exam mapping created - Admin: {request.user.user_id}, Tag: {tag_instance.code}, Exam: {exam_instance.exam_id}")
        
        return APIResponse.success(
            data=response_serializer.data,
            message="태그-검사 연결이 성공적으로 생성되었습니다.",
            status_code=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        logger.error(f"Tag-exam mapping creation error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그-검사 연결 중 오류가 발생했습니다.",
            code="MAPPING_CREATE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_tag_exams_list(request, tag_id):
    """
    API 명세: GET /tags/{tagId}/exams
    특정 NFC 태그와 연결된 검사 목록 조회
    """
    try:
        tag = get_object_or_404(NFCTag, tag_id=tag_id, is_active=True)
        
        # 해당 태그에 연결된 활성화된 NFCTagExam 매핑들 조회
        active_mappings = tag.exam_associations.filter(is_active=True).select_related('exam')
        
        # NFCTagExam 객체에서 실제 Exam 객체들을 추출
        exams = [mapping.exam for mapping in active_mappings]
        
        # ExamSerializer를 사용하여 검사 정보 직렬화
        serializer = ExamSerializer(exams, many=True)
        
        return APIResponse.success(
            data=serializer.data,
            message=f"태그 '{tag.code}'에 연결된 검사 목록을 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except NFCTag.DoesNotExist:
        return APIResponse.error(
            message="존재하지 않거나 비활성화된 NFC 태그입니다.",
            code="TAG_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Get tag exams list error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 연결 검사 목록 조회 중 오류가 발생했습니다.",
            code="EXAM_LIST_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_tag_exam_mapping(request, mapping_id):
    """
    API 명세: DELETE /tags/mapping/{mappingId}
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )

    try:
        # mapping_id (NFCTagExam의 PK)로 매핑 객체 조회
        mapping_instance = get_object_or_404(NFCTagExam, id=mapping_id)
        
        # 매핑 비활성화
        mapping_instance.is_active = False
        mapping_instance.save(update_fields=['is_active'])
        
        logger.info(f"Tag-exam mapping deactivated - Admin: {request.user.user_id}, Mapping ID: {mapping_id}")
        
        return APIResponse.success(
            message="태그-검사 매핑이 성공적으로 비활성화되었습니다.",
            status_code=status.HTTP_200_OK 
        )
        
    except NFCTagExam.DoesNotExist:
        return APIResponse.error(
            message="해당 매핑을 찾을 수 없습니다.",
            code="MAPPING_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Tag-exam mapping deletion error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그-검사 매핑 비활성화 중 오류가 발생했습니다.",
            code="MAPPING_DELETE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 기존의 create_tag_exam_mapping 함수는 위에 nfc_tag_exam_mapping_create로 대체되었습니다.
