import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/api';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    full_name: '',
    role: 'student' 
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await auth.register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 p-4 font-sans selection:bg-coral-200 selection:text-coral-900 font-sans">
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
              Learn Smart
            </h2>
            <p className="text-ink-400 text-center text-sm px-4 leading-relaxed max-w-sm">
              Attend live streams, visualize your attention logs, and interact dynamically inside live educational groups.
            </p>
          </div>

          {/* Slider Dots (second dot active) */}
          <div className="flex space-x-2 z-10">
            <div className="w-2 h-2 bg-cream-200 rounded-full"></div>
            <div className="w-6 h-2 bg-coral rounded-full transition-all"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full"></div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-12 lg:p-16 bg-white relative">
          <div className="absolute top-6 right-8 text-xs text-cream-200 select-none font-display font-semibold">
            EDULENS v1.2
          </div>
          
          <div className="mb-6">
            {/* Logo */}
            <div className="flex items-center space-x-2.5 mb-5">
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
            
            <h3 className="text-2xl font-display font-bold text-ink mb-1">Create an Account</h3>
            <p className="text-sm text-ink-400">Join the next generation of smart learning systems.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-coral-50 border border-coral-200 text-coral-800 text-xs px-4 py-3 rounded-xl mb-5 text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alvaro Michael"
                className="w-full px-4 py-2.5 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink placeholder-ink-200 bg-cream-50/50 transition-all font-medium text-sm"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
              />
            </div>

            <div className="relative">
              <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. alvaro@example.com"
                className="w-full px-4 py-2.5 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink placeholder-ink-200 bg-cream-50/50 transition-all font-medium text-sm"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            <div className="relative">
              <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink placeholder-ink-200 bg-cream-50/50 transition-all font-medium text-sm"
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

            <div className="relative">
              <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1.5">
                I am a...
              </label>
              <select
                className="w-full px-4 py-2.5 border border-cream-200 rounded-xl focus:outline-none focus:border-coral focus:ring-4 focus:ring-coral-500/10 text-ink bg-cream-50/50 transition-all font-medium text-sm cursor-pointer"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 px-4 bg-ink hover:bg-ink-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-premium hover:shadow-premium-lg flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-coral hover:text-coral-700 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
