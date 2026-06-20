import { useState, useEffect, useContext } from 'react';
import { NotificationsContext } from '../context/NotificationsContext';
import { UserContext } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';

export default function NotificationsPage() {
  const { profile } = useContext(UserContext);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useContext(NotificationsContext);
  const isFemale = profile?.gender === 'female';

  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read', 'system'
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Auto-focus notification if passed from state
  useEffect(() => {
    const highlightId = location.state?.highlightId;
    if (highlightId && notifications.length > 0) {
      const found = notifications.find(n => n.id === highlightId);
      if (found) {
        setSelectedNotif(found);
        if (!found.is_read) {
          markAsRead(found.id);
        }
        setShowMobileDetail(true);
        
        // Clear React Router history state to avoid refocusing infinitely
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else if (notifications.length > 0 && !selectedNotif) {
      // Default to first notification on desktop if none is selected
      setSelectedNotif(notifications[0]);
    }
  }, [location.state, notifications, selectedNotif, markAsRead, navigate, location.pathname]);

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

  // Format Full Date for detail panel
  const formatFullDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get Styling classes & icon per notification type
  const getTypeConfig = (type) => {
    switch (type) {
      case 'welcome':
        return {
          bg: 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
          icon: 'celebration',
          label: 'ברכה',
          headerBg: 'bg-amber-50/50 border-amber-100 text-amber-800'
        };
      case 'plan':
        return {
          bg: 'bg-cyan-50 text-secondary border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
          icon: 'auto_awesome',
          label: 'תוכנית בריאות',
          headerBg: 'bg-cyan-50/50 border-cyan-100 text-cyan-800'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
          icon: 'task_alt',
          label: 'הצלחה',
          headerBg: 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
        };
      case 'warning':
        return {
          bg: 'bg-rose-50 text-rose-500 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
          icon: 'report',
          label: 'התראה',
          headerBg: 'bg-rose-50/50 border-rose-100 text-rose-800'
        };
      default:
        return {
          bg: 'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
          icon: 'info',
          label: 'עדכון',
          headerBg: 'bg-blue-50/50 border-blue-100 text-blue-800'
        };
    }
  };

  // Filtered and Searched notifications
  const filteredNotifications = notifications.filter(notif => {
    // 1. Filter by status
    if (filter === 'unread' && notif.is_read) return false;
    if (filter === 'read' && !notif.is_read) return false;
    if (filter === 'system' && !['welcome', 'warning', 'plan'].includes(notif.type)) return false;

    // 2. Filter by search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const titleMatch = notif.title?.toLowerCase().includes(query);
      const msgMatch = notif.message?.toLowerCase().includes(query);
      return titleMatch || msgMatch;
    }

    return true;
  });

  const handleSelectNotif = (notif) => {
    setSelectedNotif(notif);
    markAsRead(notif.id);
    setShowMobileDetail(true);
  };

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all flex flex-col">
      <div className="p-sm md:p-md lg:p-xl max-w-6xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-md pb-xs border-b border-outline-variant">
          <div>
            <h2 className="font-heading text-3xl text-primary font-bold">תיבת הודעות והתראות</h2>
            <p className="font-body text-xs text-on-surface-variant mt-1">
              {isFemale ? 'נהלי את כל התראות המערכת ותוכניות הבריאות האישיות שלך במקום אחד.' : 'נהל את כל התראות המערכת ותוכניות הבריאות האישיות שלך במקום אחד.'}
            </p>
          </div>
          <div className="flex items-center gap-xs">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-secondary/10 hover:bg-secondary/15 text-secondary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                {isFemale ? 'סמני הכל כנקרא' : 'סמן הכל כנקרא'}
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={clearAll}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                {isFemale ? 'נקי הכל' : 'נקה הכל'}
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-sm mb-md items-center bg-white p-sm rounded-2xl border border-slate-100 custom-shadow">
          {/* Quick Filters */}
          <div className="md:col-span-8 flex flex-wrap gap-xs">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${filter === 'all' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              הכל ({notifications.length})
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${filter === 'unread' ? 'bg-secondary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              שלא נקראו
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setFilter('read')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${filter === 'read' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              נקראו
            </button>
            <button 
              onClick={() => setFilter('system')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${filter === 'system' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              הודעות מערכת
            </button>
          </div>

          {/* Search bar */}
          <div className="md:col-span-4 relative w-full">
            <input 
              type="text"
              placeholder="חיפוש לפי כותרת או תוכן..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-50/50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-secondary focus:bg-white transition-all text-right"
              dir="rtl"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Inbox Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-md min-h-[450px]">
          
          {/* Right Pane: List of Notifications (Full Width on mobile, 5 cols on Desktop) */}
          <div className={`lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-150 custom-shadow overflow-hidden ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-sm bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">הודעות ({filteredNotifications.length})</span>
              {searchTerm && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">תוצאות חיפוש</span>}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[550px] divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="p-xl flex flex-col items-center justify-center text-center text-on-surface-variant min-h-[300px]">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-md border border-slate-100/50">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">notifications_off</span>
                  </div>
                  <p className="font-heading font-bold text-primary text-sm mb-xs">לא נמצאו הודעות</p>
                  <p className="text-xs max-w-[240px] leading-relaxed">אין כרגע התראות התואמות לחיפוש או לסינון שבחרת.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isUnread = !notif.is_read;
                  const isSelected = selectedNotif?.id === notif.id;
                  const typeConfig = getTypeConfig(notif.type);

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => handleSelectNotif(notif)}
                      className={`group p-md flex gap-sm items-start transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'bg-slate-50 border-r-4 border-secondary' 
                          : isUnread 
                          ? 'bg-secondary/[0.02] hover:bg-slate-50/50' 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Indicator dot */}
                      {isUnread && (
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 w-2 h-2 bg-secondary rounded-full"></span>
                      )}

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeConfig.bg}`}>
                        <span className="material-symbols-outlined text-lg">{typeConfig.icon}</span>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 pr-1 select-none text-right">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h5 className={`text-xs leading-snug truncate ${isUnread ? 'font-bold text-primary' : 'text-slate-700'}`}>
                            {notif.title}
                          </h5>
                          <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        {notif.sender_name && (
                          <p className="text-[9px] text-secondary font-bold mb-1 flex items-center gap-[2px]">
                            <span className="material-symbols-outlined text-[10px]">person</span>
                            {notif.sender_name}
                          </p>
                        )}
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-1 mb-0.5">
                          {notif.message}
                        </p>
                      </div>

                      {/* Quick Action Delete */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                          if (selectedNotif?.id === notif.id) {
                            setSelectedNotif(null);
                          }
                        }}
                        className="material-symbols-outlined text-slate-350 hover:text-rose-500 text-base transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0 opacity-0 group-hover:opacity-100 self-center"
                      >
                        delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Left Pane: Detailed View of Selection (Slide-out/overlay on mobile, 7 cols on Desktop) */}
          <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-150 custom-shadow overflow-hidden flex flex-col ${showMobileDetail ? 'flex' : 'hidden lg:flex'}`}>
            {selectedNotif ? (
              <div className="flex-1 flex flex-col h-full">
                
                {/* Mobile Back Header */}
                <div className="lg:hidden p-sm bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => setShowMobileDetail(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-secondary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_right</span>
                    חזרה לרשימה
                  </button>
                  <span className="text-xs font-bold text-slate-400">פרטי ההודעה</span>
                </div>

                {/* Main Content Area */}
                <div className="p-md md:p-lg flex-1 flex flex-col">
                  {/* Category Pill + Date */}
                  <div className="flex items-center justify-between gap-sm mb-sm">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getTypeConfig(selectedNotif.type).bg}`}>
                      {getTypeConfig(selectedNotif.type).label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {formatFullDate(selectedNotif.created_at)}
                    </span>
                  </div>

                  {/* Header Title with Big Icon */}
                  <div className="flex items-start gap-md mb-md pb-md border-b border-slate-100">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${getTypeConfig(selectedNotif.type).bg} shadow-md`}>
                      <span className="material-symbols-outlined text-2xl">{getTypeConfig(selectedNotif.type).icon}</span>
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg md:text-xl font-heading font-bold text-primary leading-tight">
                        {selectedNotif.title}
                      </h3>
                      {selectedNotif.sender_name && (
                        <p className="text-xs text-secondary font-extrabold mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">person</span>
                          נשלח על ידי: {selectedNotif.sender_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notification Body Text - Renders the entire full text */}
                  <div className="flex-1 text-right select-text">
                    <p className="text-sm text-slate-700 leading-relaxed font-body whitespace-pre-line bg-slate-50/50 p-md rounded-2xl border border-slate-100/50">
                      {selectedNotif.message}
                    </p>
                  </div>

                  {/* Actions / Buttons Footer */}
                  <div className="mt-lg pt-md border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-md">
                    <div className="flex items-center gap-xs w-full sm:w-auto">
                      <button 
                        onClick={() => {
                          deleteNotification(selectedNotif.id);
                          setSelectedNotif(null);
                          setShowMobileDetail(false);
                        }}
                        className="px-4 py-2 border border-rose-100 hover:bg-rose-50 text-rose-500 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        {isFemale ? 'מחקי הודעה' : 'מחק הודעה'}
                      </button>
                    </div>

                    {selectedNotif.link && selectedNotif.link !== '/dashboard' && (
                      <button 
                        onClick={() => {
                          const targetLink = selectedNotif.link === '/support' ? '/dashboard' : selectedNotif.link;
                          navigate(targetLink);
                        }}
                        className="px-6 py-2.5 bg-secondary hover:bg-secondary/95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer shadow-md shadow-secondary/10"
                      >
                        {selectedNotif.link === '/upload' ? 'להעלאת בדיקת דם 🩸' : 
                         selectedNotif.link === '/plan' ? 'לצפייה בתוכנית הבריאות שלי 📋' : 
                         selectedNotif.link === '/settings' ? 'למעבר להגדרות הפרופיל 👤' : 
                         selectedNotif.link === '/support' ? 'חזרה ללוח הבקרה 🏠' :
                         'עבור לעמוד לביצוע הפעולה'}
                        <span className="material-symbols-outlined text-sm">arrow_left</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-on-surface-variant p-xl">
                <div className="w-20 h-20 rounded-full bg-slate-50/50 border border-slate-100/50 flex items-center justify-center mb-md custom-shadow">
                  <span className="material-symbols-outlined text-slate-350 text-4xl">drafts</span>
                </div>
                <h4 className="font-heading font-bold text-primary text-md mb-xs">לא נבחרה הודעה</h4>
                <p className="text-xs max-w-[250px] leading-relaxed">
                  {isFemale ? 'בחרי הודעה מהרשימה מימין כדי לקרוא את המלל המלא שלה ולבצע פעולות נדרשות.' : 'בחר הודעה מהרשימה מימין כדי לקרוא את המלל המלא שלה ולבצע פעולות נדרשות.'}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}
