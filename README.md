# EduLens AI — Smart Virtual Classroom & Engagement Intelligence

> An AI-powered educational intelligence platform featuring real-time student engagement tracking, a browser-native WebRTC virtual classroom, an Edge AI privacy mode, and a RAG-powered lecture pipeline that transcribes, indexes, and summarizes classes with interactive Q&A.

---

## 🌟 Overview

**EduLens AI** combines browser-native video broadcasting with dual-tier artificial intelligence to deliver actionable educational intelligence for modern virtual learning:

1. **Browser-Native WebRTC Classroom:** Broadcast high-definition video and audio directly in the web browser without external subscriptions (no Zoom, Twilio, or Agora needed).
2. **Dual-Mode Engagement Intelligence:**
   - **Server CNN Mode:** A custom PyTorch Multi-Task CNN (`MultiTaskEngagementCNN`) that simultaneously classifies student attention (DAiSEE) and emotional state (AffectNet) at 1 FPS via WebSockets.
   - **Edge AI (Privacy Mode):** Client-side on-device computer vision that calculates presence, motion dynamics, and focus heuristics directly in the browser—transmitting lightweight numerical telemetry without sending raw camera video over the network.
3. **Lecture RAG Pipeline & Interactive Q&A:** Automated class recording, local Whisper speech-to-text transcription, 384-dimensional dense semantic vector indexing in ChromaDB, and hierarchical Map-Reduce summarization via NVIDIA NIM (`google/gemma-2-9b-it`).
4. **Interactive "Ask Lecture AI":** Students and educators can ask natural-language questions about any completed lecture and receive instant answers grounded in semantic transcript excerpts with timestamp citations.

---

## ✨ Features

| Feature | Description |
|---|---|
| **WebRTC Virtual Classroom** | High-performance peer-to-peer live video broadcast with bitrate optimization (600 kbps cap) and connection heartbeats. |
| **Real-Time Class Lobby** | Auto-polling lobby (5s interval) displaying active live broadcasts, completed sessions, and duration counters. |
| **Dual-Mode Focus Lens** | Student-controlled webcam tracking with instant switching between **Server PyTorch CNN** and **100% Private Edge AI**. |
| **Multi-Task Neural CNN** | Shared 4-layer convolutional backbone with dual classification heads for 4-class attention and 8-class emotion. |
| **Pedagogical Alert System** | Automated real-time alerts flagging sustained student struggle, disengagement, confusion, or drowsiness. |
| **Interactive "Ask Lecture AI"** | Semantic vector search over ChromaDB enabling interactive Q&A against lecture transcripts. |
| **Map-Reduce Summarizer** | Hierarchical multi-stage summarization capable of synthesizing 1-hour lectures without LLM context overflows. |
| **Offline Extractive Fallback** | Generates instant extractive class summaries even when external LLM API keys are unconfigured. |
| **Teacher Command Center** | Real-time engagement curves (Recharts Area), emotion distributions (Pie), audio upload, RAG notepad, and export tools. |
| **Student Focus Hub** | Personal engagement trendline, active session metrics, and immediate attention feedback. |
| **Audit & Compliance Export** | Single-click export of complete session telemetry, student IDs, timestamps, and aggregated focus statistics in JSON format. |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — Single Page Application (SPA) architecture
- **Tailwind CSS 3** — Utility-first styling with custom warm educational tokens
- **Framer Motion** — Physics-based fluid component animations
- **Recharts** — Responsive time-series Area charts and emotion Pie charts
- **Lucide React** — Unified, lightweight SVG iconography
- **React Router DOM v6** — Protected role-based client routing (`teacher` vs `student`)
- **React Webcam** — HTML5 canvas frame capture

### Backend
- **FastAPI** — High-performance asynchronous Python REST API
- **WebSockets** — Bidirectional real-time signaling and 1 FPS frame telemetry
- **Motor** — Asynchronous MongoDB driver for Python
- **python-jose** — Cryptographic JWT creation and validation
- **PassLib (Bcrypt)** — Secure password hashing and salt verification

