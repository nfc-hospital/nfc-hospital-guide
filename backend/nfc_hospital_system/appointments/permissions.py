# appointments 앱 권한 설정 
from rest_framework import permissions 


class IsPatientOwner(permissions.BasePermission):
    """
    환자 본인만 접근 가능하도록 하는 권한
    """
    
    def has_permission(self, request, view):
        # 인증된 사용자만 접근 가능
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Appointment 객체의 경우
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # ExamResult 객체의 경우
        if hasattr(obj, 'appointment'):
            return obj.appointment.user == request.user
        
        return False


class IsPatientOrStaff(permissions.BasePermission):
    """
    환자 본인 또는 의료진만 접근 가능
    """
    
    def has_permission(self, request, view):
        # 인증된 사용자만 접근 가능
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # 의료진은 모든 접근 가능
        if request.user.is_staff or request.user.role in ['staff', 'dept-admin', 'super-admin']:
            return True
        
        # 환자는 본인 데이터만 접근 가능
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        if hasattr(obj, 'appointment'):
            return obj.appointment.user == request.user
        
        return False
