from django.shortcuts import render, get_object_or_404
from django.db import models
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
import logging

from .models import NFCTag, TagLog, NFCTagExam
from appointments.models import Exam
from p_queue.models import Queue, PatientState
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
from datetime import datetime, timedelta
from django.db.models import Count, Q, Avg, Max, Min

logger = logging.getLogger(__name__)

# 공통 헬퍼 함수
def _check_admin_permission(request):
    """관리자 권한 확인 헬퍼 함수"""
    admin_user = request.user
    if not hasattr(admin_user, 'role') or admin_user.role not in ['super', 'dept']:
        return False, "관리자 권한이 필요합니다."
    return True, None

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
    
    def get_queryset(self):
        """필터링을 지원하는 쿼리셋 반환"""
        queryset = super().get_queryset()
        
        # 디버깅: 쿼리 파라미터 출력
        logger.info(f"Query params: {self.request.query_params}")
        
        # is_active 필터
        is_active = self.request.query_params.get('is_active', None)
        logger.info(f"is_active filter: {is_active}")
        
        if is_active is not None and is_active != '':
            if is_active.lower() == 'true':
                queryset = queryset.filter(is_active=True)
                logger.info(f"Filtering active tags, count: {queryset.count()}")
            elif is_active.lower() == 'false':
                queryset = queryset.filter(is_active=False)
                logger.info(f"Filtering inactive tags, count: {queryset.count()}")
        
        # search 필터
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                models.Q(code__icontains=search) |
                models.Q(location__icontains=search) |
                models.Q(description__icontains=search)
            )
            logger.info(f"Search filter applied: {search}")
        
        # location 필터
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(location__icontains=location)
            logger.info(f"Location filter applied: {location}")
        
        logger.info(f"Final queryset count: {queryset.count()}")
        return queryset.order_by('-created_at')
    
    def check_admin_permission(self):
        """관리자 권한 확인"""
        try:
            admin_user = self.request.user
            if not hasattr(admin_user, 'role') or admin_user.role not in ['super', 'dept']:
                return False, "관리자 권한이 필요합니다."
            return True, None
        except Exception as e:
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
        admin_user = request.user
        if admin_user.role not in ['super', 'dept']:
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
        is_active_param = request.GET.get('is_active', 'true')
        
        # 태그 목록 조회
        if is_active_param == '':  # 전체
            tags = NFCTag.objects.all()
        else:
            is_active = is_active_param.lower() == 'true'
            tags = NFCTag.objects.filter(is_active=is_active)
        
        tags = tags.order_by('-created_at')
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
        serializer = NFCTagExamMappingRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="유효하지 않은 매핑 정보입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        tag_instance = serializer.validated_data['tag']
        exam_instance = serializer.validated_data['exam']

        # 매핑 생성
        mapping = serializer.save()  # NFCTagExamMappingRequestSerializer의 create 메서드 호출

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

# 기존의 create_tag_exam_mapping 함수는 위에 nfc_tag_exam_mapping_create로 대체

