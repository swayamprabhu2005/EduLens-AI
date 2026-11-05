from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from backend.services.database import get_database
from backend.routes.auth import get_current_user
from fastapi.responses import JSONResponse
from pydantic import BaseModel
try:
    from bson import ObjectId
except ImportError:
    class ObjectId(str):
        generation_time = '2026-11-05T00:00:00'
        def __new__(cls, val='507f1f77bcf86cd799439011'):
            return super().__new__(cls, str(val))
import os
import tempfile
import aiofiles

router = APIRouter(prefix="/reports", tags=["reports"])

# Initialize RAG Pipeline resiliently
rag_pipeline = None
try:
    print("Initializing RAG Pipeline...")
    from backend.ai.rag import MeetingRAG
    rag_pipeline = MeetingRAG()
    print("RAG Pipeline Ready!")
except Exception as e:
    print(f"Warning: RAG pipeline not loaded: {e}")
    rag_pipeline = None

class QuestionRequest(BaseModel):
    question: str

@router.get("/{session_id}/export")
async def export_report(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    logs_cursor = db.engagement_logs.find({"session_id": session_id})
    logs = await logs_cursor.to_list(length=10000)
    
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
        raise HTTPException(status_code=500, detail="RAG Pipeline not available. Check server dependencies.")
        
    # Preserve proper audio file extension (.webm, .wav, .mp4, .ogg)
    original_name = file.filename or "recording.webm"
    _, ext = os.path.splitext(original_name)
    if not ext or ext.lower() not in [".webm", ".wav", ".mp4", ".mp3", ".ogg", ".m4a"]:
        ext = ".webm" if "webm" in (file.content_type or "") else ".wav"
        
    try:
        fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(fd)
        
        async with aiofiles.open(temp_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
            
        transcript = rag_pipeline.process_audio(temp_path, session_id)
        
    except Exception as e:
        print(f"Error processing audio upload: {e}")
        raise HTTPException(status_code=500, detail=f"Audio processing error: {e}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
            
    return {"message": "Audio processed and indexed to Vector Database", "transcript": transcript}

@router.get("/{session_id}/ai_summary")
async def get_ai_summary(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access summaries")
        
    if rag_pipeline is None:
        raise HTTPException(status_code=500, detail="RAG Pipeline not available")
        
    try:
        summary = rag_pipeline.generate_summary(session_id)
        return {"session_id": session_id, "ai_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/ask")
async def ask_lecture_ai(
    session_id: str, 
    request: QuestionRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Interactive Lecture Q&A: Uses semantic search over ChromaDB to answer
    specific student or teacher questions about the lecture.
    """
    if rag_pipeline is None:
        raise HTTPException(status_code=500, detail="Lecture AI is currently offline.")
        
    try:
        answer = rag_pipeline.ask_question(session_id, request.question)
        return {"session_id": session_id, "question": request.question, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query lecture AI: {e}")
