import { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const NotificationsContext = createContext();

export function NotificationsProvider({ children, session, profile, isPremium }) {
  const [notifications, setNotifications] = useState([]);
  const [hasDbTable, setHasDbTable] = useState(null); // null = unknown, true = exists, false = fallback
  const userId = session?.user?.id;
  const loadedUserIdRef = useRef(null);
  const automatedCheckedRef = useRef(false);

  // Fetch or initialize notifications
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setHasDbTable(null);
      loadedUserIdRef.current = null;
      return;
    }

    const loadNotifications = async () => {
      // 1. Try to fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setNotifications(data);
          setHasDbTable(true);
          loadedUserIdRef.current = userId;
          return;
        } else {
          // If error occurs, fallback to LocalStorage
          setHasDbTable(false);
        }
      } catch (e) {
        setHasDbTable(false);
      }

      // 2. Fallback: Load from localStorage
      const localData = localStorage.getItem(`optilife_notifications_${userId}`);
      if (localData) {
        setNotifications(JSON.parse(localData));
      } else {
        // Initial welcome notification if no notifications exist at all
        const welcomeNotif = {
          id: 'welcome_' + Date.now(),
          user_id: userId,
          type: 'welcome',
          title: 'ברוכים הבאים ל-OptiLife! 👋',
          message: 'שמחים על הצטרפותך ל-OptiLife! 👋 כדי להתחיל, מומלץ להעלות צילום של בדיקת הדם הראשונה שלך בטאב "העלה בדיקה".',
          link: '/upload',
          is_read: false,
          created_at: new Date().toISOString()
        };
        setNotifications([welcomeNotif]);
        localStorage.setItem(`optilife_notifications_${userId}`, JSON.stringify([welcomeNotif]));
      }

      // Mark notifications as fully loaded for this specific user ID
      loadedUserIdRef.current = userId;

      // 💡 AUTOMATED NOTIFICATIONS LOGIC
      if (!automatedCheckedRef.current && isPremium && profile) {
        automatedCheckedRef.current = true;
        
        // 1. Check if premium user hasn't uploaded a test
        const checkMissingTest = async () => {
          try {
            const { data, error } = await supabase
              .from('blood_tests')
              .select('id')
              .eq('user_id', userId)
              .limit(1);
            
            if (!error && (!data || data.length === 0)) {
              // User has no tests, let's see if we already notified them
              const hasNotified = setNotifications => {
                // We don't have direct access to the latest state here easily without using functional updates, 
                // but we can query DB directly or check the current local state.
              };
              
              const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'warning')
                .like('title', '%לא העלית%');
              
              if (!existing || existing.length === 0) {
                // Dispatch notification
                const newNotif = {
                  id: 'notif_missing_test_' + Date.now(),
                  user_id: userId,
                  type: 'warning',
                  title: 'חסרה בדיקת דם לניתוח ⚠️',
                  message: 'יש לך מנוי פעיל, אך טרם העלית בדיקת דם. על מנת שנוכל להתאים לך תוכנית אישית, אנא העלה בדיקה עכשיו.',
                  link: '/upload',
                  is_read: false,
                  created_at: new Date().toISOString()
                };
                
                // insert to DB and update state
                await supabase.from('notifications').insert([newNotif]);
                setNotifications(prev => [newNotif, ...prev]);
              }
            }
          } catch(e) {
            console.error(e);
          }
        };

        // 2. Check for active health challenges
        const checkActiveChallenges = async () => {
          try {
            const { data: challenges, error } = await supabase
              .from('health_challenges')
              .select('*')
              .eq('status', 'active');
            
            if (!error && challenges && challenges.length > 0) {
              const activeChallenge = challenges[0];
              // Check if already notified
              const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'info')
                .like('title', `%${activeChallenge.title}%`);
              
              if (!existing || existing.length === 0) {
                 const newNotif = {
                  id: 'notif_challenge_' + activeChallenge.id + '_' + Date.now(),
                  user_id: userId,
                  type: 'info',
                  title: `אתגר בריאות חדש: ${activeChallenge.title} 🎯`,
                  message: 'הצטרף עכשיו לאתגר הבריאות החדש שלנו ושפר את המדדים שלך יחד עם הקהילה!',
                  link: '/wellness',
                  is_read: false,
                  created_at: new Date().toISOString()
                };
                await supabase.from('notifications').insert([newNotif]);
                setNotifications(prev => [newNotif, ...prev]);
              }
            }
          } catch(e) {
             console.error(e);
          }
        };

        checkMissingTest();
        checkActiveChallenges();
      }
    };

    loadNotifications();

    // 📡 Live Realtime listener for immediate coach directives!
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setNotifications(prev => {
              if (prev.some(n => n.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, profile, isPremium]);

  // Sync state to LocalStorage if we are in fallback mode, ONLY after notifications are successfully loaded for this user
  useEffect(() => {
    if (userId && hasDbTable === false && loadedUserIdRef.current === userId) {
      localStorage.setItem(`optilife_notifications_${userId}`, JSON.stringify(notifications));
    }
  }, [notifications, userId, hasDbTable]);

  // Add Notification
  const addNotification = async ({ type, title, message, link }) => {
    if (!userId) return;

    const newNotif = {
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      type: type || 'info',
      title,
      message,
      link: link || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Update state first for instant UI response
    setNotifications(prev => [newNotif, ...prev]);

    // Try DB insert if table exists
    if (hasDbTable) {
      try {
        const { error } = await supabase
          .from('notifications')
          .insert([newNotif]);
        if (error) {
          console.error('Error inserting notification to DB:', error);
        }
      } catch (e) {
        console.error('Failed to insert notification to Supabase:', e);
      }
    }
  };

  // Mark specific notification as read
  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );

    if (hasDbTable) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
      } catch (e) {
        console.error('Failed to mark notification as read in DB:', e);
      }
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );

    if (hasDbTable) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
      } catch (e) {
        console.error('Failed to mark all notifications as read in DB:', e);
      }
    }
  };

  // Delete specific notification
  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (hasDbTable) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.error('Failed to delete notification in DB:', e);
      }
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    setNotifications([]);

    if (hasDbTable) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId);
      } catch (e) {
        console.error('Failed to clear notifications in DB:', e);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}
