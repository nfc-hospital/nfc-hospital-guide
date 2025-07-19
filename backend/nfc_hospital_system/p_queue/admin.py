from django.contrib import admin
from .models import Queue, QueueStatusLog


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
