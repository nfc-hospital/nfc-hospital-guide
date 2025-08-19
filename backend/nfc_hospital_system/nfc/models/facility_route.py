from django.db import models
from django.contrib.postgres.fields import JSONField
import json


class FacilityRoute(models.Model):
    """시설까지의 경로 데이터를 저장하는 모델"""
    
    facility_name = models.CharField(max_length=100, unique=True, db_index=True)
    nodes = models.JSONField(default=list, help_text="경로의 노드 정보")
    edges = models.JSONField(default=list, help_text="노드 간 연결 정보")
    map_id = models.CharField(max_length=50, db_index=True, help_text="지도 ID (예: main_1f)")
    svg_element_id = models.CharField(max_length=100, null=True, blank=True, help_text="SVG 요소 ID")
    metadata = models.JSONField(default=dict, null=True, blank=True, help_text="추가 메타데이터")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'facility_routes'
        ordering = ['facility_name']
        indexes = [
            models.Index(fields=['facility_name', 'map_id']),
        ]
    
    def __str__(self):
        return f"{self.facility_name} - {self.map_id}"
    
    def get_path_length(self):
        """경로의 총 길이를 계산"""
        if not self.nodes or len(self.nodes) < 2:
            return 0
        
        total_length = 0
        for i in range(len(self.nodes) - 1):
            node1 = self.nodes[i]
            node2 = self.nodes[i + 1]
            # 유클리드 거리 계산
            dx = node2['x'] - node1['x']
            dy = node2['y'] - node1['y']
            total_length += (dx**2 + dy**2) ** 0.5
        
        return total_length