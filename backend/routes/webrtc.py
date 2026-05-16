from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any

router = APIRouter(tags=["webrtc"])

# In-memory store for signaling connections
# Structure: { session_id: { "teacher": websocket, "students": { student_id: websocket } } }
rooms: Dict[str, Dict[str, Any]] = {}

@router.websocket("/signaling/{session_id}/{client_type}/{client_id}")
async def signaling_endpoint(websocket: WebSocket, session_id: str, client_type: str, client_id: str):
    await websocket.accept()
    
    if session_id not in rooms:
        rooms[session_id] = {"teacher": None, "students": {}}
        
    if client_type == "teacher":
        rooms[session_id]["teacher"] = websocket
    else:
        rooms[session_id]["students"][client_id] = websocket
        # Notify teacher that a new student joined so teacher can send a WebRTC Offer
        teacher_ws = rooms[session_id].get("teacher")
        if teacher_ws:
            try:
                await teacher_ws.send_json({"type": "viewer_join", "viewer_id": client_id})
            except:
                pass

    try:
        while True:
            data = await websocket.receive_json()
            target_id = data.get("target")
            
            # Route messages (SDP Offers, Answers, ICE Candidates) between teacher and specific student
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
                    # Inject sender id so teacher knows who sent the answer/candidate
                    data["sender"] = client_id
                    try:
                        await teacher_ws.send_json(data)
                    except:
                        pass
                    
    except WebSocketDisconnect:
        if client_type == "teacher":
            rooms[session_id]["teacher"] = None
            # Broadcast to all students that the class ended
            for student_ws in rooms[session_id]["students"].values():
                try:
                    await student_ws.send_json({"type": "class_ended"})
                except:
                    pass
        else:
            if client_id in rooms[session_id]["students"]:
                del rooms[session_id]["students"][client_id]
            # Notify teacher that student left so they can close the WebRTC connection
            teacher_ws = rooms[session_id].get("teacher")
            if teacher_ws:
                try:
                    await teacher_ws.send_json({"type": "viewer_leave", "viewer_id": client_id})
                except:
                    pass
