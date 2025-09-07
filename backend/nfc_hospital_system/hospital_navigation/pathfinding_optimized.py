"""
Optimized Pathfinding Algorithm with Multi-Floor Support
Includes caching mechanisms and detailed floor information in coordinates
"""

import heapq
import json
from typing import List, Dict, Tuple, Optional, Set
from django.core.cache import cache
from django.db.models import Prefetch
from .models import NavigationNode, NavigationEdge, HospitalMap
import math
import logging

logger = logging.getLogger(__name__)

class OptimizedPathfinding:
    """Optimized pathfinding class with caching and multi-floor support"""
    
    def __init__(self):
        self.graph_cache_key = "hospital_navigation_graph"
        self.node_cache_key = "hospital_navigation_nodes"
        self.cache_timeout = 3600  # 1 hour
        
    def get_cached_graph(self) -> Optional[Dict]:
        """Get cached graph structure"""
        return cache.get(self.graph_cache_key)
    
    def set_cached_graph(self, graph: Dict):
        """Cache graph structure"""
        cache.set(self.graph_cache_key, graph, self.cache_timeout)
    
    def get_cached_nodes(self) -> Optional[Dict]:
        """Get cached node data"""
        return cache.get(self.node_cache_key)
    
    def set_cached_nodes(self, nodes: Dict):
        """Cache node data"""
        cache.set(self.node_cache_key, nodes, self.cache_timeout)
    
    def build_graph_structure(self) -> Tuple[Dict, Dict]:
        """
        Build optimized graph structure with caching
        Returns: (graph_dict, nodes_dict)
        """
        # Try to get from cache first
        cached_graph = self.get_cached_graph()
        cached_nodes = self.get_cached_nodes()
        
        if cached_graph and cached_nodes:
            logger.info("Using cached graph structure")
            return cached_graph, cached_nodes
        
        logger.info("Building fresh graph structure")
        
        # Prefetch related data to minimize queries
        nodes = NavigationNode.objects.select_related('hospital_map').all()
        edges = NavigationEdge.objects.select_related('from_node', 'to_node').all()
        
        # Build nodes dictionary with floor information
        nodes_dict = {}
        for node in nodes:
            nodes_dict[node.id] = {
                'id': node.id,
                'name': node.name,
                'node_type': node.node_type,
                'coordinates': {
                    'x': float(node.x_coordinate),
                    'y': float(node.y_coordinate),
                    'map_id': node.hospital_map.id,
                    'floor': node.hospital_map.floor_number,
                    'building': node.hospital_map.building_name
                },
                'is_elevator': node.node_type == 'elevator',
                'is_stairs': node.node_type == 'stairs',
                'accessible': node.is_accessible
            }
        
        # Build adjacency list
        graph_dict = {}
        for node_id in nodes_dict.keys():
            graph_dict[node_id] = []
        
        for edge in edges:
            from_id = edge.from_node.id
            to_id = edge.to_node.id
            
            # Calculate base distance if not provided
            distance = edge.distance
            if not distance:
                from_node = nodes_dict[from_id]
                to_node = nodes_dict[to_id]
                
                # Handle multi-floor distance calculation
                if from_node['coordinates']['floor'] != to_node['coordinates']['floor']:
                    # Floor transition distance (elevator/stairs)
                    floor_diff = abs(from_node['coordinates']['floor'] - to_node['coordinates']['floor'])
                    distance = floor_diff * 4.0  # 4 meters per floor
                else:
                    # Same floor Euclidean distance
                    dx = from_node['coordinates']['x'] - to_node['coordinates']['x']
                    dy = from_node['coordinates']['y'] - to_node['coordinates']['y']
                    distance = math.sqrt(dx**2 + dy**2)
            
            # Add edge information
            edge_info = {
                'to_node': to_id,
                'distance': distance,
                'walk_time': edge.walk_time or (distance / 1.2),  # 1.2 m/s walking speed
                'is_elevator': edge.edge_type == 'elevator',
                'is_stairs': edge.edge_type == 'stairs',
                'floor_transition': nodes_dict[from_id]['coordinates']['floor'] != nodes_dict[to_id]['coordinates']['floor']
            }
            
            graph_dict[from_id].append(edge_info)
            
            # Add reverse edge if bidirectional
            if edge.is_bidirectional:
                reverse_edge_info = edge_info.copy()
                reverse_edge_info['to_node'] = from_id
                graph_dict[to_id].append(reverse_edge_info)
        
        # Cache the structures
        self.set_cached_graph(graph_dict)
        self.set_cached_nodes(nodes_dict)
        
        logger.info(f"Built graph with {len(nodes_dict)} nodes and {sum(len(edges) for edges in graph_dict.values())} edges")
        return graph_dict, nodes_dict
    
    def calculate_heuristic(self, node1_data: Dict, node2_data: Dict) -> float:
        """
        Calculate heuristic distance between two nodes with multi-floor support
        """
        coords1 = node1_data['coordinates']
        coords2 = node2_data['coordinates']
        
        # Same floor - Euclidean distance
        if coords1['floor'] == coords2['floor']:
            dx = coords1['x'] - coords2['x']
            dy = coords1['y'] - coords2['y']
            return math.sqrt(dx**2 + dy**2)
        
        # Different floors - add floor transition cost
        dx = coords1['x'] - coords2['x']
        dy = coords1['y'] - coords2['y']
        horizontal_distance = math.sqrt(dx**2 + dy**2)
        
        floor_diff = abs(coords1['floor'] - coords2['floor'])
        floor_distance = floor_diff * 4.0  # 4 meters per floor
        
        return horizontal_distance + floor_distance
    
    def reconstruct_path_optimized(self, came_from: Dict, current: int, nodes_dict: Dict) -> List[Dict]:
        """
        Reconstruct path with detailed coordinate information including floor data
        """
        path = []
        
        while current is not None:
            node_data = nodes_dict[current]
            path_point = {
                'node_id': current,
                'name': node_data['name'],
                'node_type': node_data['node_type'],
                'coordinates': {
                    'x': node_data['coordinates']['x'],
                    'y': node_data['coordinates']['y'],
                    'map_id': node_data['coordinates']['map_id'],
                    'floor': node_data['coordinates']['floor'],
                    'building': node_data['coordinates']['building']
                },
                'is_floor_transition': False
            }
            path.append(path_point)
            current = came_from.get(current)
        
        path.reverse()
        
        # Mark floor transitions
        for i in range(len(path) - 1):
            current_floor = path[i]['coordinates']['floor']
            next_floor = path[i + 1]['coordinates']['floor']
            
            if current_floor != next_floor:
                path[i]['is_floor_transition'] = True
                path[i]['transition_to_floor'] = next_floor
                path[i]['transition_type'] = 'elevator' if path[i]['node_type'] == 'elevator' else 'stairs'
        
        return path
    
    def find_optimal_route(self, start_node_id: int, end_node_id: int) -> Dict:
        """
        Find optimal route using A* algorithm with multi-floor support
        """
        try:
            graph, nodes = self.build_graph_structure()
            
            if start_node_id not in nodes or end_node_id not in nodes:
                return {
                    'success': False,
                    'error': 'Start or end node not found',
                    'path_coordinates': [],
                    'total_distance': 0,
                    'total_time': 0
                }
            
            # A* algorithm implementation
            open_set = [(0, start_node_id)]
            came_from = {}
            g_score = {start_node_id: 0}
            f_score = {start_node_id: self.calculate_heuristic(nodes[start_node_id], nodes[end_node_id])}
            closed_set = set()
            
            while open_set:
                current = heapq.heappop(open_set)[1]
                
                if current == end_node_id:
                    # Found the goal
                    path = self.reconstruct_path_optimized(came_from, current, nodes)
                    
                    # Calculate totals
                    total_distance = g_score[current]
                    total_time = sum(edge['walk_time'] for node_id in g_score.keys() 
                                   for edge in graph.get(node_id, []) 
                                   if edge['to_node'] in came_from and came_from[edge['to_node']] == node_id)
                    
                    # Group path by floors for frontend
                    floors_involved = list(set(point['coordinates']['floor'] for point in path))
                    floors_involved.sort()
                    
                    return {
                        'success': True,
                        'path_coordinates': path,
                        'total_distance': round(total_distance, 2),
                        'total_time': round(total_time, 1),
                        'floors_involved': floors_involved,
                        'has_floor_transitions': len(floors_involved) > 1,
                        'start_floor': path[0]['coordinates']['floor'] if path else None,
                        'end_floor': path[-1]['coordinates']['floor'] if path else None
                    }
                
                closed_set.add(current)
                
                for edge in graph.get(current, []):
                    neighbor = edge['to_node']
                    
                    if neighbor in closed_set:
                        continue
                    
                    tentative_g_score = g_score[current] + edge['distance']
                    
                    if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        f_score[neighbor] = tentative_g_score + self.calculate_heuristic(nodes[neighbor], nodes[end_node_id])
                        
                        if not any(neighbor == item[1] for item in open_set):
                            heapq.heappush(open_set, (f_score[neighbor], neighbor))
            
            # No path found
            return {
                'success': False,
                'error': 'No path found between the specified nodes',
                'path_coordinates': [],
                'total_distance': 0,
                'total_time': 0
            }
            
        except Exception as e:
            logger.error(f"Error in pathfinding: {str(e)}")
            return {
                'success': False,
                'error': f'Pathfinding error: {str(e)}',
                'path_coordinates': [],
                'total_distance': 0,
                'total_time': 0
            }

# Global instance
pathfinding_service = OptimizedPathfinding()

def calculate_optimized_route(start_node_id, end_node_id) -> Dict:
    """
    Main function to calculate optimized route with multi-floor support
    Now supports both int and str (UUID) node IDs
    """
    return pathfinding_service.find_optimal_route(start_node_id, end_node_id)

def clear_pathfinding_cache():
    """Clear all pathfinding caches"""
    cache.delete(pathfinding_service.graph_cache_key)
    cache.delete(pathfinding_service.node_cache_key)
    logger.info("Pathfinding cache cleared")