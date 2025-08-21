# authentication 권한 설정 
from rest_framework import permissions 

class IsPatient(permissions.BasePermission):
    """환자 권한 확인"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'

class IsStaff(permissions.BasePermission):
    """직원 권한 확인"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['staff', 'dept-admin', 'super-admin']

class IsDeptAdmin(permissions.BasePermission):
    """부서 관리자 권한 확인"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['dept-admin', 'super-admin']

class IsDeptAdminOrHigher(permissions.BasePermission):
    """부서 관리자 이상 권한 확인"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['dept-admin', 'super-admin']

class IsSuperAdmin(permissions.BasePermission):
    """최고 관리자 권한 확인"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super-admin'

class IsOwnerOrReadOnly(permissions.BasePermission):
    """소유자만 수정 가능, 나머지는 읽기만"""
    def has_object_permission(self, request, view, obj):
        # 읽기는 모두 허용
        if request.method in permissions.SAFE_METHODS:
            return True
        # 수정은 소유자만
        return obj.user == request.user

class IsOwnerOrStaff(permissions.BasePermission):
    """소유자 또는 직원 권한"""
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['staff', 'dept-admin', 'super-admin']:
            return True
        return obj.user == request.user