from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import timedelta
from .models import EmrSyncStatus
from nfc_hospital_system.utils import APIResponse
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def emr_sync_status(request):
    """EMR 동기화 상태 조회 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 상태 조회 (임시)',
        'data': []
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def emr_trigger_sync(request):
    """EMR 동기화 트리거 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 트리거 실행 (임시)'
    })

@api_view(['GET'])
def emr_sync_history(request):
    """EMR 동기화 히스토리 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 히스토리 (임시)',
        'data': []
    })

@api_view(['GET'])
def emr_mapping_rules(request):
    """EMR 매핑 규칙 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 매핑 규칙 (임시)',
        'data': {}
    })