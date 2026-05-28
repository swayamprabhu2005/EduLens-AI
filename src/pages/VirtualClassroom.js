import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reports, sessions as sessionsApi } from '../services/api';
import { Video, VideoOff, Mic, MicOff, Sparkles, LogOut, Radio, Loader } from 'lucide-react';

const VirtualClassroom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'student';
  const [status, setStatus] = useState('Connecting...');
  const [isRecording, setIsRecording] = useState(false);
  
  // Custom interface states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const peersRef = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const localStreamRef = useRef(null);

  const userId = useRef(Math.random().toString(36).substring(7)).current;
  const SIGNALING_URL = `ws://localhost:8000/signaling/${sessionId}/${role}/${userId}`;

  useEffect(() => {
    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus(role === 'teacher' ? 'Ready to Broadcast. Click the button below.' : 'Connected — Waiting for teacher to start...');
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (role === 'teacher') {
        if (message.type === 'viewer_join') await handleViewerJoin(message.viewer_id);
        else if (message.type === 'answer') {
          const peer = peersRef.current[message.sender];
          if (peer) await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === 'candidate') {
          const peer = peersRef.current[message.sender];
          if (peer) await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      } else {
        if (message.type === 'offer') await handleStudentOffer(message.sdp);
        else if (message.type === 'candidate') {
          const peer = peersRef.current['teacher'];
          if (peer) await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
        } else if (message.type === 'class_ended') {
          setStatus('Class has ended.');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        }
      }
    };

    ws.onerror = () => setStatus('Connection error. Is the backend running?');

    const activePeers = peersRef.current;
    return () => {
      ws.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      Object.values(activePeers).forEach(p => p.close());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── TEACHER LOGIC ──────────────────────────────────────────────
  const startTeacherStream = async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // Fallback: camera-only if mic permission denied
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStatus('Broadcasting Live 🔴');
      // Tell backend this session is now live (saves started_at timestamp)
      try { await sessionsApi.goLive(sessionId); } catch (e) { console.warn('goLive failed', e); }

      // Auto-recorder (silently captures audio for AI summarization)
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
        recorder.onstop = uploadRecordingToRAG;
        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecording(true);
      } catch (recErr) {
        console.warn('Auto-recorder failed (no mic?)', recErr);
      }

    } catch (err) {
      console.error('Camera access failed:', err);
      setStatus('Error: Could not access your Camera. Please allow permissions in your browser.');
    }
  };

  const handleViewerJoin = async (viewerId) => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersRef.current[viewerId] = peer;
    localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));
    peer.onicecandidate = (e) => {
      if (e.candidate) wsRef.current?.send(JSON.stringify({ type: 'candidate', target: viewerId, candidate: e.candidate }));
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    wsRef.current?.send(JSON.stringify({ type: 'offer', target: viewerId, sdp: offer }));
  };

  const endClass = async () => {
    setStatus('Ending class — Uploading recording to AI...');
    // Mark session as ended in MongoDB first
    try { await sessionsApi.endSession(sessionId); } catch (e) { console.warn('endSession failed', e); }
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    else { wsRef.current?.close(); navigate('/teacher'); }
    wsRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const uploadRecordingToRAG = async () => {
    if (recordedChunksRef.current.length === 0) { navigate('/teacher'); return; }
    const blobType = recordedChunksRef.current[0].type || 'audio/webm';
    const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(recordedChunksRef.current, { type: blobType });
    const formData = new FormData();
    formData.append('file', new File([blob], `class_recording.${ext}`, { type: blobType }));
    try {
      await reports.uploadAudio(sessionId, formData);
      alert('Class ended! Audio sent to RAG Pipeline for AI Summarization ✅');
    } catch (err) {
      console.error(err);
      alert('Failed to upload recording. Check backend console.');
    }
    navigate('/teacher');
  };

  // ── STUDENT LOGIC ──────────────────────────────────────────────
  const handleStudentOffer = async (offerSdp) => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersRef.current['teacher'] = peer;
    peer.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('Watching Live Class ✅');
      }
    };
    peer.onicecandidate = (e) => {
      if (e.candidate) wsRef.current?.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
    };
    await peer.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    wsRef.current?.send(JSON.stringify({ type: 'answer', sdp: answer }));
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const isReady = status.includes('Ready');
  const isLive  = status.includes('Live') || status.includes('Watching');

  return (
    <div className="min-h-screen bg-ink-900 text-white p-6 sm:p-10 flex flex-col items-center justify-between font-sans selection:bg-coral-200 selection:text-coral-900">
      
      {/* Header HUD */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
        <div className="flex items-center space-x-3.5">
          <div className="relative w-9 h-9 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-premium">
            <Radio className="w-5 h-5 text-coral animate-breath" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-display font-extrabold text-white flex items-center justify-center sm:justify-start">
              {role === 'teacher' ? '🎓 Lecture Broadcast' : '📺 Student Theater'}
            </h1>
            <p className="text-xs text-ink-300 mt-0.5">{status}</p>
          </div>
        </div>

        <button 
          onClick={role === 'teacher' ? endClass : () => navigate('/student')}
          className="flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-coral hover:text-white border border-white/10 hover:border-coral transition-all active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>{role === 'teacher' ? 'End Session' : 'Leave Class'}</span>
        </button>
      </div>

      {/* Main Theater Display */}
      <div className="w-full max-w-4xl bg-black border border-white/5 rounded-3xl overflow-hidden relative shadow-premium-xl aspect-video flex items-center justify-center">
        {role === 'teacher' ? (
          <>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transform scale-X(-1) transition-all duration-500 ${isVideoOff ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} 
            />

            {/* Stream block splash */}
            {isVideoOff && (
              <div className="absolute inset-0 bg-ink-950 flex flex-col items-center justify-center">
                <VideoOff className="w-12 h-12 text-ink-400 mb-3" />
                <p className="text-xs font-semibold text-ink-300">Camera Feed Disabled</p>
              </div>
            )}

            {/* Broadcast Overlay Splash */}
            {(isReady || status === 'Connecting...') && (
              <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 shadow-premium animate-breath">
                  <Video className="w-7 h-7 text-coral" />
                </div>
                <h3 className="text-lg font-display font-black text-white">Initialize Streaming</h3>
                <p className="text-xs text-ink-300 mt-1 max-w-[280px] leading-relaxed">
                  Turn on your microphone and camera to start your secure WebRTC broadcast to your classroom.
                </p>
                
                <button 
                  onClick={startTeacherStream} 
                  className="mt-6 bg-coral hover:bg-coral-600 text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-coral-soft hover:shadow-premium-lg transition-all active:scale-95 flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-white fill-white" />
                  <span>Start Live Broadcast</span>
                </button>
              </div>
            )}

            {/* Live Indicator capsules */}
            {isLive && (
              <>
                <div className="absolute top-4 left-4 bg-coral px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-premium animate-pulse z-15">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  <span>AI Summarization ON</span>
                </div>
                
                {/* Control bar floating */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-ink-900/80 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl flex items-center space-x-4 shadow-premium-lg z-15">
                  <button 
                    onClick={toggleMic} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isMuted ? 'bg-coral text-white' : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  
                  <button 
                    onClick={toggleVideo} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isVideoOff ? 'bg-coral text-white' : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  
                  <div className="w-[1px] h-6 bg-white/10"></div>
                  
                  <button 
                    onClick={endClass} 
                    className="bg-coral hover:bg-coral-600 px-4 py-2 rounded-xl text-xs font-bold shadow-coral-soft transition-colors text-white"
                  >
                    End Class
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            
            {/* Student splash state if not loaded */}
            {!isLive && (
              <div className="absolute inset-0 bg-ink-950 flex flex-col items-center justify-center p-6 text-center z-10">
                <Loader className="w-8 h-8 text-coral animate-spin mb-4" />
                <h3 className="text-sm font-display font-semibold text-white">Connecting to Lecture...</h3>
                <p className="text-[11px] text-ink-300 mt-1 max-w-[200px] leading-relaxed">
                  Waiting for your teacher to initiate the live camera broadcast.
                </p>
              </div>
            )}
            
            {isLive && (
              <div className="absolute top-4 left-4 bg-sage px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-premium animate-breath z-10">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                <span>Active Broadcast</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info Capsule */}
      <div className="w-full max-w-5xl text-center text-[10px] text-ink-300 font-medium border-t border-white/5 pt-5 mt-6 leading-relaxed">
        EduLens WebRTC streaming pipeline encrypts feeds locally. Real-time facial indicators are logged completely inside secure backend schemas.
      </div>
      
    </div>
  );
};

export default VirtualClassroom;
