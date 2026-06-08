import { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Sidebar({ isOpen, closeSidebar }) {
  const { profile, isPremium, coachViewMode } = useContext(UserContext);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;
  const isCoachOrAdmin = (profile?.role === 'coach' || profile?.role === 'admin') && coachViewMode !== 'user';
  const isRealCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'admin';

  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [clientUnreadCount, setClientUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchTicketsCount = async () => {
      try {
        if (isRealCoachOrAdmin) {
          const { count, error } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
          
          if (!error) {
            setUnreadTicketsCount(count || 0);
          }
        } else {
          const { count, error } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'replied');
          
          if (!error) {
            setClientUnreadCount(count || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching tickets count:", err);
      }
    };

    fetchTicketsCount();

    // Subscribe to changes in support_tickets table
    const channel = supabase
      .channel('sidebar-tickets-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTicketsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isRealCoachOrAdmin]);

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
              className={`flex items-center justify-between px-xl py-sm transition-all ${isActive('/support') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">mail</span>
                <span>הודעות ופניות תמיכה</span>
              </div>
              {unreadTicketsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse">
                  {unreadTicketsCount}
                </span>
              )}
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
            <Link 
              to="/support" 
              className={`flex items-center justify-between px-xl py-sm transition-all ${isActive('/support') ? 'bg-secondary/5 text-secondary font-bold border-r-4 border-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">mail</span>
                <span>הודעות ופניות תמיכה</span>
              </div>
              {clientUnreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse">
                  {clientUnreadCount}
                </span>
              )}
            </Link>
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
