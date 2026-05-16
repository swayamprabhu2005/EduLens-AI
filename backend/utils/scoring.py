def calculate_engagement_score(emotion_score, attention_score, interaction_score=0.5):
    """
    Score = (Emotion × 0.4) + (Attention × 0.4) + (Interaction × 0.2)
    
    Emotion scoring (input): Engaged=2, Confused=1, Bored=0
    Attention scoring (input): Looking=1, Not looking=0
    Interaction scoring: 0 to 1 (simulated)
    """
    # Normalize emotion score to 0-1 range for consistency in total score
    normalized_emotion = emotion_score / 2.0
    
    score = (normalized_emotion * 0.4) + (attention_score * 0.4) + (interaction_score * 0.2)
    return round(score * 100, 2) # Return as percentage 0-100
