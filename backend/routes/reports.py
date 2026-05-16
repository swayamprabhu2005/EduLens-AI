from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from backend.services.database import get_database
from backend.routes.auth import get_current_user
from fastapi.responses import JSONResponse
from bson import ObjectId
import os
import tempfile
import aiofiles

from backend.ai.rag import MeetingRAG

router = APIRouter(prefix="/reports", tags=["reports"])

# Initialize RAG Pipeline (Will load Whisper, MiniLM, and NVIDIA client)
try:
    print("Loading RAG Pipeline Models...")
    rag_pipeline = MeetingRAG()
    print("RAG Pipeline Ready!")
except Exception as e:
    print(f"Failed to load RAG pipeline: {e}")
    rag_pipeline = None

@router.get("/{session_id}/export")
async def export_report(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    
    # Fetch session info
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Fetch all logs for this session
    logs_cursor = db.engagement_logs.find({"session_id": session_id})
    logs = await logs_cursor.to_list(length=10000)
    
    # Calculate Summary
    total_logs = len(logs)
    if total_logs == 0:
        return {"message": "No data available for this session"}
        
    avg_engagement = sum(log["total_score"] for log in logs) / total_logs
    
    emotions = {}
    attentive_count = 0
    for log in logs:
        emotions[log["emotion"]] = emotions.get(log["emotion"], 0) + 1
        if log["is_looking_at_screen"] and not log["is_sleeping"]:
            attentive_count += 1
            
    emotion_breakdown = {k: (v/total_logs)*100 for k, v in emotions.items()}
    attentive_time_pct = (attentive_count / total_logs) * 100
    
    report = {
        "session_title": session["title"],
        "teacher_id": str(session["teacher_id"]),
        "generated_at": str(ObjectId().generation_time),
        "summary": {
            "average_engagement_score": round(avg_engagement, 2),
            "attentive_time_percentage": round(attentive_time_pct, 2),
            "emotion_breakdown_percentage": emotion_breakdown,
            "total_data_points": total_logs
        },
        "raw_data": [
            {
                "timestamp": str(log["timestamp"]),
                "student_id": log["student_id"],
                "emotion": log["emotion"],
                "score": log["total_score"]
            } for log in logs
        ]
    }
    
    return report

@router.post("/{session_id}/upload_audio")
async def upload_meeting_audio(
    session_id: str, 
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload audio")
        
    if rag_pipeline is None:
        raise HTTPException(status_code=500, detail="RAG Pipeline not available")
        
    # Save the uploaded file temporarily
    try:
        fd, temp_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        
        async with aiofiles.open(temp_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
            
        # Process audio using RAG (Transcribe -> Embed -> Save to DB)
        transcript = rag_pipeline.process_audio(temp_path, session_id)
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return {"message": "Audio processed and saved to Vector Database", "transcript": transcript}

@router.get("/{session_id}/ai_summary")
async def get_ai_summary(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access summaries")
        
    if rag_pipeline is None:
        raise HTTPException(status_code=500, detail="RAG Pipeline not available")
        
    # Ask the NVIDIA LLM to generate a summary from the database context
    try:
        summary = rag_pipeline.generate_summary(session_id)
        return {"session_id": session_id, "ai_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
