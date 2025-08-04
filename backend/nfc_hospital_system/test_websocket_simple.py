#!/usr/bin/env python
"""
Simple WebSocket test without Unicode characters
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws/admin/dashboard/"
    
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("WebSocket connected successfully!")
            
            # Send a test message
            test_message = {
                "type": "request_update"
            }
            await websocket.send(json.dumps(test_message))
            print("Sent request_update message")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"Received response: {response[:200]}...")
                
                response_data = json.loads(response)
                if response_data.get('type') == 'dashboard_update':
                    print("SUCCESS: Dashboard update received!")
                    print("SUCCESS: WebSocket functionality is working!")
                    return True
                else:
                    print(f"Unexpected response type: {response_data.get('type')}")
                    return False
                    
            except asyncio.TimeoutError:
                print("ERROR: Timeout waiting for response")
                return False
            except json.JSONDecodeError as e:
                print(f"ERROR: JSON decode error: {e}")
                return False
                
    except Exception as e:
        print(f"ERROR: WebSocket connection failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_websocket())
    if result:
        print("\n=== FINAL RESULT: SUCCESS ===")
    else:
        print("\n=== FINAL RESULT: FAILED ===")