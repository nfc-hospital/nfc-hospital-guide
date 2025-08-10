from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DeviceToken, LoginAttempt


# User 모델 관리자 설정
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Django 관리자 페이지에서 커스텀 User 모델을 관리합니다.
    BaseUserAdmin을 상속받아 기존 Django User 모델의 기능을 유지하면서 커스터마이징합니다.
    """
    list_display = (
        'email', 'name', 'role', 'phone_number', 'is_active', 'is_staff',
        'is_superuser', 'last_login_at', 'created_at'
    )
    list_filter = (
        'is_active', 'is_staff', 'is_superuser', 'role', 'created_at',
        'last_login_at'
    )
    search_fields = ('email', 'name', 'phone_number', 'patient_id') # 필드명 수정

    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    # 필드셋 정의 (기존 BaseUserAdmin의 fieldsets를 확장)
    fieldsets = (
        (None, {'fields': ('email', 'password')}), # pw_hash는 읽기 전용으로 두거나 제외
        ('개인 정보', {'fields': ('name', 'phone_number', 'birth_date')}),
        ('역할 및 권한', {'fields': (
            'role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'
        )}),
        ('환자 정보', {
            'fields': ('patient_id', 'emergency_contact', 'allergies'),
            'classes': ('collapse',), # 필요에 따라 접어두기
            'description': '환자 역할의 사용자에게만 해당되는 정보입니다.'
        }),
        ('로그인 정보', {'fields': ('last_login_at', 'created_at')}),
    )

    # BaseUserAdmin의 add_fieldsets를 오버라이드하여 사용자 생성 시 필드 구성
    # 사용자 생성 폼에서는 비밀번호를 직접 입력받아야 하므로 'password' 필드를 포함
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'name', 'phone_number', 'birth_date', 'role', 'is_staff', 'is_superuser', 'is_active'),
        }),
    )

    # password 필드는 AbstractBaseUser에서 관리하므로 pw_hash 필드는 읽기 전용으로 설정
    # 또는 set_password 메서드에 의해 내부적으로 관리되므로, admin에서 직접 수정은 권장되지 않음
    readonly_fields = (
        'user_id', 'created_at', 'last_login_at', 'password'
    )

    # AbstractBaseUser의 'password' 필드는 BaseUserAdmin에 의해 적절히 관리 되므로 제거
    # # 추가/변경 폼에서 'password' 필드 제거 (UserManager의 create_user/set_password 사용 유도)
    # # 실제 비밀번호 변경은 별도의 ChangePasswordForm을 사용
    # def get_form(self, request, obj=None, **kwargs):
    #     form = super().get_form(request, obj, **kwargs)
    #     # 비밀번호 해시 필드는 사용자가 직접 수정하지 않도록 기본 폼에서 제거
    #     if 'pw_hash' in form.base_fields:
    #         form.base_fields.pop('pw_hash')
    #     return form

    # 액션 추가 (사용자 활성화/비활성화, 역할 변경 등)
    actions = ['activate_users', 'deactivate_users', 'make_staff', 'make_patient']

    def activate_users(self, request, queryset):
        """선택된 사용자를 활성화합니다."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated}명의 사용자가 활성화되었습니다.')
    activate_users.short_description = "선택된 사용자 활성화"

    def deactivate_users(self, request, queryset):
        """선택된 사용자를 비활성화합니다."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}명의 사용자가 비활성화되었습니다.')
    deactivate_users.short_description = "선택된 사용자 비활성화"

    def make_staff(self, request, queryset):
        """선택된 사용자를 스태프 권한으로 변경합니다."""
        updated = queryset.update(is_staff=True, role='staff') # 또는 'dept' 등 적절한 역할 부여
        self.message_user(request, f'{updated}명의 사용자가 스태프 권한으로 변경되었습니다.')
    make_staff.short_description = "선택된 사용자를 '직원'으로 지정"

    def make_patient(self, request, queryset):
        """선택된 사용자를 환자 역할로 변경합니다."""
        updated = queryset.update(is_staff=False, is_superuser=False, role='patient')
        self.message_user(request, f'{updated}명의 사용자가 \'환자\' 역할로 변경되었습니다.')
    make_patient.short_description = "선택된 사용자를 '환자'로 지정"



# DeviceToken 모델 관리자 설정
@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 DeviceToken 모델을 관리합니다.
    """
    list_display = (
        'token', 'user_id', 'device_type', 'device_name', 'is_active',
        'is_trusted', 'last_login_at', 'expires_at', 'created_at'
    )
    list_filter = (
        'is_active', 'is_trusted', 'device_type', 'created_at', 'last_login_at'
    )
    search_fields = (
        'token', 'device_uuid', 'device_name', 'user_id__email',
        'user_id__name', 'fcm_token'
    )
    raw_id_fields = ('user',) # user_id 필드에 대해 검색 가능한 입력 필드 제공
    date_hierarchy = 'created_at'
    ordering = ('-last_login_at',)

    fieldsets = (
        (None, {
            'fields': (
                'user_id', 'token', 'device_uuid', 'device_type', 'device_name',
                'device_model', 'user_agent', 'app_version', 'fcm_token'
            )
        }),
        ('상태 및 보안', {
            'fields': ('is_active', 'is_trusted', 'last_ip_address', 'expires_at'),
            'description': '디바이스 토큰의 활성 상태 및 보안 관련 설정입니다.'
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at', 'last_login_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = (
        'device_id', 'token', 'created_at', 'updated_at', 'last_login_at'
    )

    # 액션 추가 (토큰 비활성화, 만료 등)
    actions = ['deactivate_tokens', 'mark_as_trusted', 'mark_as_untrusted']

    def deactivate_tokens(self, request, queryset):
        """선택된 디바이스 토큰을 비활성화합니다."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}개의 디바이스 토큰이 비활성화되었습니다.')
    deactivate_tokens.short_description = "선택된 토큰 비활성화"

    def mark_as_trusted(self, request, queryset):
        """선택된 디바이스 토큰을 신뢰할 수 있는 디바이스로 표시합니다."""
        updated = queryset.update(is_trusted=True)
        self.message_user(request, f'{updated}개의 디바이스 토큰이 신뢰할 수 있는 디바이스로 지정되었습니다.')
    mark_as_trusted.short_description = "선택된 토큰을 '신뢰할 수 있는 디바이스'로 표시"

    def mark_as_untrusted(self, request, queryset):
        """선택된 디바이스 토큰을 신뢰할 수 없는 디바이스로 표시합니다."""
        updated = queryset.update(is_trusted=False)
        self.message_user(request, f'{updated}개의 디바이스 토큰이 신뢰할 수 없는 디바이스로 지정되었습니다.')
    mark_as_untrusted.short_description = "선택된 토큰을 '신뢰할 수 없는 디바이스'로 표시"



# LoginAttempt 모델 관리자 설정
@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 LoginAttempt 모델을 관리합니다.
    로그인 시도 기록은 조회용으로만 사용되므로, 수정/추가/삭제를 비활성화합니다.
    """
    list_display = (
        'attempted_at', 'user_id', 'login_type', 'status', 'ip_address',
        'device_uuid', 'failure_reason'
    )
    list_filter = (
        'status', 'login_type', 'attempted_at', 'ip_address', 'user_id'
    )
    search_fields = (
        'phone_last4', 'birth_date', 'ip_address', 'device_uuid', 'user_agent',
        'failure_reason', 'user_id__email', 'user_id__name'
    )
    raw_id_fields = ('user_id',) # user_id 필드에 대해 검색 가능한 입력 필드 제공
    date_hierarchy = 'attempted_at'
    ordering = ('-attempted_at',)

    # 로그인 시도 기록은 조회를 목적으로 하므로, 수정/추가/삭제를 비활성화합니다.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    readonly_fields = (
        'phone_last4', 'birth_date', 'login_type', 'status', 'device_uuid',
        'user_agent', 'ip_address', 'user_id', 'failure_reason', 'attempted_at'
    )