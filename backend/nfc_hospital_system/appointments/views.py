from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from .models import Exam, ExamPreparation 
from .serializers import ExamSerializer, ExamPreparationSerializer

# 페이지네이션 설정
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ExamViewSet(viewsets.ModelViewSet):
    # `exam_id`가 PK이므로 queryset은 모든 객체 가져옴
    queryset = Exam.objects.all().order_by('-created_at') # 최신순 정렬
    serializer_class = ExamSerializer
    pagination_class = StandardResultsSetPagination # 페이지네이션 적용
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # 쿼리 파라미터 필터링
    filterset_fields = {
        'department': ['exact'],
        'is_active': ['exact'],
        'category': ['exact'],
        'building': ['exact'],
        'floor': ['exact'],
        'room': ['exact'],
    }
    
    # 검색 필드 
    search_fields = [
        'title', 'description', 'department', 'category',
        'building', 'floor', 'room'
    ]
    
    # 정렬 필드
    ordering_fields = [
        'title', 'created_at', 'updated_at', 'average_duration',
        'department', 'category', 'building', 'floor', 'room'
    ]

    def get_queryset(self):
        """
        GET /exams 요청 시 is_active=True인 검사만 기본으로 반환.
        관리자는 모든 검사(is_active=False 포함)를 볼 수 있도록 재정의.
        """
        queryset = super().get_queryset()
        
        # 현재 로그인된 사용자가 관리자인지 확인 (request.user.is_staff 사용)
        if not self.request.user.is_staff: 
            queryset = queryset.filter(is_active=True)
            
        return queryset

    def get_permissions(self):
        """
        API 액션에 따른 권한 설정
        - 검사 목록 조회 (GET /exams): 누구나 접근 가능 (is_active=True만)
        - 검사 상세 조회 (GET /exams/{id}): 누구나 접근 가능 (is_active=True만)
        - 검사 생성 (POST /exams): 관리자 전용
        - 검사 수정 (PATCH /exams/{id}): 관리자 전용
        - 검사 삭제 (DELETE /exams/{id}): 관리자 전용
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminUser] # 관리자만 가능
        else:
            # 목록/상세 조회는 누구나 접근 가능
            self.permission_classes = [] 
        return super().get_permissions()

    # 특정 검사의 준비사항을 별도로 관리하는 API

    @action(detail=True, methods=['post'], url_path='preparations', permission_classes=[IsAdminUser])
    def add_preparation(self, request, pk=None):
        """특정 검사에 준비사항 추가"""
        exam = self.get_object()
        # 여러 준비사항을 한 번에 추가할 수 있도록 many=True 사용
        serializer = ExamPreparationSerializer(data=request.data, many=True)
        if serializer.is_valid():
            # 각각의 준비사항에 exam을 연결하여 저장
            for prep_data in serializer.validated_data:
                ExamPreparation.objects.create(exam=exam, **prep_data)
            # 새로 추가된 준비사항들을 다시 Serializer로 직렬화하여 응답
            return Response(ExamPreparationSerializer(exam.preparations.all(), many=True).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='preparations/(?P<prep_id>[^/.]+)', permission_classes=[IsAdminUser])
    def update_preparation(self, request, pk=None, prep_id=None):
        """특정 검사의 특정 준비사항 수정"""
        exam = self.get_object()
        try:
            preparation = ExamPreparation.objects.get(exam=exam, prep_id=prep_id)
        except ExamPreparation.DoesNotExist:
            return Response({"detail": "Preparation not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ExamPreparationSerializer(preparation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='preparations/(?P<prep_id>[^/.]+)', permission_classes=[IsAdminUser])
    def remove_preparation(self, request, pk=None, prep_id=None):
        """특정 검사의 특정 준비사항 삭제"""
        exam = self.get_object()
        try:
            preparation = ExamPreparation.objects.get(exam=exam, prep_id=prep_id)
            preparation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ExamPreparation.DoesNotExist:
            return Response({"detail": "Preparation not found."}, status=status.HTTP_404_NOT_FOUND)
