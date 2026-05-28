import React, { useState, useEffect } from 'react';
import { sessions, analytics, reports } from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, Plus, FileAudio, Sparkles, TrendingUp, AlertTriangle, Users, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherDashboard = () => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [mySessions, setMySessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [stats, setStats] = useState(null);
  
  // RAG STATES
  const [aiSummary, setAiSummary] = useState(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedSession) return;
      try {
        const response = await analytics.getTeacher(selectedSession._id);
        setStats(response.data);
      } catch (err) {
        console.error("Failed to fetch stats");
      }
    };

    let interval;
    if (selectedSession) {
      fetchStats();
      interval = setInterval(fetchStats, 5000);
    } else {
      setStats(null);
      setAiSummary(null);
    }
    return () => clearInterval(interval);
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const response = await sessions.list();
      setMySessions(response.data);
    } catch (err) {
      console.error("Failed to fetch sessions");
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

  // Cohesive warm palette for charts
  const CHART_COLORS = ['#81B29A', '#F2CC8F', '#E07A5F', '#E6E1F9', '#3D405B'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 animate-slide-up pb-12"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-cream-200/50 shadow-premium">
        <div>
          <h1 className="text-2xl font-display font-black text-ink">Teacher Dashboard</h1>
          <p className="text-xs text-ink-400 mt-1">Manage classrooms, broadcast live WebRTC feeds, and inspect AI engagement analytics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {selectedSession && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => window.open(`/room/${selectedSession._id}`, '_blank')}
                className="flex-1 sm:flex-initial bg-coral text-white px-5 py-2.5 rounded-xl hover:bg-coral-600 flex items-center justify-center shadow-coral-soft font-bold text-xs transition-all active:scale-95 animate-breath"
              >
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></span>
                Go Live (WebRTC)
              </button>
              
              <button 
                onClick={handleExport}
                className="bg-cream-50 hover:bg-cream-100 text-ink border border-cream-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 mr-2 text-ink-500" />
                <span>Export JSON</span>
              </button>
            </div>
          )}
          
          <form onSubmit={handleCreateSession} className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Lecture Topic Name..."
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-cream-200 rounded-xl focus:outline-none focus:border-coral text-xs bg-cream-50/50 text-ink placeholder-ink-300 font-medium"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              required
            />
            <button className="bg-ink hover:bg-ink-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow-premium">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create</span>
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar - Deck */}
        <div className="lg:col-span-1 bg-white border border-cream-200/50 p-5 rounded-3xl shadow-premium h-auto lg:sticky lg:top-24">
          <div className="flex items-center space-x-2 mb-4">
            <Layers className="w-4 h-4 text-coral" />
            <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide">Your Lectures</h2>
          </div>
          
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {mySessions.map(session => (
              <button
                key={session._id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left p-3.5 rounded-2xl text-xs transition-all duration-200 border flex flex-col gap-1.5 ${
                  selectedSession?._id === session._id 
                    ? 'bg-sage border-sage-300 text-white shadow-sage-soft font-bold' 
                    : 'hover:bg-cream-100/50 border-cream-200/40 text-ink bg-cream-50/20'
                }`}
              >
                <div className="truncate text-sm">{session.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {session.is_live && !session.ended_at && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-coral text-white px-2 py-0.5 rounded-full animate-breath">
                      LIVE NOW
                    </span>
                  )}
                  {session.ended_at && (
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedSession?._id === session._id ? 'bg-sage-600 text-sage-100' : 'bg-cream-200 text-ink-500'
                    }`}>
                      Completed
                    </span>
                  )}
                  {session.duration_seconds > 0 && (
                    <span className={`text-[9px] font-semibold ${selectedSession?._id === session._id ? 'text-sage-100' : 'text-ink-300'}`}>
                      {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                    </span>
                  )}
                </div>
              </button>
            ))}
            {mySessions.length === 0 && (
              <p className="text-ink-300 text-xs italic text-center py-6">Create a lecture to populate this deck.</p>
            )}
          </div>
        </div>

        {/* Right Main Analytics panel */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence mode="wait">
            {selectedSession && stats ? (
              <motion.div
                key="stats-loaded"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Counters Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-sage-50 border border-sage-200 rounded-xl flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5 text-sage" />
                    </div>
                    <div className="text-ink-400 text-xs font-semibold uppercase tracking-wider">Avg Engagement</div>
                    <div className="text-3xl font-display font-black text-sage mt-1">{stats.avg_engagement}%</div>
                  </div>
                  
                  <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium text-center flex flex-col items-center justify-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${
                      stats.alerts.length > 0 ? 'bg-coral-50 border-coral-200' : 'bg-sage-50 border-sage-200'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${stats.alerts.length > 0 ? 'text-coral' : 'text-sage'}`} />
                    </div>
                    <div className="text-ink-400 text-xs font-semibold uppercase tracking-wider">Focus Alerts</div>
                    <div className={`text-3xl font-display font-black mt-1 ${
                      stats.alerts.length > 0 ? 'text-coral' : 'text-sage'
                    }`}>
                      {stats.alerts.length}
                    </div>
                  </div>
                  
                  <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-amberGold-50 border border-amberGold-200 rounded-xl flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-amberGold" />
                    </div>
                    <div className="text-ink-400 text-xs font-semibold uppercase tracking-wider">Dominant Emotion</div>
                    <div className="text-xl font-display font-black text-ink-800 mt-2 truncate max-w-[140px] capitalize">
                      {Object.entries(stats.emotion_distribution).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Neutral'}
                    </div>
                  </div>
                </div>

                {/* Alarm Alert Bar */}
                {stats.alerts.length > 0 && (
                  <div className="bg-coral-50 border border-coral-200 p-4.5 rounded-2xl flex items-start space-x-3 shadow-premium">
                    <AlertTriangle className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-coral-800 uppercase tracking-wide">Attention required in class</p>
                      <p className="text-xs text-coral-700 leading-relaxed mt-1 font-medium">
                        Alert warnings logged recently: <span className="font-extrabold">{stats.alerts.join(', ')}</span>. Consider taking a brief break or interacting to trigger re-focus.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* --- RAG AI SUMMARY NOTEPAD --- */}
                <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-display font-extrabold text-ink text-base flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-coral animate-breath" />
                        Class Audio RAG Summary
                      </h3>
                      <p className="text-[11px] text-ink-400 mt-0.5">Upload a class lecture recording to instantly transcribe and summarize it using AI.</p>
                    </div>
                    
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
                        className={`cursor-pointer px-4.5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center space-x-1.5 active:scale-95 shadow-premium ${
                          isProcessingAudio 
                            ? 'bg-cream-100 text-ink-300 border border-cream-200 pointer-events-none' 
                            : 'bg-coral hover:bg-coral-600 text-white shadow-coral-soft'
                        }`}
                      >
                        <FileAudio className="w-4 h-4" />
                        <span>{isProcessingAudio ? 'Processing audio...' : 'Upload Class Audio'}</span>
                      </label>
                    </div>
                  </div>
                  
                  {isProcessingAudio && (
                    <div className="p-12 text-center flex flex-col items-center justify-center bg-cream-50/40 border border-dashed border-cream-200 rounded-2xl">
                      <svg className="animate-spin h-8 w-8 text-coral mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-xs font-semibold text-ink-700">Analyzing speech, generating topics and action items...</p>
                      <p className="text-[10px] text-ink-300 mt-1">This might take a minute depending on file size.</p>
                    </div>
                  )}

                  {aiSummary && (
                    <div className="bg-cream-100/50 border border-cream-200/40 p-6 rounded-2xl relative overflow-hidden shadow-inner font-sans text-sm text-ink-800 leading-relaxed max-h-[300px] overflow-y-auto">
                      <div className="absolute top-0 bottom-0 left-8 w-[1.5px] bg-coral-200/30"></div>
                      <div className="pl-6 notepad-lines whitespace-pre-wrap">
                        {aiSummary}
                      </div>
                    </div>
                  )}
                  
                  {!aiSummary && !isProcessingAudio && (
                    <div className="text-xs text-ink-400 italic bg-cream-50/30 border border-dashed border-cream-200 rounded-2xl p-5 text-center leading-relaxed">
                      💡 Generate post-class transcripts, key educational milestones, action points, and comprehensive student engagement reports instantly by dropping an audio recording above.
                    </div>
                  )}
                </div>
                {/* --------------------------------- */}

                {/* Analytical Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium">
                    <h3 className="font-display font-bold text-ink text-base mb-4">Class Engagement Graph</h3>
                    <div className="h-64 pr-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.engagement_over_time} margin={{ left: -15, right: 5, top: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorAvgScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#81B29A" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#81B29A" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAF7F2" />
                          <XAxis dataKey="_id" tick={{ fontSize: 9, fill: '#A4ACBA' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#A4ACBA' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFDF8', 
                              borderColor: '#FAF7F2', 
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px -2px rgba(61, 64, 91, 0.06)'
                            }}
                            labelStyle={{ color: '#3D405B', fontWeight: 'bold', fontSize: '11px' }}
                            itemStyle={{ color: '#81B29A', fontSize: '12px', fontWeight: 'semibold' }}
                          />
                          <Area type="monotone" dataKey="avg_score" stroke="#81B29A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAvgScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium">
                    <h3 className="font-display font-bold text-ink text-base mb-4">Class Emotion Breakdown</h3>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.emotion_distribution).map(([name, value]) => ({ name, value }))}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {Object.entries(stats.emotion_distribution).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFFDF8', 
                              borderColor: '#FAF7F2', 
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px -2px rgba(61, 64, 91, 0.06)',
                              fontSize: '11px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="stats-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-cream-50/60 border-2 border-dashed border-cream-200/60 rounded-3xl h-[420px] flex flex-col items-center justify-center text-ink-300 shadow-inner p-6 text-center"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-premium border border-cream-200/40 mb-4 animate-breath">
                  <TrendingUp className="w-6 h-6 text-coral" />
                </div>
                <h4 className="font-display font-bold text-ink-700 text-sm">Welcome to Educational Intelligence Console</h4>
                <p className="text-xs text-ink-400 mt-1 max-w-sm leading-relaxed">
                  Please select one of your ongoing or completed sessions in the left deck to view detailed focus summaries, real-time emotion graphs, and RAG Summaries.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherDashboard;
