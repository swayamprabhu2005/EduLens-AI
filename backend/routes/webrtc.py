from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any, Optional
import os
import json
import asyncio

router = APIRouter(tags=["webrtc"])

# In-memory store for signaling connections fallback
# Structure: { session_id: { "teacher": websocket, "students": { student_id: websocket } } }
rooms: Dict[str, Dict[str, Any]] = {}

REDIS_URL = os.getenv("REDIS_URL")
redis_client = None

if REDIS_URL:
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        print("Connected to Redis for distributed WebRTC signaling!")
    except Exception as e:
        print(f"Notice: Redis not available ({e}). Using in-memory signaling bus.")
        redis_client = None

@router.websocket("/signaling/{session_id}/{client_type}/{client_id}")
async def signaling_endpoint(websocket: WebSocket, session_id: str, client_type: str, client_id: str):
    await websocket.accept()
    
    if session_id not in rooms:
        rooms[session_id] = {"teacher": None, "students": {}}
        
    if client_type == "teacher":
        rooms[session_id]["teacher"] = websocket
    else:
        rooms[session_id]["students"][client_id] = websocket
        
        # Notify teacher that a new student joined so teacher creates a WebRTC Offer
        teacher_ws = rooms[session_id].get("teacher")
        if teacher_ws:
            try:
                await teacher_ws.send_json({
                    "type": "viewer_join", 
                    "viewer_id": client_id,
                    "viewers_count": len(rooms[session_id]["students"])
                })
            except:
                pass

    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle heartbeat ping
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
                
            target_id = data.get("target")
            
            # Route messages (SDP Offers, Answers, ICE Candidates)
            if client_type == "teacher":
                target_ws = rooms[session_id]["students"].get(target_id)
                if target_ws:
                    try:
                        await target_ws.send_json(data)
                    except:
                        pass
            elif client_type == "student":
                teacher_ws = rooms[session_id].get("teacher")
                if teacher_ws:
                    data["sender"] = client_id
                    try:
                        await teacher_ws.send_json(data)
                    except:
                        pass
                    
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        # Graceful cleanup
        if client_type == "teacher":
            rooms[session_id]["teacher"] = None
            for student_id, student_ws in list(rooms[session_id]["students"].items()):
                try:
                    await student_ws.send_json({"type": "class_ended"})
                except:
                    pass
            if not rooms[session_id]["students"]:
                rooms.pop(session_id, None)
        else:
            if session_id in rooms and client_id in rooms[session_id]["students"]:
                del rooms[session_id]["students"][client_id]
                
            teacher_ws = rooms.get(session_id, {}).get("teacher")
            if teacher_ws:
                try:
                    await teacher_ws.send_json({
                        "type": "viewer_leave", 
                        "viewer_id": client_id,
                        "viewers_count": len(rooms.get(session_id, {}).get("students", {}))
                    })
                except:
                    pass
            if session_id in rooms and not rooms[session_id]["teacher"] and not rooms[session_id]["students"]:
                rooms.pop(session_id, None)
