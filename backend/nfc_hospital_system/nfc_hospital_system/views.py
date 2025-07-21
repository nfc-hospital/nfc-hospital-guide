from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.generic import TemplateView
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
import os


@method_decorator(ensure_csrf_cookie, name='dispatch')
class ReactAppView(TemplateView):
    """
    React SPA를 서빙하는 뷰
    """
    template_name = 'index.html'
    
    def get(self, request, *args, **kwargs):
        try:
            # React 빌드 파일이 있는지 확인
            index_path = os.path.join(settings.REACT_BUILD_DIR, 'index.html')
            if os.path.exists(index_path):
                with open(index_path, 'r', encoding='utf-8') as file:
                    html_content = file.read()
                    
                # CSRF 토큰 주입 (필요한 경우)
                # Django 템플릿 엔진을 사용하지 않고 직접 서빙
                return HttpResponse(html_content)
            else:
                # 빌드 파일이 없으면 개발 서버로 리다이렉트 또는 에러
                if settings.DEBUG:
                    # 개발 환경에서는 React 개발 서버로 프록시
                    return render(request, 'react_dev.html', {
                        'react_dev_server': 'http://localhost:5173'
                    })
                else:
                    return JsonResponse({
                        'error': 'React app not built',
                        'message': 'Please build the React app first'
                    }, status=500)
                    
        except Exception as e:
            return JsonResponse({
                'error': str(e),
                'message': 'Error serving React app'
            }, status=500)


def custom_404(request, exception):
    """
    404 Not Found 오류를 처리하는 커스텀 뷰입니다.
    """
    if request.path.startswith('/api/'):
        # API 요청인 경우 JSON 응답
        return JsonResponse({
            "success": False,
            "message": "요청한 페이지를 찾을 수 없습니다.",
            "path": request.path
        }, status=404)
    else:
        # 일반 요청인 경우 React 앱으로 라우팅 (React Router 처리)
        return ReactAppView.as_view()(request)

def custom_500(request):
    """
    500 Internal Server Error를 처리하는 커스텀 뷰입니다.
    """
    if request.path.startswith('/api/'):
        # API 요청인 경우 JSON 응답
        return JsonResponse({
            "success": False,
            "message": "서버 오류가 발생했습니다."
        }, status=500)
    else:
        # 일반 요청인 경우
        return HttpResponse(
            "<h1>500 - 서버 오류</h1><p>서버 오류가 발생했습니다.</p>",
            status=500
        )