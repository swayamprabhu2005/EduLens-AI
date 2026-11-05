from fastapi import APIRouter, Depends, HTTPException
from backend.services.database import get_database
from backend.routes.auth import get_current_user
try:
    from bson import ObjectId
except ImportError:
    class ObjectId(str):
        generation_time = '2026-11-05T00:00:00'
        def __new__(cls, val='507f1f77bcf86cd799439011'):
            return super().__new__(cls, str(val))
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/student/{session_id}")
async def get_student_analytics(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.engagement_logs.find({
        "session_id": session_id,
        "student_id": str(current_user["_id"])
    }).sort("timestamp", 1)
    
    logs = await cursor.to_list(length=1000)
    for log in logs:
        log["_id"] = str(log["_id"])
        
    return logs

@router.get("/teacher/{session_id}")
async def get_teacher_analytics(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    
    # 1. Overall Average Engagement
    pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$total_score"}}}
    ]
    avg_result = await db.engagement_logs.aggregate(pipeline).to_list(1)
    avg_engagement = avg_result[0]["avg_score"] if avg_result else 0
    
    # 2. Emotion Distribution with case-normalization
    emotion_pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {
            "_id": {"$toLower": "$emotion"},
            "count": {"$sum": 1}
        }}
    ]
    raw_dist = await db.engagement_logs.aggregate(emotion_pipeline).to_list(20)
    emotion_dist = {}
    for item in raw_dist:
        key = str(item["_id"]).capitalize() if item["_id"] else "Neutral"
        emotion_dist[key] = emotion_dist.get(key, 0) + item["count"]
        
    if not emotion_dist:
        emotion_dist = {"Neutral": 1}
    
    # 3. Engagement Over Time (Aggregated by minute/time)
    time_pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%H:%M", "date": "$timestamp"}
            },
            "avg_score": {"$avg": "$total_score"}
        }},
        {"$sort": {"_id": 1}}
    ]
    time_series = await db.engagement_logs.aggregate(time_pipeline).to_list(100)
    
    # 4. Pedagogical Focus & Disengagement Alerts
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    
    # Check disengaged / struggling students (low attention or negative emotion states)
    struggling_count = await db.engagement_logs.count_documents({
        "session_id": session_id,
        "timestamp": {"$gte": five_mins_ago},
        "$or": [
            {"attention_score": {"$lte": 0.4}},
            {"emotion": {"$in": ["Sad", "Anger", "Fear", "Contempt", "Disgust", "confused", "bored"]}}
        ]
    })
    
    # Check drowsy/sleeping students
    drowsy_count = await db.engagement_logs.count_documents({
        "session_id": session_id,
        "timestamp": {"$gte": five_mins_ago},
        "$or": [
            {"is_sleeping": True},
            {"is_yawning": True},
            {"attention_score": {"$lte": 0.2}}
        ]
    })
    
    total_active_students = await db.engagement_logs.distinct("student_id", {
        "session_id": session_id,
        "timestamp": {"$gte": five_mins_ago}
    })
    
    active_count = len(total_active_students)
    alerts = []
    
    if active_count > 0:
        struggling_pct = (struggling_count / active_count) * 100
        drowsy_pct = (drowsy_count / active_count) * 100
        
        if struggling_pct >= 40:
            alerts.append(f"{int(struggling_pct)}% of students appear confused or unfocused")
        if drowsy_pct >= 30:
            alerts.append(f"{int(drowsy_pct)}% of students appear drowsy or distracted")
    
    return {
        "avg_engagement": round(avg_engagement, 2),
        "emotion_distribution": emotion_dist,
        "engagement_over_time": time_series,
        "alerts": alerts
    }
