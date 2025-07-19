from django.contrib import admin
from .models import AdminLog, Feedback, Notification
from django.utils import timezone

# AdminLog 모델 관리자 설정
@admin.register(AdminLog)
class AdminLogAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 AdminLog 모델을 관리합니다.
    """
    list_display = (
        'log_id', 'user', 'action', 'target_table', 'target_id', 'timestamp'
    )
    list_filter = (
        'action', 'target_table', 'timestamp', 'user'
    )
    search_fields = (
        'user__username', 'user__name', 'target_table', 'target_id', 'action'
    )
    readonly_fields = (
        'log_id', 'user', 'action', 'target_table', 'target_id', 'timestamp'
    )
    ordering = ('-timestamp',)

    # 변경, 추가, 삭제 기능을 비활성화합니다.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# Feedback 모델 관리자 설정
@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 Feedback 모델을 관리합니다.
    """
    list_display = (
        'title', 'user', 'category', 'rating', 'status', 'assigned_to',
        'created_at', 'updated_at'
    )
    list_filter = (
        'category', 'rating', 'status', 'created_at', 'assigned_to'
    )
    search_fields = (
        'title', 'content', 'user__username', 'user__name',
        'assigned_to__username', 'assigned_to__name'
    )
    raw_id_fields = ('user', 'assigned_to') # 사용자 선택 시 팝업 대신 검색 필드 제공
    date_hierarchy = 'created_at' # 날짜별 필터링 기능 추가

    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'category', 'rating', 'title', 'content')
        }),
        ('처리 현황', {
            'fields': ('status', 'assigned_to', 'response', 'responded_at'),
            'description': '피드백 처리 상태 및 관리자 답변을 관리합니다.'
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',), # 필드셋 접기 기능
        }),
    )

    # 읽기 전용 필드 설정
    readonly_fields = ('feedback_id', 'created_at', 'updated_at', 'responded_at')

    # 액션 추가 (선택된 피드백의 상태를 변경하는 액션)
    actions = ['mark_as_reviewing', 'mark_as_resolved', 'mark_as_closed']

    def mark_as_reviewing(self, request, queryset):
        """선택된 피드백을 '검토중' 상태로 변경합니다."""
        updated_count = queryset.update(status='reviewing')
        self.message_user(request, f'{updated_count}개의 피드백이 검토중으로 변경되었습니다.')
    mark_as_reviewing.short_description = "선택된 피드백을 '검토중'으로 표시"

    def mark_as_resolved(self, request, queryset):
        """선택된 피드백을 '해결됨' 상태로 변경합니다."""
        updated_count = queryset.update(status='resolved')
        self.message_user(request, f'{updated_count}개의 피드백이 해결됨으로 변경되었습니다.')
    mark_as_resolved.short_description = "선택된 피드백을 '해결됨'으로 표시"

    def mark_as_closed(self, request, queryset):
        """선택된 피드백을 '종료됨' 상태로 변경합니다."""
        updated_count = queryset.update(status='closed')
        self.message_user(request, f'{updated_count}개의 피드백이 종료됨으로 변경되었습니다.')
    mark_as_closed.short_description = "선택된 피드백을 '종료됨'으로 표시"


# Notification 모델 관리자 설정
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 Notification 모델을 관리합니다.
    """
    list_display = (
        'title', 'user', 'type', 'status', 'created_at', 'sent_at', 'read_at'
    )
    list_filter = (
        'type', 'status', 'created_at', 'user'
    )
    search_fields = (
        'title', 'message', 'user__username', 'user__name', 'data'
    )
    raw_id_fields = ('user', 'device_token') # 사용자 및 디바이스 토큰 선택 시 검색 필드 제공
    date_hierarchy = 'created_at' # 날짜별 필터링 기능 추가

    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'type', 'title', 'message', 'data')
        }),
        ('발송 정보', {
            'fields': ('status', 'device_token', 'fcm_response', 'sent_at', 'read_at'),
            'description': '알림 발송 상태 및 FCM 응답을 관리합니다.'
        }),
        ('시간 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    # 읽기 전용 필드 설정 (알림은 주로 시스템에 의해 생성되므로)
    readonly_fields = (
        'notification_id', 'created_at', 'sent_at', 'read_at', 'fcm_response'
    )

    # 알림 발송은 코드 레벨에서 이루어지는 것이 일반적이므로,
    # 관리자 페이지에서의 추가 및 변경은 제한하거나 세심한 주의가 필요합니다.
    # 여기서는 보기 및 필터링 위주로 설정합니다.
    def has_add_permission(self, request):
        # 알림 생성을 관리자 페이지에서 직접 허용할지 여부
        # 필요에 따라 True로 변경 가능
        return False

    # 특정 상태로 변경하는 액션 추가 (예: 읽음 처리, 재발송 시도 등)
    actions = ['mark_as_read', 'resend_notification']

    def mark_as_read(self, request, queryset):
        """선택된 알림을 '읽음' 상태로 변경합니다."""
        updated_count = queryset.filter(status__in=['pending', 'sent']).update(
            status='read', read_at=timezone.now()
        )
        self.message_user(request, f'{updated_count}개의 알림이 읽음 처리되었습니다.')
    mark_as_read.short_description = "선택된 알림을 '읽음'으로 표시"

    def resend_notification(self, request, queryset):
        """선택된 알림을 다시 발송 시도합니다. (실제 발송 로직은 모델 메서드에 따라 달라집니다)"""
        sent_count = 0
        for notification in queryset:
            if notification.send(): # 모델의 send 메서드 호출
                sent_count += 1
        self.message_user(request, f'{sent_count}개의 알림 발송을 시도했습니다.')
    resend_notification.short_description = "선택된 알림 다시 발송 시도"
