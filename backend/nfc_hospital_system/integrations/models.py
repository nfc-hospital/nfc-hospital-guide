# integrations/models.py
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class EmrSyncStatus(models.Model):
    """EMR 동기화 상태 관리"""
    sync_id = models.CharField(max_length=36, primary_key=True, default=uuid.uuid4)
    patient_emr_id = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='emr_sync_statuses')  # 'users.User' → User
    
    # 동기화 상태 정보
    last_sync_time = models.DateTimeField()
    sync_success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    
    # EMR 상태 정보
    emr_raw_status = models.CharField(max_length=50, null=True, blank=True)
    emr_department = models.CharField(max_length=50, null=True, blank=True)
    emr_appointment_date = models.DateField(null=True, blank=True)
    emr_appointment_time = models.TimeField(null=True, blank=True)
    emr_doctor_id = models.CharField(max_length=50, null=True, blank=True)
    emr_room_number = models.CharField(max_length=20, null=True, blank=True)
    
    # 매핑 정보
    STATE_CHOICES = [
        ('UNREGISTERED', 'Unregistered'),
        ('ARRIVED', 'Arrived'),
        ('REGISTERED', 'Registered'),
        ('WAITING', 'Waiting'),
        ('CALLED', 'Called'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('PAYMENT', 'Payment'),
        ('FINISHED', 'Finished'),
    ]
    mapped_state = models.CharField(max_length=20, choices=STATE_CHOICES, null=True, blank=True)
    mapping_rules_version = models.CharField(max_length=10, default='1.0')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'emr_sync_status'
        indexes = [
            models.Index(fields=['patient_emr_id']),
            models.Index(fields=['last_sync_time']),
            models.Index(fields=['mapped_state']),
        ]
        ordering = ['-last_sync_time']
        
    def __str__(self):
        status = "✓" if self.sync_success else "✗"
        return f"{status} EMR-{self.patient_emr_id} → {self.mapped_state}"


class PredictionLog(models.Model):
    """LSTM 모델 예측 결과 로깅"""
    timestamp = models.DateTimeField(auto_now_add=True)
    department = models.CharField(max_length=100)
    current_wait_time = models.FloatField()
    predicted_wait_time = models.FloatField()
    actual_wait_time = models.FloatField(null=True, blank=True)  # 추후 실제 값과 비교용
    congestion_level = models.FloatField()
    model_version = models.CharField(max_length=20)

    class Meta:
        indexes = [
            models.Index(fields=['timestamp', 'department']),
        ]

    def __str__(self):
        return f"{self.timestamp.strftime('%Y-%m-%d %H:%M')} - {self.department} Prediction"