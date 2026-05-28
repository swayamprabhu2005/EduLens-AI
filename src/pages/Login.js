import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/api';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
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
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 p-4 font-sans selection:bg-coral-200 selection:text-coral-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-5xl bg-white shadow-premium-xl rounded-3xl overflow-hidden min-h-[620px]"
      >
        {/* Left Side - Illustration & Motivator */}
        <div className="hidden md:flex flex-col items-center justify-between w-1/2 bg-gradient-to-br from-coral-100/50 via-cream-100 to-sage-100 p-12 relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-72 h-72 rounded-full bg-amberGold-200/20 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 rounded-full bg-sage-200/30 blur-3xl"></div>

          {/* Badge */}
          <div className="self-start flex items-center space-x-2 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-cream-200/50 shadow-premium">
            <Sparkles className="w-4 h-4 text-coral" />
            <span className="text-xs font-semibold text-ink-700 tracking-wide uppercase">AI-Powered Learning</span>
          </div>

          {/* Main graphic container */}
          <div className="w-full flex flex-col items-center justify-center my-6 z-10">
            <div className="relative p-6 bg-white/40 rounded-3xl border border-white/60 shadow-premium-lg mb-8 max-w-xs transition-transform hover:scale-105 duration-500">
              <img 
                src="/illustration.png" 
                alt="Distance Learning" 
                className="w-full h-auto mix-blend-multiply" 
              />
            </div>
            <h2 className="text-3xl font-display font-bold text-ink text-center mb-3">
              Shape Your Focus
            </h2>
            <p className="text-ink-400 text-center text-sm px-4 leading-relaxed max-w-sm">
              Unlock intelligent real-time attention analysis and live classroom interaction built to guide your progress.
            </p>
          </div>

          {/* Slider Dots */}
          <div className="flex space-x-2 z-10">
            <div className="w-6 h-2 bg-coral rounded-full transition-all"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full"></div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-12 lg:p-16 bg-white relative">
          <div className="absolute top-6 right-8 text-xs text-cream-200 select-none font-display font-semibold">
            EDULENS v1.2
          </div>
          
          <div className="mb-8">
            {/* Logo */}
            <div className="flex items-center space-x-2.5 mb-6">
              <div className="relative w-9 h-9 flex items-center justify-center bg-coral-50 rounded-xl border border-coral-200 shadow-coral-soft">
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <circle cx="11" cy="11" r="3" className="fill-coral-100" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-2xl font-display font-extrabold tracking-tight text-ink">
                EduLens <span className="text-coral">AI</span>
              </span>
            </div>
            
            <h3 className="text-2xl font-display font-bold text-ink mb-1">Welcome back</h3>
            <p className="text-sm text-ink-400">Sign in to your educational intelligence hub.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-coral-50 border border-coral-200 text-coral-800 text-xs px-4 py-3 rounded-xl mb-6 text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-2">
                Username or email
              </label>
              <input
                type="text"
                placeholder="e.g. alvaromichael"
                className="w-full px-4 py-3 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink placeholder-ink-200 bg-cream-50/50 transition-all font-medium text-sm"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); alert("Password recovery is currently disabled."); }}
                  className="text-xs font-semibold text-coral hover:text-coral-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink placeholder-ink-200 bg-cream-50/50 transition-all font-medium text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-ink hover:bg-ink-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-premium hover:shadow-premium-lg flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-400">
            Are you new here?{' '}
            <Link to="/register" className="font-semibold text-coral hover:text-coral-700 transition-colors">
              Create an Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
