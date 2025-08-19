import requests
import json

# 테스트 데이터
data = {
    "facility_name": "응급실",
    "nodes": [
        {"id": "node-1", "x": 450, "y": 100, "name": "정문"},
        {"id": "node-2", "x": 450, "y": 250, "name": "중앙 홀"},
        {"id": "node-3", "x": 200, "y": 250, "name": "응급실 앞"}
    ],
    "edges": [
        ["node-1", "node-2"],
        ["node-2", "node-3"]
    ],
    "map_id": "main_1f",
    "svg_element_id": "dept-emergency"
}

# API 호출
url = "http://localhost:8000/api/v1/nfc/facility-routes/save_route/"
response = requests.post(url, json=data)

print("Status:", response.status_code)
print("Response:", response.json())

# 조회 테스트
get_url = "http://localhost:8000/api/v1/nfc/facility-routes/by_facility/"
params = {"facility_name": "응급실"}
get_response = requests.get(get_url, params=params)

print("\n조회 결과:")
print("Status:", get_response.status_code)
print("Data:", get_response.json())