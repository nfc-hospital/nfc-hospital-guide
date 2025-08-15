from rest_framework import serializers
from .models import User

# 이 Serializer는 다른 모델에서 User 정보를 참조할 때 사용됩니다.
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'state']

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'state']
