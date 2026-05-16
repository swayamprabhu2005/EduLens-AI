import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reports, sessions as sessionsApi } from '../services/api';

const VirtualClassroom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'student';
  const [status, setStatus] = useState('Connecting...');
  const [isRecording, setIsRecording] = useState(false);

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

    return () => {
      ws.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(p => p.close());
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

  const isReady = status.includes('Ready');
  const isLive  = status.includes('Live');

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#2dd4bf', margin: 0 }}>
          {role === 'teacher' ? '🎓 Teacher — Live Classroom' : '📺 Student — Live Class'}
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{status}</p>
      </div>

      {/* Video Area */}
      <div style={{
        width: '100%', maxWidth: '900px',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: '1rem',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
      }}>
        {role === 'teacher' ? (
          <>
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

            {/* Start overlay */}
            {(isReady || status === 'Connecting...') && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 10
              }}>
                <div style={{ fontSize: '3rem' }}>🎥</div>
                <p style={{ color: '#cbd5e1', maxWidth: '320px', textAlign: 'center' }}>
                  Click below to turn on your camera and start broadcasting to students.
                </p>
                <button onClick={startTeacherStream} style={{
                  background: 'linear-gradient(135deg, #0d9488, #059669)',
                  color: 'white', border: 'none', padding: '1rem 2.5rem',
                  borderRadius: '9999px', fontSize: '1.1rem', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 8px 30px rgba(13,148,136,0.4)',
                  transition: 'transform 0.2s'
                }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🚀 Start Broadcast
                </button>
              </div>
            )}

            {/* Live badges */}
            {isLive && (
              <>
                <div style={{
                  position: 'absolute', top: '1rem', left: '1rem',
                  background: '#dc2626', padding: '0.25rem 0.75rem',
                  borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 20,
                  animation: 'pulse 1.5s infinite'
                }}>
                  <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%' }}></div>
                  REC • AI Summarization ON
                </div>
                <button onClick={endClass} style={{
                  position: 'absolute', bottom: '1.5rem',
                  background: '#dc2626', color: 'white', border: 'none',
                  padding: '0.75rem 2rem', borderRadius: '9999px',
                  fontWeight: 700, cursor: 'pointer', zIndex: 20,
                  boxShadow: '0 4px 20px rgba(220,38,38,0.5)'
                }}>
                  ⏹ End Class & Generate AI Summary
                </button>
              </>
            )}
          </>
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
};

export default VirtualClassroom;
