from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from nfc.models import FacilityRoute
from nfc.serializers import FacilityRouteSerializer
import json


class FacilityRouteViewSet(viewsets.ModelViewSet):
    """시설 경로 관리 API"""
    queryset = FacilityRoute.objects.all()
    serializer_class = FacilityRouteSerializer
    permission_classes = [AllowAny]  # 개발 중에는 모두 허용
    lookup_field = 'facility_name'
    
    @action(detail=False, methods=['post'], url_path='save_route')
    def save_route(self, request):
        """경로 데이터 저장 또는 업데이트 (multi-floor 지원)"""
        facility_name = request.data.get('facility_name')

        if not facility_name:
            return Response(
                {'error': '시설 이름이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # metadata에 multi-floor 데이터가 있는지 확인
        metadata = request.data.get('metadata', {})
        is_multi_floor = metadata.get('isMultiFloor', False)

        # 기존 경로가 있으면 업데이트, 없으면 생성
        route, created = FacilityRoute.objects.update_or_create(
            facility_name=facility_name,
            defaults={
                'nodes': request.data.get('nodes', []),
                'edges': request.data.get('edges', []),
                'map_id': request.data.get('map_id', ''),
                'svg_element_id': request.data.get('svg_element_id', ''),
                'metadata': metadata if metadata else {},  # 🆕 metadata 저장
                'created_by': request.user if request.user.is_authenticated else None
            }
        )

        serializer = self.get_serializer(route)

        # 로그 출력
        if is_multi_floor:
            maps_count = len(metadata.get('maps', {}))
            print(f"✅ Multi-floor 경로 저장: {facility_name}, 맵 개수: {maps_count}")
        else:
            print(f"✅ 단일 맵 경로 저장: {facility_name}")

        return Response({
            'message': f"{'Multi-floor ' if is_multi_floor else ''}경로가 {'저장' if created else '업데이트'}되었습니다.",
            'data': serializer.data,
            'isMultiFloor': is_multi_floor,
            'mapsCount': len(metadata.get('maps', {})) if is_multi_floor else 1
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='by_facility')
    def get_by_facility(self, request):
        """시설명으로 경로 조회"""
        facility_name = request.query_params.get('facility_name')
        
        if not facility_name:
            return Response(
                {'error': '시설 이름이 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            route = FacilityRoute.objects.get(facility_name=facility_name)
            serializer = self.get_serializer(route)
            return Response(serializer.data)
        except FacilityRoute.DoesNotExist:
            return Response(
                {'error': f'{facility_name}에 대한 경로가 없습니다.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='all_facilities')
    def list_facilities(self, request):
        """저장된 모든 시설 목록 조회"""
        facilities = FacilityRoute.objects.values_list('facility_name', 'map_id')
        return Response({
            'facilities': [
                {'name': name, 'map_id': map_id} 
                for name, map_id in facilities
            ]
        })
    
    @action(detail=False, methods=['post'], url_path='batch_save')
    def batch_save(self, request):
        """여러 경로 한번에 저장"""
        routes_data = request.data.get('routes', [])
        saved_routes = []
        
        for route_data in routes_data:
            facility_name = route_data.get('facility_name')
            if facility_name:
                route, _ = FacilityRoute.objects.update_or_create(
                    facility_name=facility_name,
                    defaults={
                        'nodes': route_data.get('nodes', []),
                        'edges': route_data.get('edges', []),
                        'map_id': route_data.get('map_id', ''),
                        'svg_element_id': route_data.get('svg_element_id', ''),
                        'created_by': request.user if request.user.is_authenticated else None
                    }
                )
                saved_routes.append(facility_name)
        
        return Response({
            'message': f'{len(saved_routes)}개의 경로가 저장되었습니다.',
            'saved_facilities': saved_routes
        }, status=status.HTTP_200_OK)