# p_queue/apps.py
from django.apps import AppConfig

class PQueueConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'p_queue'
    
    def ready(self):
        import p_queue.signals  # 시그널 등록