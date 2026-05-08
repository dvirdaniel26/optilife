import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  return (
    <aside className="h-screen w-72 fixed right-0 top-0 z-40 bg-white custom-shadow flex flex-col py-xl space-y-xs">
      <div className="px-xl mb-xl">
        <h1 className="text-2xl font-bold text-primary tracking-tight">OptiLife</h1>
        <p className="text-xs uppercase tracking-widest text-secondary font-bold">Wellness Hub</p>
      </div>
      <nav className="flex-1 space-y-xs">
        <Link 
          to="/dashboard" 
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/dashboard') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          סקירה כללית
        </Link>
        <Link 
          to="/analysis" 
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/analysis') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">analytics</span>
          ניתוח בדיקות
        </Link>
        <Link 
          to="/plan" 
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/plan') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">favorite</span>
          הבריאות שלי
        </Link>
        <Link 
          to="/settings" 
          className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/settings') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
        >
          <span className="material-symbols-outlined">settings</span>
          הגדרות
        </Link>
      </nav>
      <div className="px-6 mb-8 mt-auto">
        <Link to="/upload" className="w-full bg-accent-action hover:shadow-lg transition-all rounded-full py-4 px-6 flex items-center justify-center gap-2 text-primary font-bold active:scale-95 uppercase text-sm">
          <span className="material-symbols-outlined text-lg">add</span>
          UPLOAD TEST
        </Link>
      </div>
      <div className="pt-6 border-t border-slate-100 mx-4 space-y-xs pb-xl">
        <Link to="/help" className="flex items-center gap-md px-xl py-sm text-on-surface-variant hover:text-secondary transition-all text-sm">
          <span className="material-symbols-outlined">help</span>
          Support
        </Link>
        <Link to="/logout" className="flex items-center gap-md px-xl py-sm text-on-surface-variant hover:text-red-500 transition-all text-sm">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </Link>
      </div>
    </aside>
  );
}
