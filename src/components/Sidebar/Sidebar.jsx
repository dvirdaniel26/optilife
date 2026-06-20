import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../App';

export default function Sidebar({ isOpen, closeSidebar }) {
  const { profile, isPremium, isAiUltimate } = useContext(UserContext);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  return (
    <aside className={`h-screen w-72 fixed right-0 top-0 z-40 bg-white custom-shadow flex flex-col py-xl space-y-xs transition-transform duration-300 md:translate-x-0 print:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="px-xl mb-xl flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">OptiLife</h1>
          <p className="text-xs uppercase tracking-widest text-secondary font-bold">Health Center</p>
        </div>
        <button className="md:hidden text-primary" onClick={closeSidebar}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <nav className="flex-1 space-y-xs">
        <Link 
          to="/dashboard" 
          onClick={closeSidebar}
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/dashboard') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          סקירה כללית
        </Link>
        <Link 
          to="/tests" 
          onClick={closeSidebar}
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/tests') || isActive('/analysis') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">biotech</span>
          ניתוח בדיקות
        </Link>
        <Link 
          to="/plan" 
          onClick={closeSidebar}
          className={`flex items-center justify-between px-xl py-sm transition-all ${isActive('/plan') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined">favorite</span>
            <span>תוכנית הבריאות</span>
          </div>
          {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && (
            <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
          )}
        </Link>
        <Link 
          to="/ai-coach" 
          onClick={closeSidebar}
          className={`flex items-center justify-between px-xl py-sm transition-all ${isActive('/ai-coach') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined">psychology</span>
            <span>מאמן בריאות AI</span>
          </div>
          {!isAiUltimate && (
            <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
          )}
        </Link>
        <Link 
          to="/wellness" 
          onClick={closeSidebar}
          className={`flex items-center justify-between px-xl py-sm transition-all ${isActive('/wellness') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined">self_improvement</span>
            <span>מרכז בריאות אישי</span>
          </div>
          {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && (
            <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
          )}
        </Link>

        {!isAiUltimate && (
          <Link 
            to="/pricing" 
            onClick={closeSidebar}
            className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/pricing') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
          >
            <span className="material-symbols-outlined">star</span>
            שדרוג מנוי
          </Link>
        )}
      </nav>
      
    </aside>
  );
}
