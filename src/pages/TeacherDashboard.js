import React, { useState, useEffect } from 'react';
import { sessions, analytics, reports } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const TeacherDashboard = () => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [mySessions, setMySessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [stats, setStats] = useState(null);
  
  // NEW RAG STATES
  const [aiSummary, setAiSummary] = useState(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let interval;
    if (selectedSession) {
      fetchStats();
      interval = setInterval(fetchStats, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedSession]);

  const fetchSessions = async () => {
    const response = await sessions.list();
    setMySessions(response.data);
  };

  const fetchStats = async () => {
    if (!selectedSession) return;
    try {
      const response = await analytics.getTeacher(selectedSession._id);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats");
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await sessions.create({ title: sessionTitle, teacher_id: '' });
      setSessionTitle('');
      fetchSessions();
    } catch (err) {
      alert("Failed to create session");
    }
  };

  const handleExport = async () => {
    if (!selectedSession) return;
    try {
      const response = await reports.export(selectedSession._id);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `session_report_${selectedSession.title}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      alert("Failed to export report");
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSession) return;
    
    setIsProcessingAudio(true);
    setAiSummary(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // 1. Process Audio
      await reports.uploadAudio(selectedSession._id, formData);
      
      // 2. Fetch AI Summary
      const response = await reports.getAISummary(selectedSession._id);
      setAiSummary(response.data.ai_summary);
    } catch (err) {
      alert("Failed to process audio. Please ensure the backend is running and NVIDIA API Key is valid.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <div className="flex space-x-4">
          {selectedSession && (
            <div className="flex space-x-2">
              <button 
                onClick={() => window.open(`/room/${selectedSession._id}`, '_blank')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center shadow-lg font-bold animate-pulse"
              >
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                Go Live (WebRTC)
              </button>
              <button 
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Report
              </button>
            </div>
          )}
          <form onSubmit={handleCreateSession} className="flex space-x-2">
            <input
              type="text"
              placeholder="New Session Title"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              required
            />
            <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
              Create Session
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border h-fit">
          <h2 className="font-bold mb-4">Your Sessions</h2>
          <div className="space-y-2">
            {mySessions.map(session => (
              <button
                key={session._id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selectedSession?._id === session._id ? 'bg-teal-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold truncate">{session.title}</div>
                <div className="flex items-center gap-1 mt-1">
                  {session.is_live && !session.ended_at && (
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">● LIVE</span>
                  )}
                  {session.ended_at && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">Ended</span>
                  )}
                  {session.duration_seconds > 0 && (
                    <span className={`text-xs ${selectedSession?._id === session._id ? 'text-teal-100' : 'text-gray-400'}`}>
                      {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                    </span>
                  )}
                </div>
              </button>
            ))}
            {mySessions.length === 0 && <p className="text-gray-400 text-sm">No sessions yet.</p>}
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          {selectedSession && stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                  <div className="text-gray-500 text-sm uppercase">Avg Engagement</div>
                  <div className="text-3xl font-black text-teal-600">{stats.avg_engagement}%</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                  <div className="text-gray-500 text-sm uppercase">Active Alerts</div>
                  <div className={`text-3xl font-black ${stats.alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.alerts.length}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                  <div className="text-gray-500 text-sm uppercase">Dominant Emotion</div>
                  <div className="text-3xl font-black text-purple-600">
                    {Object.entries(stats.emotion_distribution).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'}
                  </div>
                </div>
              </div>

              {stats.alerts.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <span className="font-bold">Attention Required:</span> {stats.alerts.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* --- NEW RAG AI SUMMARY SECTION --- */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-6 rounded-xl border border-teal-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-teal-900 text-lg flex items-center">
                    <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Post-Class AI Summary
                  </h3>
                  
                  <div>
                    <input 
                      type="file" 
                      id="audioUpload" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={handleAudioUpload}
                      disabled={isProcessingAudio}
                    />
                    <label 
                      htmlFor="audioUpload" 
                      className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        isProcessingAudio ? 'bg-gray-300 text-gray-500' : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {isProcessingAudio ? 'Transcribing & Analyzing...' : 'Upload Class Audio'}
                    </label>
                  </div>
                </div>
                
                {aiSummary && (
                  <div className="bg-white p-6 rounded-lg border shadow-inner whitespace-pre-wrap text-gray-700">
                    {aiSummary}
                  </div>
                )}
                
                {!aiSummary && !isProcessingAudio && (
                  <div className="text-sm text-gray-500 italic">
                    Upload the class audio recording to instantly generate a professional transcript summary, action items, and student feedback using our RAG Pipeline.
                  </div>
                )}
              </div>
              {/* --------------------------------- */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-bold mb-4">Engagement Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.engagement_over_time}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avg_score" stroke="#2563eb" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-bold mb-4">Emotion Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.emotion_distribution).map(([name, value]) => ({ name, value }))}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {Object.entries(stats.emotion_distribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-teal-50 border-2 border-dashed rounded-xl h-96 flex items-center justify-center text-gray-500">
              Select a session to view real-time analytics
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
