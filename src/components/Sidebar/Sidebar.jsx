import { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../../App';
import { supabase } from '../../lib/supabase';
const navLinks = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    label: 'סקירה כללית',
    desc: 'מדדים, גרפים ותובנות',
    locked: false,
  },
  {
    to: '/tests',
    icon: 'biotech',
    label: 'ניתוח בדיקות',
    desc: 'העלה ופרש בדיקות דם',
    locked: false,
    extraActive: '/analysis',
  },
  {
    to: '/plan',
    icon: 'favorite',
    label: 'תוכנית הבריאות',
    desc: 'תזונה וכושר מותאם אישית',
    lockedFor: 'free',
  },
  {
    to: '/ai-coach',
    icon: 'psychology',
    label: 'מאמן בריאות AI',
    desc: 'ייעוץ אישי 24/7',
    lockedFor: 'non_ultimate',
  },
  {
    to: '/wellness',
    icon: 'self_improvement',
    label: 'מרכז בריאות אישי',
    desc: 'מעקב יומי ואתגרים',
    lockedFor: 'free',
  },
];

export default function Sidebar({ isOpen, closeSidebar }) {
  const { profile, isPremium, isAiUltimate } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [latestTestInfo, setLatestTestInfo] = useState(null);

  useEffect(() => {
    if (!profile) return;
    
    const fetchLatestTest = async () => {
      try {
        const { data: tests } = await supabase
          .from('medical_tests')
          .select('id, test_date')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .order('test_date', { ascending: false })
          .limit(1);

        if (tests && tests.length > 0) {
          const testId = tests[0].id;
          const { data: results } = await supabase
            .from('lab_results')
            .select('is_abnormal')
            .eq('test_id', testId);
            
          if (results) {
            const total = results.length;
            const abnormal = results.filter(r => r.is_abnormal).length;
            const normal = total - abnormal;
            setLatestTestInfo({
              date: new Date(tests[0].test_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
              normal,
              abnormal,
              total
            });
          }
        }
      } catch (e) {
        console.error('Error fetching latest test for sidebar:', e);
      }
    };
    fetchLatestTest();
  }, [profile]);

  const isActive = (path, extraActive) =>
    currentPath === path || (extraActive && currentPath === extraActive);

  const tier = profile?.subscription_tier || 'free';
  const isFree = tier === 'free' || tier === 'free_trial';
  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : 'משתמש/ת';

  const getTierLabel = () => {
    if (tier === 'ai_ultimate' || tier?.startsWith('ai_ultimate_cancelled:'))
      return { label: 'אולטימטיבי ⚡', cls: 'bg-secondary/10 text-secondary' };
    if (tier === 'premium' || tier?.startsWith('premium_cancelled:'))
      return { label: 'מקצועי 👑', cls: 'bg-secondary/10 text-secondary' };
    if (tier === 'standard' || tier?.startsWith('standard_cancelled:'))
      return { label: 'מתקדם 🌟', cls: 'bg-secondary/10 text-secondary' };
    return { label: 'בסיסי', cls: 'bg-slate-100 text-on-surface-variant' };
  };
  const tierInfo = getTierLabel();

  const isLocked = (link) => {
    if (!link.lockedFor) return false;
    if (link.lockedFor === 'free') return isFree;
    if (link.lockedFor === 'non_ultimate') return !isAiUltimate;
    return false;
  };

  return (
    <aside
      dir="rtl"
      className={`h-[100dvh] w-72 fixed right-0 top-0 z-50 bg-white flex flex-col transition-transform duration-300 md:translate-x-0 print:hidden border-l border-outline-variant/30 pb-4 md:pb-0 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* ── Logo ── */}
      <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-outline-variant/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-base font-bold">favorite</span>
          </div>
          <div>
            <h1 className="text-xl font-black font-heading text-primary tracking-tight leading-none">OptiLife</h1>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Health Center</p>
          </div>
        </div>
        <button
          className="md:hidden text-on-surface-variant hover:text-primary transition-colors"
          onClick={closeSidebar}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* ── Upload CTA ── */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => {
            navigate('/upload');
            closeSidebar();
          }}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-secondary to-primary text-white font-bold py-3.5 rounded-2xl shadow-md shadow-primary/20 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
          <span>העלה בדיקת דם חדשה</span>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pb-2 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const active = isActive(link.to, link.extraActive);
          const locked = isLocked(link);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={`flex items-center justify-between px-3 py-3.5 rounded-xl transition-all group ${
                active
                  ? 'bg-secondary/8 text-secondary'
                  : 'text-on-surface-variant hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    active
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-secondary/10 group-hover:text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{link.icon}</span>
                </div>
                <div className="text-right min-w-0">
                  <p className={`text-sm font-bold leading-tight ${active ? 'text-secondary' : 'text-primary'}`}>
                    {link.label}
                  </p>
                  <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5 truncate">
                    {link.desc}
                  </p>
                </div>
              </div>
              {locked ? (
                <span className="material-symbols-outlined text-[15px] text-slate-300 shrink-0 mr-1">lock</span>
              ) : active ? (
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mr-1" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-outline-variant/20 shrink-0" />

      {/* ── Upgrade Card (free) OR Health Status (premium) ── */}
      {isFree ? (
        <div className="mx-4 my-3 rounded-2xl bg-gradient-to-br from-primary/8 via-secondary/5 to-transparent border border-secondary/15 p-4 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-20 h-20 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-extrabold text-primary mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-secondary text-base">auto_awesome</span>
              שדרג לפרימיום
            </p>
            <p className="text-[11px] text-on-surface-variant leading-snug mb-3">
              קבל תוכניות בריאות, מאמן AI ועוד פיצ'רים בלעדיים
            </p>
            <Link
              to="/pricing"
              onClick={closeSidebar}
              className="block text-center bg-secondary text-white font-bold text-xs py-2 rounded-xl hover:bg-secondary/90 transition-all shadow-sm"
            >
              לצפייה בתוכניות 💎
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-4 mb-4 mt-2 p-3.5 rounded-2xl bg-slate-50 border border-outline-variant/30 relative overflow-hidden shrink-0">
          <div className="flex items-center justify-between mb-3 border-b border-outline-variant/30 pb-2">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-base">health_and_safety</span>
              סטטוס בריאות
            </span>
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
              {latestTestInfo ? `עודכן: ${latestTestInfo.date}` : 'טוען...'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-2 min-w-[40px] h-10 rounded-full bg-white border-2 flex items-center justify-center shrink-0 shadow-sm ${latestTestInfo?.abnormal > 0 ? 'border-amber-200' : 'border-emerald-200'}`}>
              <span className={`text-[13px] font-black ${latestTestInfo?.abnormal > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {latestTestInfo ? `${latestTestInfo.normal}/${latestTestInfo.total}` : '-'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-primary leading-tight mb-0.5">מדדים תקינים</p>
              <p className="text-[10px] text-on-surface-variant leading-tight">
                {latestTestInfo 
                  ? (latestTestInfo.abnormal > 0 ? `נמצאו ${latestTestInfo.abnormal} חריגות` : 'כל המדדים בנורמה!') 
                  : 'ממתין לנתונים...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
