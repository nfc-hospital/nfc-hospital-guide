from django.apps import AppConfig


class NfcConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'nfc'
    
    def ready(self):
        import nfc.signals
