import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await auth.login(formData);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('name', response.data.full_name);
      
      if (response.data.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="flex w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden min-h-[600px]">
        {/* Left Side - Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-[#eafaf1] p-10">
          <img src="/illustration.png" alt="Distance Learning" className="w-3/4 max-w-sm mb-8 mix-blend-multiply" />
          <h2 className="text-2xl font-bold text-teal-900 mb-2">Distance Learning Programs</h2>
          <p className="text-teal-700 text-center text-sm px-6">
            Attend live and recorded classes<br/>at your own convenience.
          </p>
          <div className="flex space-x-2 mt-8">
            <div className="w-6 h-2 bg-teal-500 rounded-full"></div>
            <div className="w-2 h-2 bg-teal-200 rounded-full"></div>
            <div className="w-2 h-2 bg-teal-200 rounded-full"></div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-12 lg:px-20 bg-white">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <circle cx="11" cy="11" r="4" fill="currentColor" fillOpacity="0.15"/>
              </svg>
              <span className="text-2xl font-black tracking-tight text-gray-900">EduLens <span className="text-teal-600">AI</span></span>
            </div>
            <h2 className="text-2xl text-gray-500 font-medium">Welcome back</h2>
          </div>

          {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="text-xs text-gray-400 absolute -top-3 bg-white px-1 left-0">Username or email</label>
              <input
                type="text"
                placeholder="alvaromichael"
                className="w-full py-2 border-b-2 border-gray-200 focus:outline-none focus:border-slate-800 text-gray-700 placeholder-gray-300 bg-transparent transition-colors"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
            
            <div className="relative pt-2">
              <label className="text-xs text-gray-400 absolute -top-1 bg-white px-1 left-0">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full py-2 border-b-2 border-gray-200 focus:outline-none focus:border-slate-800 text-gray-700 placeholder-gray-300 bg-transparent transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-xs text-teal-600 hover:text-teal-800 font-medium">Forgot password?</a>
            </div>

            <button type="submit" className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-medium transition-colors shadow-lg shadow-slate-900/20">
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Are you new? <Link to="/register" className="text-teal-600 hover:text-teal-800 font-medium">Create an Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
