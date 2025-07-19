from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
import uuid

class UserManager(BaseUserManager):
    """커스텀 유저 매니저"""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('이메일은 필수 항목입니다.')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            # 간편 로그인 사용자는 비밀번호 없이 생성 가능
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    커스텀 유저 모델
    이메일을 기본 인증 수단으로 사용하며, 다양한 역할을 지원
    """

    ROLE_CHOICES = [
        ('super', '최고 관리자'),
        ('dept', '진료과 관리자'),
        ('staff', '직원'),
        ('patient', '환자'),
        ('doctor', '의사'),
    ]

    user_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='사용자 ID'
    )

    email = models.EmailField(
        max_length=255,
        unique=True,
        verbose_name='이메일'
    )

    pw_hash = models.TextField(
        verbose_name='비밀번호 해시',
        help_text='Scrypt 암호화',
        blank=True  # 간편 로그인 사용자는 비밀번호가 없을 수 있음
    )

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='patient',
        verbose_name='역할'
    )

    name = models.CharField(
        max_length=100,
        verbose_name='이름'
    )

    phoneNumber = models.CharField(
        max_length=20,
        verbose_name='전화번호',
        help_text='암호화 저장'
    )

    birthDate = models.DateField(
        verbose_name='생년월일'
    )

    # 환자 전용 필드
    patientId = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='환자 번호',
        help_text='환자 전용'
    )

    emergencyContact = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='응급 연락처'
    )

    allergies = models.JSONField(
        default=list,
        blank=True,
        verbose_name='알레르기 정보'
    )

    lastLoginAt = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='마지막 로그인 시간'
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='생성일시'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )

    is_staff = models.BooleanField(
        default=False,
        verbose_name='스태프 권한'
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'phoneNumber', 'birthDate']

    class Meta:
        db_table = 'users'
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phoneNumber']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['patientId']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"

    def set_password(self, raw_password):
        """Scrypt를 사용한 비밀번호 해싱"""
        import hashlib
        import secrets

        # Django의 기본 set_password 대신 Scrypt 사용
        salt = secrets.token_bytes(32)
        pw_hash = hashlib.scrypt(
            raw_password.encode('utf-8'),
            salt=salt,
            n=16384,
            r=8,
            p=1,
            dklen=64
        )
        # salt와 hash를 함께 저장
        self.pw_hash = salt.hex() + ':' + pw_hash.hex()
        self.password = f"scrypt${salt.hex()}${pw_hash.hex()}"  # Django 호환성

    def check_password(self, raw_password):
        """Scrypt를 사용한 비밀번호 검증"""
        if not self.pw_hash:
            return False

        try:
            import hashlib
            salt_hex, hash_hex = self.pw_hash.split(':')
            salt = bytes.fromhex(salt_hex)

            pw_hash = hashlib.scrypt(
                raw_password.encode('utf-8'),
                salt=salt,
                n=16384,
                r=8,
                p=1,
                dklen=64
            )
            return pw_hash.hex() == hash_hex
        except:
            return False

    @property
    def is_patient(self):
        return self.role == 'patient'

    @property
    def is_doctor(self):
        return self.role == 'doctor'

    @property
    def is_admin(self):
        return self.role in ['super', 'dept']


class DeviceToken(models.Model):
    """
    사용자 디바이스 식별 및 자동 로그인을 위한 토큰 모델
    JWT 토큰과 함께 사용되어 디바이스 기반 인증을 제공
    """

    DEVICE_TYPE_CHOICES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web PWA'),
    ]

    device_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='토큰 ID'
    )

    # 사용자 연결 (한 사용자가 여러 디바이스를 가질 수 있음)
    user_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='device_tokens',
        verbose_name='사용자',
        db_column='user_id'
    )

    # 디바이스 식별 토큰 (자동 로그인용)
    token = models.CharField(
        max_length=255,
        unique=True,
        verbose_name='디바이스 토큰',
        help_text='디바이스 고유 식별 토큰'
    )

    # 디바이스 정보
    device_uuid = models.CharField(
        max_length=255,
        unique=True,
        verbose_name='디바이스 UUID',
        help_text='디바이스 고유 식별자'
    )

    device_type = models.CharField(
        max_length=10,
        choices=DEVICE_TYPE_CHOICES,
        default='web',
        verbose_name='디바이스 타입'
    )

    device_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='디바이스 이름',
        help_text='예: Samsung Galaxy S22, iPhone 16'
    )

    device_model = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='디바이스 모델'
    )

    # 브라우저/앱 정보
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent',
        help_text='브라우저 또는 앱 정보'
    )

    app_version = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='앱 버전'
    )

    # FCM 토큰 (알림용 - admin_dashboard와 연동)
    fcm_token = models.TextField(
        blank=True,
        null=True,
        verbose_name='FCM 토큰',
        help_text='Firebase Cloud Messaging 토큰 (푸시 알림용)'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태',
        help_text='비활성화된 토큰은 자동 로그인이 불가능'
    )

    is_trusted = models.BooleanField(
        default=False,
        verbose_name='신뢰할 수 있는 디바이스',
        help_text='신뢰하는 디바이스는 추가 인증 없이 로그인 가능'
    )

    last_ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name='마지막 IP 주소'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    last_login_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='마지막 로그인 시간'
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='만료일시',
        help_text='설정된 경우 해당 시간 이후 자동 로그인 불가'
    )

    class Meta:
        db_table = 'auth_device_tokens'
        verbose_name = '디바이스 토큰'
        verbose_name_plural = '디바이스 토큰 목록'
        ordering = ['-last_login_at']
        indexes = [
            models.Index(fields=['user_id', 'is_active']),
            models.Index(fields=['token']),
            models.Index(fields=['device_uuid']),
            models.Index(fields=['user_id', 'device_type', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user_id.name} - {self.device_name or self.device_type}"

    def save(self, *args, **kwargs):
        """저장 시 토큰 자동 생성"""
        if not self.token:
            self.token = self.generate_token()
        super().save(*args, **kwargs)

    def generate_token(self):
        """고유한 디바이스 토큰 생성"""
        import secrets
        return secrets.token_urlsafe(32)

    def update_login_info(self, ip_address=None):
        """로그인 정보 업데이트"""
        self.last_login_at = timezone.now()
        if ip_address:
            self.last_ip_address = ip_address
        self.save(update_fields=['last_login_at', 'last_ip_address'])

    def update_fcm_token(self, fcm_token):
        """FCM 토큰 업데이트 (푸시 알림용)"""
        self.fcm_token = fcm_token
        self.save(update_fields=['fcm_token', 'updated_at'])

    def deactivate(self):
        """토큰 비활성화"""
        self.is_active = False
        self.save(update_fields=['is_active'])

    def is_expired(self):
        """토큰 만료 여부 확인"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    @classmethod
    def get_active_token(cls, token):
        """활성화된 토큰 조회"""
        try:
            device_token = cls.objects.get(
                token=token,
                is_active=True
            )
            if not device_token.is_expired():
                return device_token
        except cls.DoesNotExist:
            pass
        return None

    @classmethod
    def cleanup_old_tokens(cls, days=90):
        """오래된 토큰 정리"""
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days)

        old_tokens = cls.objects.filter(
            last_login_at__lt=cutoff_date,
            is_trusted=False
        )

        count = old_tokens.delete()[0]
        return count


