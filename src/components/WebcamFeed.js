import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Eye, EyeOff, Camera } from 'lucide-react';

const WebcamFeed = ({ sessionId, onAnalysis }) => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isCapturing) {
      const token = localStorage.getItem('token');
      const wsUrl = `ws://localhost:8000/sessions/${sessionId}/ws?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Analysis error:", data.error);
        } else {
          onAnalysis(data);
        }
      };

      wsRef.current.onopen = () => {
        interval = setInterval(() => {
          if (webcamRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
              wsRef.current.send(imageSrc);
            }
          }
        }, 1000); // Analyze every 1 second over WebSocket for real-time
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
  }, [isCapturing, sessionId, onAnalysis]);

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
          <span className="text-[10px] font-black uppercase tracking-wider">AI TRACKING ACTIVE</span>
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
