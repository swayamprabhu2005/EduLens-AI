import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import VirtualClassroom from './pages/VirtualClassroom';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/" />;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </>
  );
};

// Auth check only — no shell chrome (used for full-screen classroom)
const PrivateRouteFullScreen = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-cream-50 font-sans antialiased">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/student" 
            element={
              <PrivateRoute role="student">
                <StudentDashboard />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/teacher" 
            element={
              <PrivateRoute role="teacher">
                <TeacherDashboard />
              </PrivateRoute>
            } 
          />
          
          {/* VirtualClassroom is full-screen immersive — no Navbar/container wrapper */}
          <Route 
            path="/room/:sessionId" 
            element={
              <PrivateRouteFullScreen>
                <VirtualClassroom />
              </PrivateRouteFullScreen>
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