# 태그 관리 추가 API

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_tag_operation(request):
    """
    대량 태그 작업 API - POST /admin/nfc/tags/bulk
    
    다중 태그 일괄 등록/수정/활성화/비활성화
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        operation = request.data.get('operation')  # create, update, activate, deactivate
        tag_ids = request.data.get('tag_ids', [])
        tag_data = request.data.get('tag_data', {})
        
        if operation not in ['create', 'update', 'activate', 'deactivate']:
            return APIResponse.error(
                message="유효하지 않은 작업입니다.",
                code="INVALID_OPERATION",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        results = {'success': [], 'failed': []}
        
        with transaction.atomic():
            if operation == 'create':
                # 대량 태그 생성
                tags_to_create = request.data.get('tags', [])
                for tag_info in tags_to_create:
                    try:
                        serializer = AdminNFCTagCreateSerializer(data=tag_info)
                        if serializer.is_valid():
                            tag = serializer.save()
                            results['success'].append({
                                'tag_id': str(tag.tag_id),
                                'code': tag.code
                            })
                        else:
                            results['failed'].append({
                                'data': tag_info,
                                'errors': serializer.errors
                            })
                    except Exception as e:
                        results['failed'].append({
                            'data': tag_info,
                            'error': str(e)
                        })
            
            elif operation in ['activate', 'deactivate']:
                # 대량 활성화/비활성화
                is_active = operation == 'activate'
                updated = NFCTag.objects.filter(tag_id__in=tag_ids).update(
                    is_active=is_active
                )
                results['success'] = {
                    'updated_count': updated,
                    'operation': operation
                }
            
            elif operation == 'update':
                # 대량 업데이트
                for tag_id in tag_ids:
                    try:
                        tag = NFCTag.objects.get(tag_id=tag_id)
                        serializer = AdminNFCTagUpdateSerializer(
                            tag, data=tag_data, partial=True
                        )
                        if serializer.is_valid():
                            serializer.save()
                            results['success'].append(tag_id)
                        else:
                            results['failed'].append({
                                'tag_id': tag_id,
                                'errors': serializer.errors
                            })
                    except NFCTag.DoesNotExist:
                        results['failed'].append({
                            'tag_id': tag_id,
                            'error': '태그를 찾을 수 없습니다.'
                        })
        
        logger.info(f"Bulk tag operation - Admin: {request.user.user_id}, Operation: {operation}")
        
        return APIResponse.success(
            data=results,
            message=f"대량 태그 {operation} 작업이 완료되었습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Bulk tag operation error: {str(e)}", exc_info=True)
        logger.error(f"Request data: {request.data}")
        logger.error(f"Operation: {operation if 'operation' in locals() else 'Unknown'}")
        logger.error(f"Tag IDs: {tag_ids if 'tag_ids' in locals() else 'Unknown'}")
        return APIResponse.error(
            message="대량 태그 작업 중 오류가 발생했습니다.",
            code="BULK_OPERATION_ERROR",
            details={"error": str(e), "operation": operation if 'operation' in locals() else None},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tag_usage_statistics(request):
    """
    태그 사용 통계 API - GET /admin/nfc/tags/statistics
    
    태그별 스캔 횟수, 오류율, 마지막 사용 시간 등
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 쿼리 파라미터
        start_date = request.GET.get('startDate')
        end_date = request.GET.get('endDate')
        tag_id = request.GET.get('tagId')
        location = request.GET.get('location')
        
        # 기본 쿼리셋
        tags_query = NFCTag.objects.filter(is_active=True)
        logs_query = TagLog.objects.all()
        
        # 날짜 필터링
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            logs_query = logs_query.filter(timestamp__gte=start_date)
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            logs_query = logs_query.filter(timestamp__lte=end_date)
        
        # 특정 태그 필터링
        if tag_id:
            tags_query = tags_query.filter(tag_id=tag_id)
            logs_query = logs_query.filter(tag__tag_id=tag_id)
        
        # 위치 필터링
        if location:
            tags_query = tags_query.filter(location=location)
        
        # 태그별 통계 집계
        tag_stats = []
        for tag in tags_query:
            tag_logs = logs_query.filter(tag=tag)
            total_scans = tag_logs.count()
            error_scans = tag_logs.filter(action_type='error').count()
            
            stats = {
                'tagId': str(tag.tag_id),
                'code': tag.code,
                'location': tag.get_location_display(),
                'totalScans': total_scans,
                'errorRate': (error_scans / total_scans * 100) if total_scans > 0 else 0,
                'lastScanTime': tag.last_scanned_at.isoformat() if tag.last_scanned_at else None,
                'averageScansPerDay': 0,
                'peakHour': None
            }
            
            # 일평균 스캔 계산
            if total_scans > 0 and start_date and end_date:
                days_diff = (end_date - start_date).days or 1
                stats['averageScansPerDay'] = round(total_scans / days_diff, 2)
            
            # 피크 시간대 계산
            hourly_scans = tag_logs.extra(
                select={'hour': "EXTRACT(hour FROM timestamp)"}
            ).values('hour').annotate(count=Count('log_id')).order_by('-count').first()
            
            if hourly_scans:
                stats['peakHour'] = int(hourly_scans['hour'])
            
            tag_stats.append(stats)
        
        # 전체 통계
        overall_stats = {
            'totalTags': tags_query.count(),
            'totalScans': logs_query.count(),
            'averageErrorRate': tag_stats and sum(t['errorRate'] for t in tag_stats) / len(tag_stats) or 0,
            'mostUsedTags': sorted(tag_stats, key=lambda x: x['totalScans'], reverse=True)[:5],
            'leastUsedTags': sorted(tag_stats, key=lambda x: x['totalScans'])[:5]
        }
        
        return APIResponse.success(
            data={
                'statistics': tag_stats,
                'summary': overall_stats
            },
            message="태그 사용 통계를 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Tag usage statistics error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 사용 통계 조회 중 오류가 발생했습니다.",
            code="STATISTICS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tag_status_monitoring(request):
    """
    태그 상태 모니터링 API - GET /admin/tags/status
    
    실시간 태그 상태 및 이상 징후 감지
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 임계값 설정
        inactive_threshold = timezone.now() - timedelta(days=7)  # 7일간 미사용
        high_error_threshold = 10  # 오류율 10% 이상
        
        # 문제 태그 감지
        all_tags = NFCTag.objects.filter(is_active=True)
        problem_tags = []
        healthy_tags = []
        
        for tag in all_tags:
            recent_logs = TagLog.objects.filter(
                tag=tag,
                timestamp__gte=timezone.now() - timedelta(days=7)
            )
            total_recent = recent_logs.count()
            error_recent = recent_logs.filter(action_type='error').count()
            
            tag_status = {
                'tagId': str(tag.tag_id),
                'code': tag.code,
                'location': tag.get_location_display(),
                'status': 'healthy',
                'issues': []
            }
            
            # 장기간 미사용 체크
            if not tag.last_scanned_at or tag.last_scanned_at < inactive_threshold:
                tag_status['status'] = 'warning'
                tag_status['issues'].append({
                    'type': 'inactive',
                    'message': '7일 이상 사용되지 않음',
                    'severity': 'medium'
                })
            
            # 높은 오류율 체크
            if total_recent > 0:
                error_rate = (error_recent / total_recent) * 100
                if error_rate >= high_error_threshold:
                    tag_status['status'] = 'error'
                    tag_status['issues'].append({
                        'type': 'high_error_rate',
                        'message': f'오류율 {error_rate:.1f}%',
                        'severity': 'high'
                    })
            
            # 배터리 수명 체크 (추후 하드웨어 연동 시 구현)
            # if tag.battery_level and tag.battery_level < 20:
            #     tag_status['issues'].append({
            #         'type': 'low_battery',
            #         'message': f'배터리 {tag.battery_level}%',
            #         'severity': 'medium'
            #     })
            
            if tag_status['issues']:
                problem_tags.append(tag_status)
            else:
                healthy_tags.append(tag_status)
        
        # 요약 정보
        summary = {
            'totalTags': all_tags.count(),
            'healthyCount': len(healthy_tags),
            'warningCount': len([t for t in problem_tags if t['status'] == 'warning']),
            'errorCount': len([t for t in problem_tags if t['status'] == 'error']),
            'lastCheckTime': timezone.now().isoformat()
        }
        
        return APIResponse.success(
            data={
                'summary': summary,
                'problemTags': problem_tags,
                'healthyTags': healthy_tags[:10]  # 건강한 태그는 10개만 표시
            },
            message="태그 상태 모니터링 정보를 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Tag status monitoring error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 상태 모니터링 중 오류가 발생했습니다.",
            code="MONITORING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tag_assignment_history(request, tag_id):
    """
    태그 할당 이력 조회 API - GET /admin/nfc/tags/{tagId}/history
    
    특정 태그의 검사 매핑 변경 이력
    """
    is_admin, error_msg = _check_admin_permission(request)
    if not is_admin:
        return APIResponse.error(
            message=error_msg,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        tag = get_object_or_404(NFCTag, tag_id=tag_id)
        
        # 현재 및 과거 매핑 조회
        all_mappings = NFCTagExam.objects.filter(tag=tag).order_by('-created_at')
        
        history = []
        for mapping in all_mappings:
            history.append({
                'mappingId': mapping.id,
                'examId': mapping.exam_id,
                'examName': mapping.exam_name,
                'examRoom': mapping.exam_room,
                'isActive': mapping.is_active,
                'createdAt': mapping.created_at.isoformat(),
                'deactivatedAt': None  # NFCTagExam 모델에 modified_at 필드가 없음
            })
        
        # 스캔 로그 요약
        scan_summary = TagLog.objects.filter(tag=tag).aggregate(
            totalScans=Count('log_id'),
            firstScan=Min('timestamp'),
            lastScan=Max('timestamp')
        )
        
        return APIResponse.success(
            data={
                'tag': {
                    'tagId': str(tag.tag_id),
                    'code': tag.code,
                    'location': tag.get_location_display(),
                    'createdAt': tag.created_at.isoformat()
                },
                'mappingHistory': history,
                'scanSummary': {
                    'totalScans': scan_summary['totalScans'],
                    'firstScan': scan_summary['firstScan'].isoformat() if scan_summary['firstScan'] else None,
                    'lastScan': scan_summary['lastScan'].isoformat() if scan_summary['lastScan'] else None
                }
            },
            message="태그 할당 이력을 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Tag assignment history error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="태그 할당 이력 조회 중 오류가 발생했습니다.",
            code="HISTORY_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_today_scans(request):
    """
    오늘 NFC 스캔 통계 조회
    GET /api/v1/queue/nfc/today-scans/
    """
    try:
        # 권한 확인 (Staff 이상)
        admin_user = request.user
        if admin_user.role not in ['super', 'dept', 'staff']:
            return APIResponse.error(
                message="권한이 부족합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        today = timezone.now().date()
        
        # 오늘 생성된 Queue 수 (NFC 스캔으로 대기열 등록)
        today_queues = Queue.objects.filter(
            created_at__date=today
        ).count()
        
        # 오늘 호출된 환자 수 (called_at 필드 활용)
        today_called = Queue.objects.filter(
            called_at__date=today
        ).count()
        
        # 오늘 완료된 검사 수
        today_completed = Queue.objects.filter(
            updated_at__date=today,
            state='completed'
        ).count()
        
        # PatientState 모델에서 오늘 업데이트된 위치 변경 수
        # (NFC 태그로 위치가 업데이트되는 경우)
        location_updates = PatientState.objects.filter(
            updated_at__date=today,
            current_location__isnull=False
        ).count()
        
        # 시간대별 스캔 통계 (Queue 생성 기준)
        hourly_scans = []
        for hour in range(24):
            hour_count = Queue.objects.filter(
                created_at__date=today,
                created_at__hour=hour
            ).count()
            
            hourly_scans.append({
                'hour': hour,
                'count': hour_count
            })
        
        # 검사실별 스캔 통계
        exam_scans = Queue.objects.filter(
            created_at__date=today
        ).values('exam__title').annotate(
            scan_count=Count('queue_id')
        ).order_by('-scan_count')[:5]
        
        # 전체 스캔 수 계산 (대기열 생성 + 위치 업데이트)
        total_scans = today_queues + location_updates
        
        # 피크 시간 계산
        peak_hour_data = max(hourly_scans, key=lambda x: x['count']) if hourly_scans else None
        
        return APIResponse.success(
            data={
                'totalScans': total_scans,
                'date': today.isoformat(),
                'breakdown': {
                    'newQueues': today_queues,
                    'calledPatients': today_called,
                    'completedExams': today_completed,
                    'locationUpdates': location_updates
                },
                'hourlyScans': hourly_scans,
                'topExams': list(exam_scans),
                'peakHour': peak_hour_data['hour'] if peak_hour_data else None,
                'peakHourCount': peak_hour_data['count'] if peak_hour_data else 0
            },
            message="오늘 NFC 스캔 통계를 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Today scans error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="오늘 스캔 통계 조회 중 오류가 발생했습니다.",
            code="TODAY_SCANS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )