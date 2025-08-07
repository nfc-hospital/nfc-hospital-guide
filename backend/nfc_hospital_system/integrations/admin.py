from django.contrib import admin
from .models import EmrSyncStatus

@admin.register(EmrSyncStatus)
class EmrSyncStatusAdmin(admin.ModelAdmin):
    """EMR 동기화 상태 관리"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model._meta.verbose_name = "EMR 동기화 상태"
        self.model._meta.verbose_name_plural = "EMR 동기화 상태 목록"
        
    list_display = (
        'patient_emr_id', 'mapped_state', 'sync_success',
        'last_sync_time', 'emr_department', 'retry_count'
    )
    list_filter = (
        'sync_success', 'mapped_state', 'emr_department',
        'last_sync_time', 'retry_count'
    )
    search_fields = (
        'patient_emr_id', 'user__name',
        'emr_doctor_id', 'error_message'
    )
    raw_id_fields = ('user',)
    date_hierarchy = 'last_sync_time'
    ordering = ('-last_sync_time',)
    
    fieldsets = (
        (None, {
            'fields': ('patient_emr_id', 'user', 'mapped_state')
        }),
        ('동기화 상태', {
            'fields': (
                'last_sync_time', 'sync_success', 'error_message',
                'retry_count', 'mapping_rules_version'
            )
        }),
        ('EMR 정보', {
            'fields': (
                'emr_raw_status', 'emr_department', 'emr_appointment_date',
                'emr_appointment_time', 'emr_doctor_id', 'emr_room_number'
            ),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    # 액션 추가
    actions = ['reset_retry_count', 'mark_as_success', 'mark_as_failed']
    
    def reset_retry_count(self, request, queryset):
        """재시도 횟수 초기화"""
        updated = queryset.update(retry_count=0)
        self.message_user(request, f'{updated}개의 동기화 상태의 재시도 횟수를 초기화했습니다.')
    reset_retry_count.short_description = "재시도 횟수 초기화"
    
    def mark_as_success(self, request, queryset):
        """동기화 성공으로 표시"""
        updated = queryset.update(sync_success=True, error_message=None)
        self.message_user(request, f'{updated}개의 동기화를 성공으로 표시했습니다.')
    mark_as_success.short_description = "동기화 성공으로 표시"
    
    def mark_as_failed(self, request, queryset):
        """동기화 실패로 표시"""
        updated = queryset.update(sync_success=False)
        self.message_user(request, f'{updated}개의 동기화를 실패로 표시했습니다.')
    mark_as_failed.short_description = "동기화 실패로 표시"
