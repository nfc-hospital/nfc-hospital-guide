from rest_framework.response import Response
from rest_framework import status

def custom_404(request, exception):
    """
    404 Not Found 오류를 처리하는 커스텀 뷰입니다.
    """
    return Response(
        {"success": False, "message": "요청한 페이지를 찾을 수 없습니다."},
        status=status.HTTP_404_NOT_FOUND,
    )

def custom_500(request):
    """
    500 Internal Server Error를 처리하는 커스텀 뷰입니다.
    """
    return Response(
        {"success": False, "message": "서버 오류가 발생했습니다."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )