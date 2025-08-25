from rest_framework import serializers
from .models import User

# 이 Serializer는 다른 모델에서 User 정보를 참조할 때 사용됩니다.
class UserSerializer(serializers.ModelSerializer):
    state = serializers.CharField(source='patient_state.current_state', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['user_id', 'name', 'role', 'state']

class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='user_id', read_only=True)
    phoneNumber = serializers.CharField(source='phone_number', read_only=True)
    birthDate = serializers.DateField(source='birth_date', read_only=True)
    patientId = serializers.CharField(source='patient_id', read_only=True)
    emergencyContact = serializers.CharField(source='emergency_contact', read_only=True)
    lastLoginAt = serializers.DateTimeField(source='last_login_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    state = serializers.CharField(source='patient_state.current_state', read_only=True, allow_null=True)
    currentLocation = serializers.CharField(source='patient_state.current_location', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'name', 'phoneNumber', 'birthDate', 
                  'patientId', 'emergencyContact', 'allergies', 'lastLoginAt', 
                  'createdAt', 'is_active', 'state', 'currentLocation']
