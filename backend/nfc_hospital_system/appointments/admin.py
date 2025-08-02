from django.contrib import admin
from .models import Exam, Appointment, ExamPreparation, AppointmentHistory
from django.utils import timezone # For actions that update timestamps
import uuid

# ExamPreparation을 Exam Admin에 인라인으로 추가
class ExamPreparationInline(admin.TabularInline):
    """
    Exam 모델에 ExamPreparation을 인라인으로 추가하여 함께 관리합니다.
    """
    model = ExamPreparation
    extra = 1  # 기본으로 보여줄 빈 폼의 개수
    fields = ('title', 'description', 'is_required')
    # 특정 필드를 읽기 전용으로 설정하고 싶다면 아래를 사용 (여기서는 모든 필드 수정 가능)
    # readonly_fields = ('prep_id',)


# Exam 모델 관리자 설정
@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 Exam 모델을 관리합니다.
    """
    list_display = (
        'exam_id', 'title', 'department', 'average_duration', 'buffer_time', 'is_active',
        'created_at', 'updated_at'
    )
    list_filter = (
        'is_active', 'department', 'created_at'
    )
    search_fields = (
        'exam_id', 'title', 'description', 'department'
    )
    # 폼에서 필드 그룹화 및 정리
    fieldsets = (
        (None, {
            'fields': ('exam_id', 'title', 'description', 'department', 'average_duration', 'buffer_time')
        }),
        ('상태', {
            'fields': ('is_active',),
            'description': '검사 활성화 여부를 설정합니다.'
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',), # 필드셋 접기 기능
        }),
    )
    # exam_id는 primary_key이므로 생성 후에는 수정 불가하도록 읽기 전용으로 설정
    readonly_fields = ('exam_id', 'created_at', 'updated_at')
    ordering = ('department', 'title')
    inlines = [ExamPreparationInline] # ExamPreparation을 인라인으로 포함

    # 검사 ID 자동 생성 (선택 사항: 필요한 경우)
    def save_model(self, request, obj, form, change):

        if not obj.exam_id:
            # 예시: 'EXAM-' + 타임스탬프 또는 UUID 앞부분
            obj.exam_id = f"EXAM-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        super().save_model(request, obj, form, change)


# Appointment 모델 관리자 설정
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 Appointment 모델을 관리합니다.
    """
    list_display = (
        'appointment_id', 'user', 'exam', 'scheduled_at', 'status',
        'arrival_confirmed', 'created_at'
    )
    list_filter = (
        'status', 'arrival_confirmed', 'scheduled_at', 'exam__department', 'exam'
    )
    search_fields = (
        'appointment_id', 'user__username', 'user__name',
        'exam__title', 'exam__department'
    )
    autocomplete_fields = ('user', 'exam') # ForeignKey 필드에 대해 검색 가능한 입력 필드 제공
    date_hierarchy = 'scheduled_at' # 예약 시간 기준으로 날짜별 탐색
    ordering = ('-scheduled_at',)

    fieldsets = (
        (None, {
            'fields': ('appointment_id', 'user', 'exam', 'scheduled_at')
        }),
        ('예약 현황', {
            'fields': ('status', 'arrival_confirmed'),
            'description': '예약의 현재 상태를 관리합니다.'
        }),
        ('시간 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ('appointment_id', 'created_at')

    # 액션 추가: 상태 변경 및 도착 확인/취소
    actions = ['mark_as_ongoing', 'mark_as_done', 'mark_as_delayed',
               'confirm_arrival_action', 'unconfirm_arrival_action']

    def mark_as_ongoing(self, request, queryset):
        """선택된 예약을 '진행중'으로 변경합니다."""
        updated = queryset.update(status='ongoing')
        self.message_user(request, f'{updated}개의 예약이 진행중으로 변경되었습니다.')
    mark_as_ongoing.short_description = "선택된 예약을 '진행중'으로 표시"

    def mark_as_done(self, request, queryset):
        """선택된 예약을 '완료'로 변경합니다."""
        updated = queryset.update(status='done')
        self.message_user(request, f'{updated}개의 예약이 완료되었습니다.')
    mark_as_done.short_description = "선택된 예약을 '완료'로 표시"

    def mark_as_delayed(self, request, queryset):
        """선택된 예약을 '지연'으로 변경합니다."""
        updated = queryset.update(status='delayed')
        self.message_user(request, f'{updated}개의 예약이 지연으로 변경되었습니다.')
    mark_as_delayed.short_description = "선택된 예약을 '지연'으로 표시"

    def confirm_arrival_action(self, request, queryset):
        """선택된 예약의 도착을 확인합니다."""
        updated = queryset.update(arrival_confirmed=True)
        self.message_user(request, f'{updated}개의 예약 도착이 확인되었습니다.')
    confirm_arrival_action.short_description = "선택된 예약 도착 확인"

    def unconfirm_arrival_action(self, request, queryset):
        """선택된 예약의 도착 확인을 취소합니다."""
        updated = queryset.update(arrival_confirmed=False)
        self.message_user(request, f'{updated}개의 예약 도착 확인이 취소되었습니다.')
    unconfirm_arrival_action.short_description = "선택된 예약 도착 확인 취소"

    # Appointment ID 자동 생성 (선택 사항: 필요한 경우)
    def save_model(self, request, obj, form, change):

        if not obj.appointment_id:
            # 예시: 'APP-' + 타임스탬프 또는 UUID 앞부분
            obj.appointment_id = f"APP-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        
        super().save_model(request, obj, form, change)



# ExamPreparation 모델 관리자 설정 (인라인으로 사용하지 않고 단독으로 관리할 경우)
# @admin.register(ExamPreparation)
# class ExamPreparationAdmin(admin.ModelAdmin):
#     list_display = ('exam', 'title', 'is_required', 'description')
#     list_filter = ('is_required', 'exam__title', 'exam__department')
#     search_fields = ('title', 'description', 'exam__title')
#     raw_id_fields = ('exam',) # exam 선택 시 검색 필드 제공
#     ordering = ('exam__title', '-is_required', 'title')


# AppointmentHistory 모델 관리자 설정
@admin.register(AppointmentHistory)
class AppointmentHistoryAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 AppointmentHistory 모델을 관리합니다.
    """
    list_display = (
        'history_id', 'appointment', 'action', 'created_by', 'created_at', 'note'
    )
    list_filter = (
        'action', 'created_at', 'created_by', 'appointment__exam__title',
        'appointment__user__name'
    )
    search_fields = (
        'note', 'appointment__appointment_id', 'appointment__user__name',
        'appointment__exam__title', 'created_by__username', 'created_by__name'
    )
    raw_id_fields = ('appointment', 'created_by')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    # 이력 모델은 주로 조회를 위해 사용되므로 수정/추가/삭제를 비활성화하는 경우가 많습니다.
    # 필요에 따라 True로 변경 가능합니다.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    readonly_fields = (
        'history_id', 'appointment', 'action', 'note', 'created_by', 'created_at'
    )
