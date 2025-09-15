from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Queue, PatientState
from .services import PatientJourneyService

@receiver(post_save, sender=Queue)
def sync_queue_to_patient_state(sender, instance, created, **kwargs):
    """V2: Queue 변경 시 PatientState 동기화"""
    if not created:  # 업데이트일 때만
        try:
            service = PatientJourneyService(user=instance.user)
            service.sync_from_queue_update(instance)
        except Exception as e:
            # 로그만 남기고 에러는 무시
            print(f"Signal sync error: {e}")

@receiver(post_save, sender=PatientState)
def sync_patient_state_to_queue(sender, instance, created, **kwargs):
    """V2: PatientState 변경 시 Queue 동기화"""
    if not created:  # 업데이트일 때만
        try:
            service = PatientJourneyService(user=instance.user)
            service.sync_from_patient_state(instance)
        except Exception as e:
            print(f"Signal sync error: {e}")
