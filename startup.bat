@echo off
echo ========================================================
echo          EduLens AI -- Smart Virtual Classroom
echo ========================================================
echo.

echo [1/3] Ensuring MongoDB is running...
net start MongoDB 2>nul
if %errorlevel% neq 0 (
    echo MongoDB is either already running or not installed as a service. Continuing...
) else (
    echo MongoDB started successfully.
)
echo.

echo [2/3] Starting FastAPI Backend...
start "FastAPI Backend" cmd /k "echo Starting Python Backend... && python -m backend.main"

echo [3/3] Starting React Frontend...
start "React Frontend" cmd /k "echo Starting React Server... && npm start"

echo.
echo All services launched in separate windows!
echo Access the frontend at: http://localhost:3000
echo Access the backend at: http://localhost:8000
echo ========================================================
