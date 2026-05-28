import React, { useState, useEffect } from 'react';
import WebcamFeed from '../components/WebcamFeed';
import { sessions } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Calendar, Trophy, Sparkles, BookOpen, AlertCircle, Smile, HelpCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudentDashboard = () => {
  const [allSessions, setAllSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [history, setHistory] = useState([]);
  const studentName = localStorage.getItem('name') || 'Learner';

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await sessions.list();
        setAllSessions(response.data);
      } catch (err) {
        console.error("Failed to fetch sessions");
      }
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // poll every 5s for live updates
    return () => clearInterval(interval);
  }, []);

  const liveSessions = allSessions.filter(s => s.is_live && !s.ended_at);
  const endedSessions = allSessions.filter(s => s.ended_at);

  const handleAnalysis = (data) => {
    setCurrentStats(data);
    setHistory(prev => [...prev.slice(-19), {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      score: data.engagement_score
    }]);
  };

  const formatDuration = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 animate-slide-up pb-12"
    >
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-coral-100/40 via-cream-100 to-sage-100 border border-cream-200/50 rounded-3xl p-8 shadow-premium overflow-hidden">
        <div className="absolute top-[-40%] right-[-5%] w-60 h-60 rounded-full bg-coral-200/20 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-md px-3 py-1 rounded-full border border-cream-200/50 shadow-premium w-fit mb-3">
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span className="text-[10px] font-black text-ink-700 tracking-wider uppercase">Focus Hub</span>
            </div>
            <h1 className="text-3xl font-display font-black text-ink">
              Welcome back, {studentName}
            </h1>
            <p className="text-sm text-ink-400 mt-1 max-w-xl">
              Let's join a live lecture or check your session archives. EduLens tracks your engagement to keep your focus sharp.
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-cream-200/40 shadow-premium">
            <div className="w-10 h-10 bg-amberGold-50 rounded-xl flex items-center justify-center border border-amberGold-200">
              <Trophy className="w-5 h-5 text-amberGold" />
            </div>
            <div>
              <div className="text-xs text-ink-400 font-semibold uppercase tracking-wider">Lobby Status</div>
              <div className="text-sm font-bold text-ink-700">
                {liveSessions.length} Class{liveSessions.length !== 1 ? 'es' : ''} Live Now
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left / Middle panel */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {/* Session Lobby */}
            {!selectedSession ? (
              <motion.div 
                key="lobby"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium"
              >
                <div className="flex items-center space-x-2 mb-6">
                  <BookOpen className="w-5 h-5 text-coral" />
                  <h2 className="text-xl font-display font-bold text-ink">Classroom Lobby</h2>
                </div>

                {/* Live Sessions */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-coral"></span>
                    </span>
                    <h3 className="font-bold text-coral uppercase text-xs tracking-wider">Live & Ongoing Lectures</h3>
                  </div>
                  
                  {liveSessions.length === 0 ? (
                    <div className="bg-cream-50/50 border border-dashed border-cream-200 rounded-2xl p-6 text-center">
                      <p className="text-ink-300 text-sm italic">No classes are currently live. Perfect time to study autonomously!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {liveSessions.map(session => (
                        <div key={session._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-coral-200 bg-coral-50/30 rounded-2xl gap-4 hover:shadow-premium transition-shadow">
                          <div>
                            <div className="font-bold text-ink text-base font-display">{session.title}</div>
                            <div className="text-xs text-coral-600 mt-1 flex items-center space-x-1.5 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"></span>
                              <span>Broadcast started</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="bg-coral hover:bg-coral-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-coral-soft hover:shadow-premium-lg transition-all flex items-center space-x-1.5 active:scale-95 self-stretch sm:self-auto text-center justify-center"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Join Focus Room</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past Sessions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-ink-300" />
                    <h3 className="font-bold text-ink-400 uppercase text-xs tracking-wider">Past Sessions History</h3>
                  </div>
                  
                  {endedSessions.length === 0 ? (
                    <p className="text-ink-200 text-xs italic pl-4">No completed sessions recorded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {endedSessions.map(session => (
                        <div key={session._id} className="flex items-center justify-between p-3.5 bg-cream-50/40 border border-cream-200/40 rounded-xl">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-ink-800 text-sm truncate">{session.title}</div>
                            <div className="text-[10px] text-ink-300 mt-1">
                              {session.ended_at ? new Date(session.ended_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              {session.duration_seconds ? ` · ${formatDuration(session.duration_seconds)}` : ''}
                            </div>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider bg-cream-200 text-ink-500 px-2 py-0.5 rounded-md border border-cream-200">
                            Ended
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Active tracking view */
              <motion.div 
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200/40 pb-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-display font-extrabold text-xl text-ink">{selectedSession.title}</h3>
                      {selectedSession.is_live && (
                        <span className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider bg-coral-50 border border-coral-200 text-coral px-2.5 py-0.5 rounded-full animate-breath">
                          <span className="w-1.5 h-1.5 rounded-full bg-coral animate-ping"></span>
                          <span>LIVE</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400 mt-1">Real-time attention intelligence captures active engagement metrics.</p>
                  </div>
                  
                  <div className="flex items-center space-x-3.5">
                    <button
                      onClick={() => window.open(`/room/${selectedSession._id}`, '_blank')}
                      className="flex items-center space-x-1.5 bg-coral text-white hover:bg-coral-600 px-4 py-2 rounded-xl text-xs font-semibold shadow-coral-soft hover:shadow-premium-lg transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Video Stream</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="flex items-center space-x-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700 transition-colors border border-cream-200 rounded-xl px-3 py-2 bg-cream-50/20"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Lobby</span>
                    </button>
                  </div>
                </div>
                
                <WebcamFeed sessionId={selectedSession._id} onAnalysis={handleAnalysis} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Engagement Chart */}
          <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-display font-bold text-ink">My Engagement Trend</h2>
                <p className="text-xs text-ink-400 mt-0.5">Captures your focus percentages logged over the current class.</p>
              </div>
              {history.length > 0 && (
                <div className="text-xs font-semibold bg-sage-50 text-sage border border-sage-200 px-3 py-1 rounded-lg">
                  Average score: {Math.round(history.reduce((a, b) => a + b.score, 0) / history.length)}%
                </div>
              )}
            </div>

            <div className="h-64 pr-2">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-ink-300 italic text-sm">
                  <HelpCircle className="w-8 h-8 text-cream-200 mb-2" />
                  <span>No data points recorded yet. Enable your Focus Lens to populate.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ left: -15, right: 5, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#E07A5F" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAF7F2" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#A4ACBA' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#A4ACBA' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFDF8', 
                        borderColor: '#FAF7F2', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px -2px rgba(61, 64, 91, 0.06)'
                      }}
                      labelStyle={{ color: '#3D405B', fontWeight: 'bold', fontSize: '11px' }}
                      itemStyle={{ color: '#E07A5F', fontSize: '12px', fontWeight: 'semibold' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#E07A5F" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-8">
          {/* Feedback Metrics */}
          <div className="bg-white border border-cream-200/50 p-6 rounded-3xl shadow-premium">
            <h2 className="text-lg font-display font-bold text-ink mb-6">Real-time Feedback</h2>
            
            {currentStats ? (
              <div className="space-y-6">
                {/* Score Gauge */}
                <div className="flex flex-col items-center justify-center p-6 bg-cream-50/50 border border-cream-100 rounded-2xl relative overflow-hidden">
                  <div className="text-xs text-ink-400 font-semibold uppercase tracking-wider mb-2">Attention Focus</div>
                  <div className="relative flex items-center justify-center w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle 
                        cx="64" cy="64" r="54" 
                        stroke="#FAF7F2" strokeWidth="10" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="64" cy="64" r="54" 
                        stroke={
                          currentStats.engagement_score > 70 ? '#81B29A' :
                          currentStats.engagement_score > 40 ? '#F2CC8F' : '#E07A5F'
                        } 
                        strokeWidth="10" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 54}
                        strokeDashoffset={2 * Math.PI * 54 * (1 - currentStats.engagement_score / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-display font-black text-ink">{currentStats.engagement_score}%</span>
                      <span className="text-[10px] text-ink-400 font-bold uppercase tracking-widest mt-0.5">
                        {currentStats.engagement_score > 70 ? 'Optimal' :
                         currentStats.engagement_score > 40 ? 'Moderate' : 'Low Focus'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submetrics grids */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cream-100/50 border border-cream-200/30 rounded-2xl text-center">
                    <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wider mb-1">Emotion</div>
                    <div className="flex items-center justify-center space-x-1.5 font-bold text-ink-800 capitalize text-sm">
                      <Smile className="w-4 h-4 text-sage" />
                      <span>{currentStats.emotion}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-cream-100/50 border border-cream-200/30 rounded-2xl text-center">
                    <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wider mb-1">Attention</div>
                    <div className="font-bold text-ink-800 text-sm">
                      {currentStats.attention?.is_looking_at_screen ? (
                        <span className="text-sage">Focused</span>
                      ) : (
                        <span className="text-coral">Distracted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div className="border-t border-cream-200/40 pt-4 space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-ink-500">Sleeping State</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentStats.attention?.is_sleeping 
                        ? 'bg-coral-100 text-coral border border-coral-200' 
                        : 'bg-sage-50 text-sage border border-sage-200'
                    }`}>
                      {currentStats.attention?.is_sleeping ? 'YAWN / SLEEPING' : 'Active'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-ink-500">Fatigue (Yawning)</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentStats.attention?.is_yawning 
                        ? 'bg-amberGold-100 text-amberGold-800 border border-amberGold-200' 
                        : 'bg-sage-50 text-sage border border-sage-200'
                    }`}>
                      {currentStats.attention?.is_yawning ? 'YES (Fatigued)' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-cream-100 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-cream-200" />
                </div>
                <p className="text-sm text-ink-400 font-medium max-w-[200px]">Join an ongoing session to view live engagement analysis.</p>
              </div>
            )}
          </div>

          {/* Motivational Advice */}
          <div className="bg-sage-50 border border-sage-200/40 p-6 rounded-3xl shadow-sage-soft text-sage-800 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-sage-200/20 rounded-full blur-xl"></div>
            <h3 className="font-display font-bold text-lg text-sage-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-sage-600 animate-pulse" />
              Focus Guidelines
            </h3>
            <ul className="text-xs space-y-3 font-medium opacity-90 leading-relaxed text-sage-700">
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                <span>Keep your workspace well-lit so the optical engagement engine tracks correctly.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                <span>Stay centered relative to the camera to optimize head posture analysis.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                <span>Take short micro-breaks if you register consistent fatigue indicators.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
