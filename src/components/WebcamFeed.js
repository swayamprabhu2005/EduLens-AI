import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { sessions } from '../services/api';

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
    <div className="relative rounded-lg overflow-hidden shadow-lg bg-black aspect-video">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="w-full h-full object-cover"
        videoConstraints={{ width: 640, height: 480, frameRate: 15 }}
      />
      <div className="absolute bottom-4 left-4 flex space-x-2">
        <button
          onClick={() => setIsCapturing(!isCapturing)}
          className={`px-4 py-2 rounded-full font-medium ${
            isCapturing ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
        >
          {isCapturing ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>
      {isCapturing && (
        <div className="absolute top-4 right-4">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
