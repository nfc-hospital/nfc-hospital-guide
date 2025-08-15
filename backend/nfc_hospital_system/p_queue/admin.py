from django.contrib import admin
from .models import Queue, QueueStatusLog, PatientState, StateTransition


# QueueStatusLog를 Queue Admin에 인라인으로 추가 (선택 사항)
class QueueStatusLogInline(admin.TabularInline):
    """
    Queue 모델에 QueueStatusLog를 인라인으로 추가하여 대기열의 상태 변경 이력을 함께 봅니다.
    로그는 수정 불가능하도록 설정합니다.
    """
    model = QueueStatusLog
    extra = 0  # 기본으로 보여줄 빈 폼 없음
    fields = ('previous_state', 'new_state', 'previous_number', 'new_number', 'changed_by', 'reason', 'created_at')
    readonly_fields = fields # 모든 필드를 읽기 전용으로 설정
    can_delete = False # 인라인에서 삭제 불가능하도록 설정

    def has_add_permission(self, request, obj=None):
        return False # 인라인에서 추가 불가능하도록 설정



# Queue 모델 관리자 설정
@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 Queue 모델을 관리합니다.
    """
    list_display = (
        'queue_number', 'user', 'exam', 'state', 'priority',
        'estimated_wait_time', 'called_at', 'created_at', 'updated_at'
    )
    list_filter = (
        'state', 'priority', 'exam__department', 'exam__title',
        'created_at', 'called_at'
    )
    search_fields = (
        'user__name', 'user__email', 'exam__title', 'queue_id',
        'appointment__appointment_id'
    )
    raw_id_fields = ('appointment', 'user', 'exam') # ForeignKey 필드에 대해 검색 가능한 입력 필드 제공
    date_hierarchy = 'created_at' # 대기열 등록 시간 기준으로 날짜별 탐색
    ordering = ('exam', 'priority', 'queue_number')

    fieldsets = (
        (None, {
            'fields': ('appointment', 'user', 'exam')
        }),
        ('대기열 정보', {
            'fields': ('queue_number', 'state', 'priority', 'estimated_wait_time', 'called_at')
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = (
        'queue_id', 'created_at', 'updated_at',
        'estimated_wait_time', # estimated_wait_time은 로직에 의해 계산되므로 읽기 전용으로 설정
    )

    # 액션 추가
    actions = ['mark_as_called', 'mark_as_in_progress', 'mark_as_completed', 'mark_as_cancelled']

    def mark_as_called(self, request, queryset):
        """선택된 대기열을 '호출됨' 상태로 변경합니다."""
        for obj in queryset:
            obj.call_patient() # 모델 메서드 호출
            # 로그 기록 (옵션)
            QueueStatusLog.objects.create(
                queue=obj,
                previous_state=obj._previous_state_from_db, # 이전 상태를 가져옴 (옵션, save 이전에 접근해야 함)
                new_state='called',
                previous_number=obj._previous_queue_number_from_db,
                new_number=obj.queue_number,
                changed_by=request.user,
                reason='관리자 호출'
            )
        self.message_user(request, f'{queryset.count()}개의 대기열이 호출됨으로 변경되었습니다.')
    mark_as_called.short_description = "선택된 대기열 '호출됨'으로 표시"

    def mark_as_in_progress(self, request, queryset):
        """선택된 대기열을 '진행중' 상태로 변경합니다."""
        for obj in queryset:
            obj.start_examination()
            QueueStatusLog.objects.create(
                queue=obj,
                previous_state=obj._previous_state_from_db,
                new_state='in_progress',
                previous_number=obj._previous_queue_number_from_db,
                new_number=obj.queue_number,
                changed_by=request.user,
                reason='관리자 검사 시작'
            )
        self.message_user(request, f'{queryset.count()}개의 대기열이 진행중으로 변경되었습니다.')
    mark_as_in_progress.short_description = "선택된 대기열 '진행중'으로 표시"

    def mark_as_completed(self, request, queryset):
        """선택된 대기열을 '완료됨' 상태로 변경합니다."""
        for obj in queryset:
            obj.complete_examination()
            QueueStatusLog.objects.create(
                queue=obj,
                previous_state=obj._previous_state_from_db,
                new_state='completed',
                previous_number=obj._previous_queue_number_from_db,
                new_number=obj.queue_number,
                changed_by=request.user,
                reason='관리자 검사 완료'
            )
        self.message_user(request, f'{queryset.count()}개의 대기열이 완료됨으로 변경되었습니다.')
    mark_as_completed.short_description = "선택된 대기열 '완료됨'으로 표시"

    def mark_as_cancelled(self, request, queryset):
        """선택된 대기열을 '취소됨' 상태로 변경합니다."""
        for obj in queryset:
            obj.cancel()
            QueueStatusLog.objects.create(
                queue=obj,
                previous_state=obj._previous_state_from_db,
                new_state='cancelled',
                previous_number=obj._previous_queue_number_from_db,
                new_number=obj.queue_number,
                changed_by=request.user,
                reason='관리자 대기 취소'
            )
        self.message_user(request, f'{queryset.count()}개의 대기열이 취소됨으로 변경되었습니다.')
    mark_as_cancelled.short_description = "선택된 대기열 '취소됨'으로 표시"

    # save_model 오버라이드: 상태 변경 시 로그 기록 및 대기시간/순번 재조정 로직 호출
    def save_model(self, request, obj, form, change):
        # 변경 전 상태/순번 저장을 위한 임시 속성
        if change:
            original_obj = self.model.objects.get(pk=obj.pk)
            obj._previous_state_from_db = original_obj.state
            obj._previous_queue_number_from_db = original_obj.queue_number
        else:
            # 새로운 객체 생성 시 초기값 설정
            obj.queue_number = Queue.get_next_queue_number(obj.exam)
            obj._previous_state_from_db = None
            obj._previous_queue_number_from_db = None

        super().save_model(request, obj, form, change)

        # 상태가 변경되었거나 새로운 객체인 경우
        if (change and obj.state != obj._previous_state_from_db) or not change:
            # 상태 변경 로그 기록
            QueueStatusLog.objects.create(
                queue=obj,
                previous_state=obj._previous_state_from_db if change else None,
                new_state=obj.state,
                previous_number=obj._previous_queue_number_from_db if change else None,
                new_number=obj.queue_number,
                changed_by=request.user,
                reason='관리자 직접 변경' if change else '대기열 생성'
            )
            # 대기 시간 및 순번 재계산/재정렬
            obj.recalculate_wait_times()
            obj.reorder_queue_numbers()

    # delete_model 오버라이드: 삭제 시에도 대기열 순번 재조정
    def delete_model(self, request, obj):
        exam = obj.exam
        super().delete_model(request, obj)
        # 삭제 후 해당 검사의 대기열 순번 재조정
        # 주의: obj.reorder_queue_numbers()는 obj가 이미 삭제되었으므로 직접 호출 불가능
        # 해당 exam에 속한 다른 Queue 객체 중 하나를 찾아 호출하거나, static method를 활용
        if Queue.objects.filter(exam=exam, state__in=['waiting', 'called']).exists():
            # 임시로 아무 Queue 객체나 가져와서 reorder_queue_numbers 호출
            # 더 좋은 방법은 models.py에 classmethod로 reorder_queue_numbers_for_exam을 만드는 것
            Queue.objects.filter(exam=exam, state__in=['waiting', 'called']).first().reorder_queue_numbers()
        self.message_user(request, f'{obj} 대기열이 삭제되었습니다. 관련 대기열 순번이 재조정됩니다.')

    inlines = [QueueStatusLogInline] # QueueStatusLog를 인라인으로 포함



# QueueStatusLog 모델 관리자 설정 (단독으로 관리할 경우)
@admin.register(QueueStatusLog)
class QueueStatusLogAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 QueueStatusLog 모델을 관리합니다.
    이력 모델이므로 주로 조회용으로 사용하며, 추가/수정/삭제를 비활성화합니다.
    """
    list_display = (
        'created_at', 'queue', 'previous_state', 'new_state',
        'previous_number', 'new_number', 'changed_by', 'reason'
    )
    list_filter = (
        'new_state', 'created_at', 'changed_by', 'queue__exam__title',
        'queue__user__name'
    )
    search_fields = (
        'reason', 'queue__queue_id', 'queue__user__name', 'queue__exam__title',
        'changed_by__username', 'changed_by__name'
    )
    raw_id_fields = ('queue', 'changed_by')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    # 로그 모델은 조회를 목적으로 하므로, 수정/추가/삭제를 비활성화합니다.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    readonly_fields = (
        'log_id', 'queue', 'previous_state', 'new_state', 'previous_number',
        'new_number', 'changed_by', 'reason', 'created_at'
    )