### AI / Machine Learning
- **PyTorch** — Custom `MultiTaskEngagementCNN` dual-head convolutional network
- **OpenAI Whisper-tiny** — Local CPU speech-to-text transcription via Hugging Face Transformers
- **Sentence-Transformers** — 384-dimensional dense semantic embeddings (`all-MiniLM-L6-v2`)
- **ChromaDB** — Local persistent vector database for semantic chunk retrieval
- **NVIDIA NIM (Gemma-2-9b-it)** — LLM-powered Map-Reduce summarization and lecture Q&A
- **OpenCV & Pillow** — Frame decoding, normalization, and image processing

### Database
- **MongoDB** (Local instance) — Primary store for `users`, `sessions`, and `engagement_logs`

---

## 🏗️ Architecture

```
                                  EduLens AI Architecture
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      ▼                                                                             ▼
Teacher Client (React 18)                                                   Student Client (React 18)
├── WebRTC Broadcast (600kbps)                                              ├── WebRTC Viewer Canvas
├── RAG Summary & "Ask AI" Notepad                                          ├── Dual-Mode Focus Lens
└── Recharts Live Telemetry Deck                                            └── Personal Trendline
      │                                                                             │
      │ REST / WebSocket                                                            │ WebSocket Telemetry
      └──────────────────────────────────────┬──────────────────────────────────────┘
                                             ▼
                             FastAPI Backend Service (Port 8000)
    ┌────────────────────────────────────────┼────────────────────────────────────────┐
    ▼                                        ▼                                        ▼
/auth & /sessions                    /sessions/{id}/ws                        /reports/{id}
├── JWT Verification                 ├── Base64 Frame Decoding                ├── WebM Audio Ingestion
└── MongoDB (Motor)                  ├── PyTorch Multi-Task CNN               ├── Whisper-tiny Transcription
                                     ├── Edge Telemetry Ingestion             ├── ChromaDB Vector Embeddings
                                     └── Heuristic Fallback Engine            └── Gemma-2 Map-Reduce & Q&A
```

---

## ⚡ Quick Start (Windows)

The fastest way to launch the entire ecosystem is with the one-click launcher:

```bat
startup.bat
```

This will automatically:
1. Start the local MongoDB service
2. Launch the FastAPI backend at `http://localhost:8000`
3. Launch the React dev server at `http://localhost:3000`

---

