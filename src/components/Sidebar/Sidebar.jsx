import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../App';

export default function Sidebar({ isOpen, closeSidebar }) {
  const { profile, isPremium } = useContext(UserContext);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;
  const isCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'admin';

  return (
    <aside className={`h-screen w-72 fixed right-0 top-0 z-40 bg-white custom-shadow flex flex-col py-xl space-y-xs transition-transform duration-300 md:translate-x-0 print:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="px-xl mb-xl flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">OptiLife</h1>
          <p className="text-xs uppercase tracking-widest text-secondary font-bold">Wellness Hub</p>
        </div>
        <button className="md:hidden text-primary" onClick={closeSidebar}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <nav className="flex-1 space-y-xs">
        {isCoachOrAdmin ? (
          <>
            <Link 
              to="/coach" 
              className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/coach') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              <span className="material-symbols-outlined">supervisor_account</span>
              לוח בקרה למאמן
            </Link>
            <Link 
              to="/support" 
              className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/support') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              <span className="material-symbols-outlined">mail</span>
              הודעות ופניות תמיכה
            </Link>
          </>
        ) : (
          <>
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

            {!isPremium && (
              <Link 
                to="/pricing" 
                className={`flex items-center gap-md px-xl py-sm transition-all ${isActive('/pricing') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
              >
                <span className="material-symbols-outlined">star</span>
                שדרוג מנוי
              </Link>
            )}
          </>
        )}
      </nav>
      {!isCoachOrAdmin && (
        <div className="px-6 mb-8 mt-auto pb-4">
          <Link to="/upload" className="w-full bg-accent-action hover:shadow-lg transition-all rounded-full py-4 px-6 flex items-center justify-center gap-2 text-primary font-bold active:scale-95 uppercase text-sm">
            <span className="material-symbols-outlined text-lg">add</span>
            {profile?.gender === 'female' ? 'העלי בדיקה' : 'העלה בדיקה'}
          </Link>
        </div>
      )}
    </aside>
  );
}
