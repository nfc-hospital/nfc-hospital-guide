#!/usr/bin/env python
"""
Test WebSocket client to verify dashboard connection
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws/admin/dashboard/"
    
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Send a test message
            test_message = {
                "type": "request_update"
            }
            await websocket.send(json.dumps(test_message))
            print("📤 Sent request_update message")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received response: {response[:200]}...")
                
                response_data = json.loads(response)
                if response_data.get('type') == 'dashboard_update':
                    print("✅ Dashboard update received successfully!")
                    print("✅ WebSocket dashboard functionality is working!")
                else:
                    print(f"⚠️ Unexpected response type: {response_data.get('type')}")
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"❌ WebSocket connection closed: {e}")
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())