## 🔧 Manual Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** and **npm**
- **MongoDB** installed and running locally on port `27017`
- *(Optional)* **NVIDIA NIM API Key** — get a free key at [build.nvidia.com](https://build.nvidia.com) for Gemma-2 synthesis.

---

### 1. Configure Environment Variables

Create a `.env` file in the **project root**:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=engagement_tracker
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NVIDIA_API_KEY=nvapi-your_nvidia_nim_key_here
```

*(Note: If `NVIDIA_API_KEY` is not provided, the platform automatically activates offline extractive summarization).*

---

### 2. Backend Setup

```bash
# 1. (Recommended) Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # On Windows
# source venv/bin/activate   # On macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Model Weights Placement
# Ensure your pre-trained weights file is located at:
# backend/ai/custom_model/multi_task_cnn_epoch_15.pth
# (If missing, the system automatically activates Heuristic Fallback Mode)

# 4. Start the FastAPI backend
python -m backend.main
```

- Backend API: **`http://localhost:8000`**
- Interactive Swagger Docs: **`http://localhost:8000/docs`**

---

### 3. Frontend Setup

```bash
# In a new terminal window:
npm install

# Start the React development server
npm start
```

- Frontend App: **`http://localhost:3000`**

---

## 📁 Project Directory Structure

```
EduLens-AI/
├── backend/
│   ├── main.py                     # FastAPI entry point, CORS, and lifecycle
│   ├── ai/
│   │   ├── custom_model/
│   │   │   ├── model.py            # MultiTaskEngagementCNN PyTorch architecture
│   │   │   ├── inference.py        # EngagementAI wrapper with heuristic fallback
│   │   │   ├── train.py            # Offline training script for DAiSEE & AffectNet
│   │   │   └── multi_task_cnn_epoch_15.pth  # (Ignored by git - placed locally)
│   │   └── rag.py                  # Whisper-tiny, MiniLM, ChromaDB & Gemma-2 Map-Reduce
│   ├── models/
│   │   ├── user.py                 # User authentication schemas (Pydantic)
│   │   └── session.py              # Session & EngagementLog schemas
│   ├── routes/
│   │   ├── auth.py                 # Register, login, and JWT validation
│   │   ├── session.py              # Session CRUD & 1 FPS WebSocket frame ingestion
│   │   ├── analytics.py            # Aggregations, time-series curves, & disengagement alerts
│   │   ├── reports.py              # JSON export, WebM audio upload, & "Ask AI" endpoint
│   │   └── webrtc.py               # WebRTC signaling hub with Redis Pub/Sub support
│   ├── services/
│   │   └── database.py             # Async MongoDB Motor connection helpers
│   └── utils/
│       ├── auth.py                 # Bcrypt hashing & JWT token generators
│       └── scoring.py              # Multi-factor engagement metric formula
├── src/
│   ├── components/
│   │   ├── Navbar.js               # Glassmorphic header with role indicators
│   │   └── WebcamFeed.js           # Focus Lens with Server CNN / Edge AI toggle
│   ├── pages/
│   │   ├── Login.js                # Split-screen animated sign-in
│   │   ├── Register.js             # Student / Teacher role registration
│   │   ├── StudentDashboard.js     # Live lobby, webcam tracker, and personal charts
│   │   ├── TeacherDashboard.js     # Lecture deck, stats cards, Recharts, & Lecture AI Q&A
│   │   └── VirtualClassroom.js     # Bitrate-tuned WebRTC streaming theater
│   ├── services/
│   │   └── api.js                  # Axios client with automatic Bearer JWT interceptor
│   ├── App.js                      # Root router with role-based PrivateRoutes
│   └── index.css                   # Tailwind directives, animations, and custom scrollbars
├── public/
│   ├── index.html                  # HTML entry point
│   └── illustration.png            # Hero artwork for auth screens
├── startup.bat                     # Windows one-click launcher
├── requirements.txt                # Pinned Python dependencies
├── package.json                    # Node dependencies and scripts
├── tailwind.config.js              # Custom warm design tokens and typography
├── .gitignore                      # Security rules (excludes .pth, chroma_db, .env, media)
└── README.md                       # Project documentation
```

---

## 🎨 Design System

The interface uses a warm, distraction-free educational palette:

| Token | Hex | Usage |
|---|---|---|
| `cream-50` | `#FFFDF8` | Primary page canvas |
| `coral` | `#E07A5F` | Primary CTAs, live indicators, key highlights |
| `sage` | `#81B29A` | High attention indicators, success states, Edge AI |
| `amberGold` | `#F2CC8F` | Warnings, lobby indicators |
| `ink` | `#3D405B` | Primary typography and headings |
| `lavender` | `#E6E1F9` | Lecture AI responses and teacher role badges |

- **Display Font:** `Outfit` (headings, badges, counters)
- **Body Font:** `Plus Jakarta Sans` (interface elements, inputs, telemetry)

---

## 🔑 User Workflow

1. **Register:** Create an account as a **Teacher** or **Student** at `/register`.
2. **Teacher Workflow:**
   - Log in $\to$ Enter a topic name $\to$ Click **Create Lecture**.
   - Click **Go Live (WebRTC)** to open the broadcasting theater.
   - Microphones and cameras stream peer-to-peer. The lecture audio is automatically recorded in the background.
   - When finished, click **End Session** — audio is uploaded to the RAG pipeline.
   - View real-time attention charts, inspect the generated AI notes, or use **Ask Lecture AI** to query the lecture.
3. **Student Workflow:**
   - Log in $\to$ Observe the **Classroom Lobby** (auto-updates every 5s).
   - Click **Join Focus Room** $\to$ Click **Open Video Stream** to view the live broadcast.
   - Activate the **Focus Lens**:
     - Select **Server CNN** for full PyTorch facial emotion classification.
     - Select **Edge AI** for 100% private, on-device focus tracking.
   - Review your personal focus trajectory in the **Engagement Trend** chart.

---

## 🔒 Security & Privacy

- **Large Model Weights (`*.pth`):** Excluded from version control via `.gitignore` to prevent repository bloat and accidental commits.
- **Edge AI Privacy Mode:** Processes facial presence and dynamics locally in the student's browser canvas; no video feeds or photos leave the client device in this mode.
- **Local Speech Pipeline:** Audio transcription (Whisper-tiny) and vector storage (ChromaDB) operate on-premises.

---

## 📜 License

This project is licensed under the **MIT License** — feel free to adapt and build upon EduLens AI.
