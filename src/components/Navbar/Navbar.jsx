import { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../../App';
import { NotificationsContext } from '../../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Navbar({ toggleSidebar }) {
  const { profile, isPremium } = useContext(UserContext);
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll } = useContext(NotificationsContext);
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Profile Menu & Support states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  
  const profileMenuRef = useRef(null);

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'משתמש/ת';

  const getTierDisplayName = () => {
    const tier = profile?.subscription_tier;
    const isFemaleUser = profile?.gender === 'female';
    if (tier === 'ai_ultimate') return isFemaleUser ? 'מנויה אולטימטיבי ⚡' : 'מנוי אולטימטיבי ⚡';
    if (tier?.startsWith('ai_ultimate_cancelled:')) return isFemaleUser ? 'אולטימטיבי (מבוטל) ⚡' : 'אולטימטיבי (מבוטל) ⚡';
    if (tier === 'premium') return isFemaleUser ? 'מנויה מקצועי 👑' : 'מנוי מקצועי 👑';
    if (tier?.startsWith('premium_cancelled:')) return isFemaleUser ? 'מקצועי (מבוטל) 👑' : 'מקצועי (מבוטל) 👑';
    if (tier === 'standard') return isFemaleUser ? 'מנויה מתקדם 🌟' : 'מנוי מתקדם 🌟';
    if (tier?.startsWith('standard_cancelled:')) return isFemaleUser ? 'מתקדם (מבוטל) 🌟' : 'מתקדם (מבוטל) 🌟';
    return 'מסלול בסיסי';
  };


  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Hebrew relative time
  const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffHours < 48) return 'אתמול';
    return date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <header className="h-20 w-full fixed top-0 left-0 z-30 bg-background/80 backdrop-blur-md flex justify-between items-center md:pr-80 px-md md:px-xl transition-all print:hidden">
      <div className="flex items-center gap-md flex-1">
        <button className="md:hidden text-primary" onClick={toggleSidebar}>
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
      </div>
      <div className="flex items-center gap-sm md:gap-md">
        
        {/* Notifications Dropdown Area */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors relative p-1.5 rounded-full hover:bg-slate-100/50 flex items-center justify-center"
          >
            notifications
            {unreadCount > 0 && (
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute left-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl custom-shadow border border-slate-100 z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="p-md border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-xl">notifications</span>
                  <h4 className="font-heading font-bold text-primary text-md">התראות</h4>
                  {unreadCount > 0 && (
                    <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} חדשות
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    className="text-xs font-bold text-secondary hover:underline transition-all"
                  >
                    סמן הכל כנקרא
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-xl flex flex-col items-center justify-center text-center text-on-surface-variant min-h-[220px]">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-md border border-slate-100/50 relative">
                      <span className="material-symbols-outlined text-slate-300 text-3xl">notifications_off</span>
                    </div>
                    <p className="font-heading font-bold text-primary text-sm mb-xs">הכל שקט כאן...</p>
                    <p className="text-xs max-w-[200px] leading-relaxed">אין לך התראות חדשות כרגע. נעדכן אותך כשיהיה משהו מעניין!</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.is_read;
                    let typeStyles = '';
                    let iconName = '';

                    switch (notif.type) {
                      case 'welcome':
                        typeStyles = 'bg-amber-50 text-amber-500 border-amber-100';
                        iconName = 'celebration';
                        break;
                      case 'plan':
                        typeStyles = 'bg-cyan-50 text-secondary border-cyan-100';
                        iconName = 'auto_awesome';
                        break;
                      case 'success':
                        typeStyles = 'bg-emerald-50 text-emerald-500 border-emerald-100';
                        iconName = 'task_alt';
                        break;
                      case 'warning':
                        typeStyles = 'bg-rose-50 text-rose-500 border-rose-100';
                        iconName = 'report';
                        break;
                      default:
                        typeStyles = 'bg-blue-50 text-blue-500 border-blue-100';
                        iconName = 'info';
                    }

                    return (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          navigate('/notifications', { state: { highlightId: notif.id } });
                          setIsNotifOpen(false);
                        }}
                        className={`group p-md flex gap-md items-start transition-all cursor-pointer relative ${isUnread ? 'bg-secondary/[0.02]' : 'hover:bg-slate-50/50'}`}
                      >
                        {/* Indicator dot */}
                        {isUnread && (
                          <span className="absolute top-1/2 left-3 -translate-y-1/2 w-2 h-2 bg-secondary rounded-full"></span>
                        )}

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeStyles}`}>
                          <span className="material-symbols-outlined text-xl">{iconName}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-1 select-none">
                          <h5 className={`text-sm mb-0.5 leading-snug truncate ${isUnread ? 'font-bold text-primary' : 'text-slate-700'}`}>
                            {notif.title}
                          </h5>
                          {notif.sender_name && (
                            <p className="text-[10px] text-secondary font-bold mb-1 flex items-center gap-[3px]">
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              {notif.sender_name}
                            </p>
                          )}
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-1 pl-4">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>

                        {/* Delete button (only shows on hover) */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="material-symbols-outlined text-slate-300 hover:text-rose-500 text-lg transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0 md:opacity-0 group-hover:opacity-100 self-center"
                        >
                          delete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-sm bg-slate-50/30 border-t border-slate-100 flex items-center justify-between px-md gap-sm">
                <button 
                  onClick={() => {
                    navigate('/notifications');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs text-secondary font-bold hover:text-secondary/80 transition-colors flex items-center gap-xs py-1.5 px-3 rounded-xl bg-secondary/5 hover:bg-secondary/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">inbox</span>
                  תיבת הודעות מלאה
                </button>
                
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAll} 
                    className="text-xs text-slate-400 font-bold hover:text-rose-500 transition-colors flex items-center gap-xs py-1.5 px-3 rounded-xl hover:bg-rose-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    נקה הכל
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-outline-variant mx-xs hidden sm:block"></div>
        
        
        {/* Profile Dropdown Area */}
        <div className="relative" ref={profileMenuRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-sm hover:bg-slate-100/50 p-1.5 rounded-2xl transition-all select-none cursor-pointer border border-transparent hover:border-slate-150 group"
          >
            <img 
              alt="User Profile" 
              className="h-10 w-10 rounded-full custom-shadow border-2 border-white object-cover shrink-0" 
              src={profile?.profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(fullName) + "&background=1E1E2D&color=fff"}
            />
            <div className="text-right hidden sm:block pr-1">
              <p className="text-sm font-bold text-primary leading-tight">{fullName}</p>
              <p className={`text-[10px] font-extrabold uppercase tracking-wider ${profile?.subscription_tier && profile.subscription_tier !== 'free' ? 'text-secondary' : 'text-on-surface-variant'} mt-0.5`}>
                {getTierDisplayName()}
              </p>
            </div>
            <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-secondary' : 'group-hover:text-slate-600'}`}>
              expand_more
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute left-0 mt-3 w-56 bg-white/95 backdrop-blur-md rounded-2xl custom-shadow border border-slate-100 z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-md border-b border-slate-50 flex flex-col gap-0.5 sm:hidden bg-slate-50/30">
                <p className="text-sm font-bold text-primary">{fullName}</p>
                <p className={`text-[10px] font-extrabold uppercase tracking-wider ${profile?.subscription_tier && profile.subscription_tier !== 'free' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {getTierDisplayName()}
                </p>
              </div>
              <div className="py-2 divide-y divide-slate-100/80">
                <div className="py-1">
                  <button 
                    onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                    className="w-full px-md py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-secondary transition-all flex items-center gap-md justify-start cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-lg">settings</span>
                    <span>הגדרות חשבון</span>
                  </button>
                  <button 
                    onClick={() => { setIsSupportModalOpen(true); setIsProfileOpen(false); }}
                    className="w-full px-md py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-secondary transition-all flex items-center gap-md justify-start cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-lg">help</span>
                    <span>עזרה ותמיכה</span>
                  </button>

                </div>
                <div className="py-1">
                  <button 
                    onClick={() => { navigate('/logout'); setIsProfileOpen(false); }}
                    className="w-full px-md py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50/80 transition-all flex items-center gap-md justify-start cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-rose-450 text-lg">logout</span>
                    <span>התנתקות מהמערכת</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>

    {/* 📞 Help & Support Premium Modal */}
    {isSupportModalOpen && (
      <div 
        onClick={() => {
          setIsSupportModalOpen(false);
          setSupportSubject('');
          setSupportMessage('');
        }}
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ width: '90%', maxWidth: '500px', minWidth: '320px' }}
          className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden shrink-0 animate-in zoom-in-95 duration-200 text-right font-body flex flex-col"
        >
          
          {/* Header */}
          <div className="bg-primary p-6 text-white flex justify-between items-center relative">
            <div>
              <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-secondary">help</span>
                עזרה ותמיכה
              </h3>
              <p className="text-white/70 text-xs mt-1">אנחנו כאן כדי לסייע לך בכל שאלה או פנייה רפואית וטכנית.</p>
            </div>
            <button 
              onClick={() => {
                setIsSupportModalOpen(false);
                setSupportSubject('');
                setSupportMessage('');
              }}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Content Tabs (FAQ & Contact Us) */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* FAQ Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-primary text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-lg">question_answer</span>
                שאלות נפוצות (FAQ)
              </h4>
              
              <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <summary className="font-bold text-xs text-primary cursor-pointer flex justify-between items-center select-none">
                  <span>כיצד להעלות קובץ בדיקות דם?</span>
                  <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-2 pl-4">
                  ניתן ללחוץ על כפתור ה-<span className="font-bold">"UPLOAD TEST"</span> הכתום בתחתית התפריט הצידי, או על <span className="font-bold">"העלה בדיקה חדשה"</span> במסך הראשי. המערכת תומכת בהעלאת קבצי PDF או תמונות (PNG/JPG) של בדיקות דם מהקופה.
                </p>
              </details>

              <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <summary className="font-bold text-xs text-primary cursor-pointer flex justify-between items-center select-none">
                  <span>איך פועל ניתוח ה-AI הרפואי?</span>
                  <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-2 pl-4">
                  המערכת שלנו סורקת את הקובץ באמצעות טכנולוגיית OCR מתקדמת, מחלצת את ערכי הבדיקה, ומפענחת אותם מול מודל ה-AI הבריאותי שלנו. בסיום תקבל המלצות בריאותיות מותאמות אישית, הסברים על המדדים ותפריט תזונה מבוסס ערכים.
                </p>
              </details>

              <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <summary className="font-bold text-xs text-primary cursor-pointer flex justify-between items-center select-none">
                  <span>כיצד ניתן לבטל את המנוי?</span>
                  <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-2 pl-4">
                  תוכל לבטל את המנוי המשודרג שלך בכל עת דרך עמוד <span className="font-bold">"הגדרות חשבון"</span> תחת כרטיסיית המנוי בצד שמאל, על ידי לחיצה על כפתור <span className="font-bold">"ביטול מנוי"</span>. החשבון יוחזר מיידית למסלול הבסיסי.
                </p>
              </details>
            </div>

            {/* Contact Form Section */}
            <div className="space-y-4 pt-2">
              <h4 className="font-bold text-primary text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-lg">mail</span>
                שליחת פנייה לצוות התמיכה
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">נושא הפנייה</label>
                  <select 
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-secondary transition-colors cursor-pointer"
                  >
                    <option value="" disabled>בחרו נושא פנייה...</option>
                    <option value="תקלה טכנית או שגיאה באתר">תקלה טכנית או שגיאה באתר</option>
                    <option value="שאלה לגבי פענוח בדיקות דם">שאלה לגבי פענוח בדיקות דם</option>
                    <option value="ייעוץ תזונתי או תפריט בריאות">ייעוץ תזונתי או תפריט בריאות</option>
                    <option value="מנויים, תשלומים ושדרוג מנוי">מנויים, תשלומים ושדרוג מנוי</option>
                    <option value="אחר">אחר</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">תוכן הפנייה</label>
                  <textarea 
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="פרט כאן את פנייתך לעומק, כולל פרטים רלוונטיים..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-secondary transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      if (!supportSubject || !supportMessage) return;
                      setSupportLoading(true);
                      
                      try {
                        // Insert real ticket into Supabase DB
                        const { error } = await supabase
                          .from('support_tickets')
                          .insert([{
                            user_id: profile.id,
                            subject: supportSubject,
                            message: supportMessage,
                            status: 'open',
                            replies: []
                          }]);
                        
                        if (error) throw error;

                        addNotification({
                          type: 'success',
                          title: 'פנייתך התקבלה בהצלחה! 📩',
                          message: `נושא: ${supportSubject}. פנייתך נרשמה בהצלחה במערכת ותיענה על ידי צוות התמיכה שלנו במייל בהקדם.`,
                          link: '/dashboard'
                        });

                        setIsSupportModalOpen(false);
                        setSupportSubject('');
                        setSupportMessage('');
                      } catch (err) {
                        console.error('Error submitting support ticket:', err);
                        // Fallback notification if DB insert fails (e.g. before SQL table is created)
                        addNotification({
                          type: 'warning',
                          title: 'שגיאה בשמירת הפנייה ⚠️',
                          message: 'אירעה שגיאה בחיבור לשרת, אנא וודא שהרצת את טבלת ה-SQL של התמיכה ונסה שוב.',
                          link: '/dashboard'
                        });
                      } finally {
                        setSupportLoading(false);
                      }
                    }}
                    disabled={supportLoading || !supportSubject || !supportMessage}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {supportLoading ? (
                      <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
                    ) : null}
                    שלח פנייה
                  </button>
                </div>
              </div>
            </div>
            
          </div>

        </div>
      </div>
    )}
  </>
);
}