class LoginAttempt(models.Model):
    """
    로그인 시도 기록 모델
    간편 로그인, 카카오 로그인 등의 시도를 추적
    """

    LOGIN_TYPE_CHOICES = [
        ('simple', '간편 로그인'),
        ('kakao', '카카오 로그인'),
        ('pass', 'PASS 인증'),
        ('sms', 'SMS 인증'),
        ('device', '디바이스 자동 로그인'),
    ]

    STATUS_CHOICES = [
        ('success', '성공'),
        ('failed', '실패'),
        ('blocked', '차단됨'),
    ]

    # 시도 정보
    phone_last4 = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        verbose_name='전화번호 뒤 4자리'
    )

    birth_date = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        verbose_name='생년월일 6자리'
    )

    login_type = models.CharField(
        max_length=10,
        choices=LOGIN_TYPE_CHOICES,
        verbose_name='로그인 유형'
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        verbose_name='시도 결과'
    )

    # 디바이스 정보
    device_uuid = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='디바이스 UUID'
    )

    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent'
    )

    ip_address = models.GenericIPAddressField(
        verbose_name='IP 주소'
    )

    # 성공한 경우 사용자 연결
    user_id = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts',
        verbose_name='로그인 사용자',
        db_column="user_id"
    )

    # 실패 정보
    failure_reason = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='실패 사유'
    )

    # 시간 정보
    attempted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='시도 시간'
    )

    class Meta:
        db_table = 'auth_login_attempts'
        verbose_name = '로그인 시도'
        verbose_name_plural = '로그인 시도 기록'
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['ip_address', 'attempted_at']),
            models.Index(fields=['phone_last4', 'attempted_at']),
            models.Index(fields=['device_uuid', 'status']),
        ]

    def __str__(self):
        return f"{self.get_login_type_display()} - {self.get_status_display()} ({self.attempted_at})"
