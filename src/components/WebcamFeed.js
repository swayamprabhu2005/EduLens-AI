import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Eye, EyeOff, Camera, ShieldCheck, Cpu } from 'lucide-react';

const WebcamFeed = ({ sessionId, onAnalysis }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState('server'); // 'server' or 'edge'
  const wsRef = useRef(null);
  const prevFrameData = useRef(null);

  // Client-side Edge AI analysis (Lightweight Canvas Computer Vision)
  const computeEdgeMetrics = useCallback(() => {
    if (!webcamRef.current?.video) return null;
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 160;
      canvasRef.current.height = 120;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, 160, 120);

    const frame = ctx.getImageData(0, 0, 160, 120);
    const data = frame.data;
    let brightnessSum = 0;
    let movementDiff = 0;

    for (let i = 0; i < data.length; i += 16) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      brightnessSum += avg;

      if (prevFrameData.current) {
        movementDiff += Math.abs(avg - prevFrameData.current[i]);
      }
    }

    prevFrameData.current = new Uint8Array(data);

    const sampleCount = data.length / 16;
    const avgBrightness = brightnessSum / sampleCount;
    const avgMotion = movementDiff / sampleCount;

    // Presence & engagement heuristic
    const isPresent = avgBrightness > 25 && avgBrightness < 240;
    let attention_status = 'High';
    let engagement_score = 82;

    if (!isPresent) {
      attention_status = 'Very Low';
      engagement_score = 15;
    } else if (avgMotion > 45) {
      // High fidgeting / rapid movement away
      attention_status = 'Low';
      engagement_score = 48;
    } else if (avgMotion >= 2 && avgMotion <= 35) {
      // Natural subtle head motion while looking at screen
      attention_status = 'Very High';
      engagement_score = 92;
    }

    return {
      type: 'edge_telemetry',
      attention_status,
      emotion: 'Neutral',
      engagement_score
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isCapturing) {
      const token = localStorage.getItem('token');
      const wsUrl = `ws://localhost:8000/sessions/${sessionId}/ws?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error("Analysis error:", data.error);
          } else {
            onAnalysis(data);
          }
        } catch (e) {
          console.error("WS Parse error:", e);
        }
      };

      wsRef.current.onopen = () => {
        interval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            if (mode === 'edge') {
              // Edge AI Mode: Compute locally, transmit lightweight JSON telemetry only
              const telemetry = computeEdgeMetrics();
              if (telemetry) {
                wsRef.current.send(JSON.stringify(telemetry));
              }
            } else {
              // Server AI Mode: Transmit camera frame for PyTorch MultiTask CNN
              if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                  wsRef.current.send(imageSrc);
                }
              }
            }
          }
        }, 1000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isCapturing, sessionId, mode, onAnalysis, computeEdgeMetrics]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-premium-lg border-4 border-white bg-cream-200 aspect-video transition-all duration-300">
      {/* Webcam View */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className={`w-full h-full object-cover transition-all duration-500 ${isCapturing ? 'brightness-100 scale-100' : 'brightness-[0.4] scale-[1.02] blur-xs'}`}
        videoConstraints={{ width: 640, height: 480, frameRate: 15 }}
      />

      {/* Inactive Overlay */}
      {!isCapturing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 p-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center mb-3">
            <Camera className="w-6 h-6 text-cream-50" />
          </div>
          <p className="text-sm font-semibold tracking-wide font-display">Attention Analysis Paused</p>
          <p className="text-xs text-cream-100 mt-1 max-w-[240px] text-center opacity-80">Enable your webcam to start active educational metrics.</p>
        </div>
      )}

      {/* Active State HUD Highlight */}
      {isCapturing && (
        <div className="absolute inset-0 border-2 border-sage/60 rounded-3xl pointer-events-none animate-breath"></div>
      )}

      {/* Mode Selector Pill (Server CNN vs Edge AI) */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1.5 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-cream-200 shadow-premium">
        <button
          onClick={() => setMode('server')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${
            mode === 'server'
              ? 'bg-ink text-white shadow-premium'
              : 'text-ink-500 hover:text-ink hover:bg-cream-100'
          }`}
          title="Sends frames to backend PyTorch CNN"
        >
          <Cpu className="w-3 h-3" />
          <span>Server CNN</span>
        </button>

        <button
          onClick={() => setMode('edge')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${
            mode === 'edge'
              ? 'bg-sage text-white shadow-sage-soft'
              : 'text-ink-500 hover:text-ink hover:bg-cream-100'
          }`}
          title="100% Private: Analyzes locally on your device"
        >
          <ShieldCheck className="w-3 h-3 text-sage-200" />
          <span>Edge AI (Private)</span>
        </button>
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-4 z-10">
        <button
          onClick={() => setIsCapturing(!isCapturing)}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-premium active:scale-95 ${
            isCapturing 
              ? 'bg-coral text-white hover:bg-coral-600 shadow-coral-soft' 
              : 'bg-white hover:bg-cream-50 text-ink border border-cream-200'
          }`}
        >
          {isCapturing ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Stop Focus Lens</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Start Focus Lens</span>
            </>
          )}
        </button>
      </div>

      {/* Recording Pulse Tag */}
      {isCapturing && (
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-sage-50/90 backdrop-blur-md px-3 py-1 border border-sage-200 text-sage-800 rounded-full shadow-premium animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sage"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider">
            {mode === 'edge' ? 'EDGE AI ACTIVE' : 'CNN AI ACTIVE'}
          </span>
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
