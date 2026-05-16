# EduLens AI — Smart Virtual Classroom & Engagement Tracker

A complete, production-ready AI-powered e-learning platform that combines **real-time student engagement monitoring**, a built-in **WebRTC Virtual Classroom** (like Zoom, built from scratch), and a **RAG-powered AI Pipeline** that automatically records class audio and generates professional meeting summaries.

---

## 🚀 Features

| Feature | Description |
|---|---|
| **WebRTC Virtual Classroom** | Browser-to-browser live video streaming (no third-party like Zoom needed) |
| **Class Lobby** | Students see a live "🔴 Live Now" lobby that auto-refreshes — click "Join Class" to enter |
| **Session Lifecycle Tracking** | Sessions track `started_at`, `ended_at`, and `duration_seconds` — visible in Teacher Dashboard |
| **Auto AI Summarization** | Class audio silently recorded & sent to NVIDIA NIM (Gemma) via RAG pipeline on class end |
| **Real-Time Engagement AI** | Custom PyTorch Multi-Task CNN analyzes student facial expressions via webcam |
| **JWT Authentication** | Secure role-based login for Students and Teachers |
| **Teacher Dashboard** | Live engagement stats, emotion charts, alerts, post-class AI summaries, session history |
| **Student Dashboard** | Live class lobby, join sessions, view personal engagement score and emotion feedback |
| **MongoDB Backend** | All session data, analytics, timing, and user accounts persisted locally |

---

## 🛠️ Tech Stack

**Backend:** FastAPI · WebSockets · WebRTC Signaling · MongoDB (Motor) · Python 3.9+  
**AI / ML:** PyTorch (ResNet-18 Multi-Task CNN) · OpenAI Whisper · ChromaDB · Sentence-Transformers · NVIDIA NIM (Gemma-2-9b)  
**Frontend:** React.js · Tailwind CSS · Recharts  

---

## ⚡ Quick Start (Windows)

Double-click `startup.bat` in the project root. It will automatically:
1. Start MongoDB
2. Start the FastAPI backend (`http://localhost:8000`)
3. Start the React frontend (`http://localhost:3000`)

---

## 🔧 Manual Setup

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run backend
python -m backend.main
```

### Frontend
```bash
npm install
npm start
```

---

## 📁 Project Structure

```
PS2/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── routes/
│   │   ├── auth.py          # JWT login & register
│   │   ├── session.py       # WebSocket engagement stream
│   │   ├── analytics.py     # Engagement stats
│   │   ├── reports.py       # RAG audio upload & AI summary
│   │   └── webrtc.py        # WebRTC signaling server
│   ├── ai/
│   │   ├── custom_model/    # PyTorch Multi-Task CNN
│   │   └── rag.py           # Whisper + ChromaDB + NVIDIA NIM pipeline
│   ├── models/              # Pydantic schemas
│   └── services/            # MongoDB connection
├── src/
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── TeacherDashboard.js
│   │   ├── StudentDashboard.js
│   │   └── VirtualClassroom.js  # WebRTC room
│   ├── components/
│   └── services/api.js
├── startup.bat              # One-click launcher
├── requirements.txt
└── package.json
```

---

## 📝 Environment Variables

Create a `.env` file in the project root:
```
MONGODB_URL=mongodb://localhost:27017/
JWT_SECRET=your_secret_key_here
NVIDIA_API_KEY=your_nvidia_nim_api_key_here
```
