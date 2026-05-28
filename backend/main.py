from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import auth, session, analytics, reports, webrtc
from backend.services.database import close_mongo_connection
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_mongo_connection()

app = FastAPI(title="Smart E-Learning Engagement Tracker", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(auth.router)
app.include_router(session.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(webrtc.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Smart E-Learning Engagement Tracker API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
