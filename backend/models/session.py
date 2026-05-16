from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EngagementLog(BaseModel):
    session_id: str
    student_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    emotion: str
    is_looking_at_screen: bool
    is_sleeping: bool
    is_yawning: bool
    emotion_score: float
    attention_score: float
    interaction_score: float
    total_score: float

class SessionBase(BaseModel):
    title: str
    teacher_id: str
    is_active: bool = True
    is_live: bool = False

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: str = Field(alias="_id")
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    class Config:
        populate_by_name = True

class SessionSummary(BaseModel):
    session_id: str
    avg_engagement: float
    emotion_breakdown: dict
    attentive_time_percentage: float
