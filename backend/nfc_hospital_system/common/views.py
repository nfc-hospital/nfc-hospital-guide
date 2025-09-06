from rest_framework.views import APIView
from rest_framework.response import Response
from .state_definitions import (
    PatientJourneyState, QueueDetailState, 
    PatientAction, StaffAction,
    STATE_TRANSITIONS, QUEUE_TO_JOURNEY_MAPPING, JOURNEY_TO_QUEUE_MAPPING
)

class StateDefinitionsView(APIView):
    """Frontend에서 상태 정의를 가져올 수 있는 API"""
    authentication_classes = []  # 공개 API
    permission_classes = []
    
    def get(self, request):
        return Response({
            'journey_states': [state.value for state in PatientJourneyState],
            'queue_states': [state.value for state in QueueDetailState],
            'patient_actions': [action.value for action in PatientAction],
            'staff_actions': [action.value for action in StaffAction],
            'state_transitions': self._serialize_transitions(),
            'mappings': {
                'queue_to_journey': {k.value: v.value for k, v in QUEUE_TO_JOURNEY_MAPPING.items()},
                'journey_to_queue': {k.value: v.value for k, v in JOURNEY_TO_QUEUE_MAPPING.items()},
            }
        })
    
    def _serialize_transitions(self):
        result = {}
        for state, transitions in STATE_TRANSITIONS.items():
            result[state.value] = {
                action.value: next_state.value 
                for action, next_state in transitions.items()
            }
        return result