from fastapi import APIRouter, Depends, HTTPException
from backend.services.database import get_database
from backend.routes.auth import get_current_user
from bson import ObjectId
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
    
    # 2. Emotion Distribution
    emotion_pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {"_id": "$emotion", "count": {"$sum": 1}}}
    ]
    emotion_dist = await db.engagement_logs.aggregate(emotion_pipeline).to_list(10)
    
    # 3. Engagement Over Time (Aggregated by 5-min intervals)
    # For simplicity, returning raw logs for now, or could group by time
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
    
    # 4. Alerts
    # Count confused students in last 5 minutes
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    confused_count = await db.engagement_logs.count_documents({
        "session_id": session_id,
        "emotion": "confused",
        "timestamp": {"$gte": five_mins_ago}
    })
    
    total_active = await db.engagement_logs.distinct("student_id", {
        "session_id": session_id,
        "timestamp": {"$gte": five_mins_ago}
    })
    
    confused_percent = (confused_count / len(total_active) * 100) if total_active else 0
    
    alerts = []
    if confused_percent > 50:
        alerts.append(f"{int(confused_percent)}% students confused")
    
    return {
        "avg_engagement": round(avg_engagement, 2),
        "emotion_distribution": {item["_id"]: item["count"] for item in emotion_dist},
        "engagement_over_time": time_series,
        "alerts": alerts
    }
