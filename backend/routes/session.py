from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from backend.utils.auth import SECRET_KEY, ALGORITHM
from backend.models.session import SessionCreate, SessionResponse, EngagementLog
from backend.services.database import get_database
from backend.routes.auth import get_current_user
from backend.utils.scoring import calculate_engagement_score
from backend.ai.custom_model.inference import EngagementAI

# Initialize the Custom AI Model once when the server starts
print("Loading Custom AI Model...")
try:
    ai_model = EngagementAI()
    print("AI Model loaded successfully!")
except Exception as e:
    print(f"Failed to load AI Model: {e}")
    ai_model = None
from bson import ObjectId
import cv2
import numpy as np
import base64
from datetime import datetime

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=SessionResponse)
async def create_session(session: SessionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create sessions")
    
    db = get_database()
    session_dict = session.dict()
    session_dict["teacher_id"] = str(current_user["_id"])
    result = await db.sessions.insert_one(session_dict)
    return {**session_dict, "_id": str(result.inserted_id)}

@router.get("/", response_model=list[SessionResponse])
async def list_sessions(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.sessions.find({})
    sessions = await cursor.to_list(length=100)
    for s in sessions:
        s["_id"] = str(s["_id"])
    return sessions

@router.patch("/{session_id}/end")
async def end_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Called when a teacher ends the class. Saves end time and duration to MongoDB."""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can end sessions")
    db = get_database()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    ended_at = datetime.utcnow()
    started_at = session.get("started_at")
    duration_seconds = int((ended_at - started_at).total_seconds()) if started_at else 0
    
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "is_active": False,
            "is_live": False,
            "ended_at": ended_at,
            "duration_seconds": duration_seconds
        }}
    )
    return {"message": "Session ended", "duration_seconds": duration_seconds}

@router.patch("/{session_id}/go_live")
async def go_live(session_id: str, current_user: dict = Depends(get_current_user)):
    """Marks the session as live when teacher starts broadcasting."""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can go live")
    db = get_database()
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"is_live": True, "is_active": True, "started_at": datetime.utcnow()}}
    )
    return {"message": "Session is now live"}


@router.websocket("/{session_id}/ws")
async def websocket_analyze(websocket: WebSocket, session_id: str, token: str = Query(...)):
    await websocket.accept()
    
    # Authenticate via token
    db = get_database()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=1008)
            return
        user = await db.users.find_one({"email": email})
        if not user:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return
        
    student_id = str(user["_id"])
    
    try:
        while True:
            data = await websocket.receive_text()
            
            # Decode image
            try:
                header, encoded = data.split(",", 1)
                nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                # --- NEW CUSTOM AI LOGIC ---
                if ai_model is None:
                    raise Exception("AI Model not loaded")
                    
                ai_result = ai_model.analyze(frame)
                
                emotion = ai_result.get("emotion", "Neutral")
                attention_status = ai_result.get("attention_status", "Low")
                
                # Map textual predictions to scores for the Database
                attention_score_map = {"Very High": 1.0, "High": 0.8, "Low": 0.4, "Very Low": 0.1}
                attention_score = attention_score_map.get(attention_status, 0.5)
                
                emotion_score = 0.8 if emotion in ["Happy", "Surprise", "Neutral"] else 0.3
                
                is_looking = attention_status in ["High", "Very High"]
                is_sleeping = attention_status == "Very Low"
                is_yawning = attention_status == "Low"
                
                total_score = calculate_engagement_score(emotion_score, attention_score)
                
                # 3. Save Log
                log = EngagementLog(
                    session_id=session_id,
                    student_id=student_id,
                    emotion=emotion,
                    is_looking_at_screen=is_looking,
                    is_sleeping=is_sleeping,
                    is_yawning=is_yawning,
                    emotion_score=emotion_score,
                    attention_score=attention_score,
                    interaction_score=0.5, # Default simulated
                    total_score=total_score
                )
                
                await db.engagement_logs.insert_one(log.dict())
                
                await websocket.send_json({
                    "emotion": emotion,
                    "attention_status": attention_status,
                    "engagement_score": total_score
                })
                
            except Exception as e:
                print(f"Frame analysis error: {e}")
                await websocket.send_json({"error": "Invalid image data"})
                
    except WebSocketDisconnect:
        print(f"Client disconnected from session {session_id}")
