import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Sparkles } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || 'Learner';
  const role = localStorage.getItem('role') || 'student';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-cream-200/40 shadow-premium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate(`/${role}`)}>
            <div className="relative w-8.5 h-8.5 flex items-center justify-center bg-coral-50 rounded-lg border border-coral-200 shadow-coral-soft transition-transform hover:scale-105 duration-200">
              <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <circle cx="11" cy="11" r="3" className="fill-coral-100" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xl font-display font-extrabold tracking-tight text-ink">
              EduLens <span className="text-coral">AI</span>
            </span>
          </div>

          {/* User & Options */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-cream-100/60 border border-cream-200/50 rounded-2xl px-3.5 py-1.5 shadow-premium">
              <div className="w-7 h-7 rounded-xl bg-ink-500/10 flex items-center justify-center text-ink-600">
                <User className="w-4 h-4 text-ink-500" />
              </div>
              <div className="text-sm font-semibold text-ink-800 flex items-center space-x-2">
                <span>{name}</span>
                {role === 'teacher' ? (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 bg-lavender-200 border border-lavender-300 text-lavender-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5 text-lavender-600 animate-pulse" />
                    <span>Teacher</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-sage-100 border border-sage-200 text-sage-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Student
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-coral-600 hover:text-coral-800 border border-coral-200/30 hover:border-coral-300 bg-coral-50/20 hover:bg-coral-50 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