# 환자 관리 상태 모델 추가
@admin.register(PatientState)
class PatientStateAdmin(admin.ModelAdmin):
    """환자별 현재 상태 관리"""
    # Admin에서 보이는 제목 한국어로 변경
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model._meta.verbose_name = "환자 상태"
        self.model._meta.verbose_name_plural = "환자 상태 목록"

    list_display = (
        'user', 'current_state', 'get_current_exam', 'get_exam_department',
        'emr_department', 'is_logged_in', 'updated_at'
    )
    list_filter = (
        'current_state', 'is_logged_in', 'emr_department',
        'login_method', 'current_exam__department',  # 외래키 필터 추가
        'created_at'
    )
    search_fields = (
        'user__name', 'emr_patient_id',
        'current_exam__exam_id', 'current_exam__title',  # 외래키 검색 수정
        'current_exam__department', 'emr_department'
    )
    raw_id_fields = ('user', 'current_exam')  # current_exam도 raw_id_field로 추가
    date_hierarchy = 'updated_at'
    ordering = ('-updated_at',)
    
    # select_related 추가로 쿼리 최적화
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'current_exam')
    
    # 커스텀 디스플레이 메서드들
    def get_current_exam(self, obj):
        if obj.current_exam:
            return f"{obj.current_exam.title} ({obj.current_exam.exam_id})"
        return "-"
    get_current_exam.short_description = "현재 검사"
    get_current_exam.admin_order_field = 'current_exam__title'
    
    def get_exam_department(self, obj):
        if obj.current_exam:
            return obj.current_exam.department
        return "-"
    get_exam_department.short_description = "검사 부서"
    get_exam_department.admin_order_field = 'current_exam__department'
    
    fieldsets = (
        (None, {
            'fields': ('user', 'current_state', 'current_exam')
        }),
        ('위치 및 EMR 정보', {
            'fields': (
                'current_location', 'emr_patient_id', 'emr_department',
                'emr_raw_status', 'emr_appointment_time', 'emr_latest_update'
            )
        }),
        ('로그인 정보', {
            'fields': ('is_logged_in', 'login_method'),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'emr_latest_update')
    
    # 액션 추가
    actions = ['mark_as_waiting', 'mark_as_called', 'mark_as_completed', 'reset_login_status', 'assign_exam']
    
    def mark_as_waiting(self, request, queryset):
        """선택된 환자를 '대기중' 상태로 변경"""
        updated = queryset.update(current_state='WAITING')
        self.message_user(request, f'{updated}명의 환자 상태를 WAITING으로 변경했습니다.')
    mark_as_waiting.short_description = "선택된 환자를 '대기중'으로 표시"
    
    def mark_as_called(self, request, queryset):
        """선택된 환자를 '호출됨' 상태로 변경"""
        updated = queryset.update(current_state='CALLED')
        self.message_user(request, f'{updated}명의 환자 상태를 CALLED로 변경했습니다.')
    mark_as_called.short_description = "선택된 환자를 '호출됨'으로 표시"
    
    def mark_as_completed(self, request, queryset):
        """선택된 환자를 '완료됨' 상태로 변경"""
        updated = queryset.update(current_state='COMPLETED')
        self.message_user(request, f'{updated}명의 환자 상태를 COMPLETED로 변경했습니다.')
    mark_as_completed.short_description = "선택된 환자를 '완료됨'으로 표시"
    
    def reset_login_status(self, request, queryset):
        """선택된 환자의 로그인 상태 초기화"""
        updated = queryset.update(is_logged_in=False, login_method=None)
        self.message_user(request, f'{updated}명의 환자 로그인 상태를 초기화했습니다.')
    reset_login_status.short_description = "로그인 상태 초기화"
    
    def assign_exam(self, request, queryset):
        """선택된 환자에게 검사 할당 (예시)"""
        from appointments.models import Exam
        # 첫 번째 활성 검사를 할당 (예시)
        first_exam = Exam.objects.filter(is_active=True).first()
        if first_exam:
            updated = queryset.update(current_exam=first_exam)
            self.message_user(request, f'{updated}명의 환자에게 {first_exam.title} 검사를 할당했습니다.')
        else:
            self.message_user(request, '할당 가능한 검사가 없습니다.', level='WARNING')
    assign_exam.short_description = "검사 할당 (테스트용)"


@admin.register(StateTransition)
class StateTransitionAdmin(admin.ModelAdmin):
    """상태 전환 히스토리"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model._meta.verbose_name = "상태 전환 기록"
        self.model._meta.verbose_name_plural = "상태 전환 기록 목록"

    list_display = (
        'created_at', 'user', 'from_state', 'to_state',
        'trigger_type', 'trigger_source', 'exam_id'
    )
    list_filter = (
        'from_state', 'to_state', 'trigger_type',
        'created_at'
    )
    search_fields = (
        'user__name', 'trigger_source',
        'exam_id', 'emr_reference'
    )
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('user', 'from_state', 'to_state')
        }),
        ('트리거 정보', {
            'fields': ('trigger_type', 'trigger_source', 'location_at_transition')
        }),
        ('컨텍스트 정보', {
            'fields': ('exam_id', 'emr_reference', 'emr_status_before', 'emr_status_after'),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('transition_id', 'created_at')
    
    # 상태 전환 로그는 수정하지 않는 것이 좋음
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # 슈퍼유저만 삭제 가능


