# EduLens AI — Smart Virtual Classroom & Engagement Intelligence

> An AI-powered educational intelligence platform featuring real-time student engagement monitoring, a browser-native WebRTC virtual classroom, and a RAG-powered AI pipeline that automatically records, transcribes, and summarizes class lectures.

---

## ✨ Features

| Feature | Description |
|---|---|
| **WebRTC Virtual Classroom** | Browser-to-browser live video streaming — no Zoom or third-party service needed |
| **Class Lobby** | Students see a live 🔴 lobby that auto-refreshes every 5 seconds — click to join a session |
| **Session Lifecycle Tracking** | Sessions track `started_at`, `ended_at`, and `duration_seconds`, visible inside the Teacher Dashboard |
| **Auto AI Summarization** | Class audio silently recorded and sent to the NVIDIA NIM RAG pipeline on class end |
| **Real-Time Engagement AI** | Custom PyTorch Multi-Task CNN analyzes facial expressions, attention, yawning, and emotion via webcam |
| **JWT Authentication** | Secure role-based login system for Students and Teachers with persistent token sessions |
| **Teacher Dashboard** | Live engagement stats, emotion charts, alerts, post-class AI summaries, and session history |
| **Student Dashboard** | Live lobby, webcam focus tracking, personal engagement gauge, and real-time AI feedback |
| **MongoDB Backend** | All session data, analytics, timestamps, and user accounts persisted locally via Motor (async MongoDB driver) |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — Component-based UI framework
- **Tailwind CSS 3** — Utility-first styling with custom warm design tokens
- **Framer Motion** — Smooth page and component entrance animations
- **Recharts** — Responsive engagement trend charts and emotion pie charts
- **Lucide React** — Consistent, clean icon system
- **React Router DOM v6** — Role-based routing and protected routes

### Backend
- **FastAPI** — High-performance async Python REST API
- **WebSockets** — Real-time WebRTC signaling server
- **Motor** — Async MongoDB driver
- **python-jose** — JWT token creation and verification
- **passlib** — Secure bcrypt password hashing

### AI / ML
- **DeepFace + MediaPipe** — Real-time facial landmark and emotion extraction
- **OpenAI Whisper** — Class audio transcription
- **ChromaDB** — Local vector database for RAG pipeline
- **Sentence-Transformers** — Semantic embedding for transcript chunking
- **NVIDIA NIM (Gemma-2-9b)** — LLM-powered class summary generation

### Database
- **MongoDB** (local instance) — Primary data store for sessions, users, and analytics

---

## ⚡ Quick Start (Windows)

The fastest way to launch everything is with the included one-click launcher:

```bash
# From the project root:
startup.bat
```

This will automatically:
1. Start the MongoDB service
2. Launch the FastAPI backend at `http://localhost:8000`
3. Launch the React frontend at `http://localhost:3000`

Each service opens in its own terminal window.

---

## 🔧 Manual Setup

### Prerequisites

- **Python 3.9+**
- **Node.js 18+** and **npm**
- **MongoDB** installed and running locally (default port `27017`)
- **NVIDIA NIM API Key** — get one free at [build.nvidia.com](https://build.nvidia.com)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/EduLens-AI.git
cd EduLens-AI
```

### 2. Configure Environment Variables

Create a `.env` file in the **project root**:

```env
MONGODB_URL=mongodb://localhost:27017/
JWT_SECRET=your_super_secret_key_here
NVIDIA_API_KEY=your_nvidia_nim_api_key_here
```

### 3. Backend Setup

```bash
# (Recommended) Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend
python -m backend.main
```

Backend will be available at: **`http://localhost:8000`**  
Interactive API docs: **`http://localhost:8000/docs`**

### 4. Frontend Setup

```bash
# Install Node dependencies
npm install

# Start the React dev server
npm start
```

Frontend will be available at: **`http://localhost:3000`**

---

## 📁 Project Structure

```
EduLens-AI/
├── backend/
│   ├── main.py                  # FastAPI entry point & CORS config
│   ├── routes/
│   │   ├── auth.py              # JWT login & registration endpoints
│   │   ├── session.py           # Session CRUD & WebSocket frame analysis
│   │   ├── analytics.py         # Student & teacher engagement stats
│   │   ├── reports.py           # Audio upload & RAG AI summary
│   │   └── webrtc.py            # WebRTC signaling server (WebSocket)
│   ├── ai/
│   │   ├── custom_model/        # PyTorch Multi-Task CNN model files
│   │   └── rag.py               # Whisper + ChromaDB + NVIDIA NIM pipeline
│   ├── models/                  # Pydantic request/response schemas
│   └── services/                # MongoDB Motor connection helpers
├── src/
│   ├── pages/
│   │   ├── Login.js             # Split-screen sign-in page
│   │   ├── Register.js          # Student / Teacher registration
│   │   ├── StudentDashboard.js  # Lobby, webcam tracking, engagement chart
│   │   ├── TeacherDashboard.js  # Session deck, stats, RAG summary notepad
│   │   └── VirtualClassroom.js  # Immersive WebRTC streaming theater
│   ├── components/
│   │   ├── Navbar.js            # Glassmorphic sticky navigation shell
│   │   └── WebcamFeed.js        # Webcam capture & frame analysis component
│   ├── services/
│   │   └── api.js               # Axios API client with JWT interceptor
│   ├── App.js                   # Root router with role-based private routes
│   └── index.css                # Global styles, fonts, animations, scrollbars
├── public/
│   └── illustration.png         # Login / Register panel illustration
├── startup.bat                  # One-click Windows launcher
├── requirements.txt             # Python backend dependencies
├── package.json                 # Node frontend dependencies
├── tailwind.config.js           # Custom design tokens (colors, fonts, shadows)
└── .env                         # 🔒 Secret keys — never commit this file
```

---

## 📝 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017/` |
| `JWT_SECRET` | Secret key for signing JWT tokens (keep this private) | `a_long_random_string` |
| `NVIDIA_API_KEY` | API key for NVIDIA NIM (Gemma-2 LLM) | `nvapi-xxxxxxxxxxxx` |

---

## 🎨 Design System

The frontend uses a warm, calm design palette inspired by modern educational tools:

| Token | Color | Usage |
|---|---|---|
| `cream-50` | `#FFFDF8` | Primary page background |
| `coral` | `#E07A5F` | CTA buttons, active states, highlights |
| `sage` | `#81B29A` | Success states, guidelines, analytics |
| `amberGold` | `#F2CC8F` | Warnings, high-engagement alerts |
| `ink` | `#3D405B` | All body and heading text |
| `lavender` | `#E6E1F9` | AI insights, teacher role badges |

Fonts: **Outfit** (display headings) · **Plus Jakarta Sans** (interface text)

---

## 🔑 Default Usage Flow

1. **Register** as a Teacher or Student at `/register`
2. **Teacher:** Log in → Create a session → Click **Go Live (WebRTC)** → Webcam broadcasts to all students in the room. When done, click **End Session** — audio is automatically uploaded to the RAG pipeline.
3. **Student:** Log in → See the live class in the lobby → Click **Join Focus Room** → Enable the **Focus Lens** webcam to start real-time engagement tracking.
4. **After class:** Teacher can upload a recorded audio file and receive an **AI-generated summary** inside the RAG Summary notepad on the Teacher Dashboard.

---

## 📜 License

MIT License — feel free to fork, extend, and build on top of EduLens AI.
