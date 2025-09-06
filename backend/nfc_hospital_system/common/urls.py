from django.urls import path
from .views import StateDefinitionsView

urlpatterns = [
    path('', StateDefinitionsView.as_view(), name='state-definitions'),
]