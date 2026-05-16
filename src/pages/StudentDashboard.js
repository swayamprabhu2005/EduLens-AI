import React, { useState, useEffect } from 'react';
import WebcamFeed from '../components/WebcamFeed';
import { sessions } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentDashboard = () => {
  const [allSessions, setAllSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const response = await sessions.list();
      setAllSessions(response.data);
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
      time: new Date().toLocaleTimeString(),
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left panel */}
      <div className="lg:col-span-2 space-y-6">

        {/* Session Lobby */}
        {!selectedSession ? (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-6">Class Lobby</h2>

            {/* Live Sessions */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="font-semibold text-red-600 uppercase text-xs tracking-widest">Live Now</h3>
              </div>
              {liveSessions.length === 0 ? (
                <p className="text-gray-400 text-sm italic pl-4">No classes are live right now. Check back soon!</p>
              ) : (
                <div className="space-y-3">
                  {liveSessions.map(session => (
                    <div key={session._id} className="flex items-center justify-between p-4 border-2 border-red-200 bg-red-50 rounded-xl">
                      <div>
                        <div className="font-bold text-gray-800">{session.title}</div>
                        <div className="text-xs text-red-500 mt-0.5">● Class in progress</div>
                      </div>
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow transition-transform hover:scale-105"
                      >
                        Join Class
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Sessions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-widest">Past Sessions</h3>
              </div>
              {endedSessions.length === 0 ? (
                <p className="text-gray-400 text-sm italic pl-4">No past sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {endedSessions.map(session => (
                    <div key={session._id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                      <div>
                        <div className="font-medium text-gray-700">{session.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {session.ended_at ? new Date(session.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          {session.duration_seconds ? ` · ${formatDuration(session.duration_seconds)}` : ''}
                        </div>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Ended</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active tracking view */
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{selectedSession.title}</h3>
                {selectedSession.is_live && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
                )}
                <button
                  onClick={() => window.open(`/room/${selectedSession._id}`, '_blank')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-full text-sm font-bold shadow"
                >
                  Open Video Room
                </button>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-sm text-teal-600 hover:underline"
              >
                ← Back to Lobby
              </button>
            </div>
            <WebcamFeed sessionId={selectedSession._id} onAnalysis={handleAnalysis} />
          </div>
        )}

        {/* Engagement Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">My Engagement Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">Real-time Feedback</h2>
          {currentStats ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-sm text-gray-500 uppercase font-semibold">Engagement Score</div>
                <div className={`text-5xl font-black ${
                  currentStats.engagement_score > 70 ? 'text-green-600' :
                  currentStats.engagement_score > 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {currentStats.engagement_score}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-teal-50 rounded-lg text-center">
                  <div className="text-xs text-gray-500 uppercase">Emotion</div>
                  <div className="font-bold capitalize">{currentStats.emotion}</div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg text-center">
                  <div className="text-xs text-gray-500 uppercase">Attention</div>
                  <div className="font-bold">{currentStats.attention?.is_looking_at_screen ? 'Focused' : 'Distracted'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sleeping</span>
                  <span className={currentStats.attention?.is_sleeping ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {currentStats.attention?.is_sleeping ? 'YES' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Yawning</span>
                  <span className={currentStats.attention?.is_yawning ? 'text-yellow-600 font-bold' : 'text-green-600'}>
                    {currentStats.attention?.is_yawning ? 'YES' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Join a session to see live feedback</p>
          )}
        </div>

        <div className="bg-teal-600 p-6 rounded-xl shadow-sm text-white">
          <h3 className="font-bold mb-2">Tips for Better Engagement</h3>
          <ul className="text-sm space-y-2 opacity-90">
            <li>• Keep your face well-lit</li>
            <li>• Stay within the camera frame</li>
            <li>• Take short breaks if you feel bored</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
