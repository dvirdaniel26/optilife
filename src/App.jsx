import { useState, useEffect, createContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Auth from './components/Auth/Auth';
import { supabase } from './lib/supabase';
import { NotificationsProvider } from './context/NotificationsContext';


import OverviewPage from './pages/OverviewPage';
import TestAnalysisPage from './pages/TestAnalysisPage';
import AnalysisResultsPage from './pages/AnalysisResultsPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import CheckoutPage from './pages/CheckoutPage';
import NotificationsPage from './pages/NotificationsPage';
import CoachDashboard from './pages/CoachDashboard';
import SupportInboxPage from './pages/SupportInboxPage';

export const UserContext = createContext();

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="text-on-surface bg-background min-h-screen font-body" dir="rtl">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Outlet />
      <Footer />
    </div>
  );
}

function Logout() {
  useEffect(() => {
    supabase.auth.signOut();
  }, []);
  return <Navigate to="/" replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [coachViewMode, setCoachViewMode] = useState(
    localStorage.getItem('optilife_coach_view') || 'coach'
  );
  const [isRecoveryActive, setIsRecoveryActive] = useState(
    window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
  );

  // Helper to check user suspension status and handle force-logout
  const checkUserStatus = useCallback(async () => {
    if (!session?.user) return;
    try {
      // Fetch fresh user details from the Supabase Auth server (contacts server DB to verify ban status in real-time)
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("Live Auth state check returned an error:", error);
        const errorMsg = error.message?.toLowerCase() || '';
        if (
          errorMsg.includes('suspended') || 
          errorMsg.includes('banned') || 
          errorMsg.includes('invalid claim') || 
          errorMsg.includes('not found') || 
          error.status === 400 || 
          error.status === 401
        ) {
          setShowSuspendedModal(true);
        }
      } else {
        // Successfully verified user status (user is active and NOT banned!)
        setShowSuspendedModal(false);
      }
    } catch (err) {
      console.error("Error in live user status check:", err);
    }
  }, [session]);

  // Periodically verify session validity to detect sudden administrative bans
  useEffect(() => {
    if (!session?.user) return;
    
    // Initial check
    checkUserStatus();

    // Check status every 12 seconds
    const interval = setInterval(checkUserStatus, 12000);
    return () => clearInterval(interval);
  }, [session, checkUserStatus]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryActive(true);
      }
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error && error.code === 'PGRST116') {
          // Profile not found, let's create it using the metadata from Auth
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              first_name: session.user.user_metadata?.first_name || '',
              last_name: session.user.user_metadata?.last_name || '',
            }])
            .select()
            .single();
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            data = newProfile;
          }
        } else if (error) {
          console.error("Error fetching profile:", error);
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes('jwt') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden') || errorMsg.includes('invalid claim')) {
            checkUserStatus();
          }
        }
        
        if (data) {
          setProfile(data);
        }
        setLoading(false);
      };
      
      fetchProfile();
    }
  }, [session, checkUserStatus]);

  // Auto-downgrade expired cancelled subscriptions in background
  useEffect(() => {
    if (profile?.subscription_tier?.startsWith('premium_cancelled:')) {
      const endDateStr = profile.subscription_tier.split(':')[1];
      const endDate = new Date(endDateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);
      
      if (endDate < today) {
        const downgradeUser = async () => {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ subscription_tier: 'free' })
              .eq('id', session?.user?.id);
            if (error) throw error;
            setProfile(prev => ({ ...prev, subscription_tier: 'free' }));
          } catch (e) {
            console.error("Error auto-downgrading expired premium subscription:", e);
          }
        };
        downgradeUser();
      }
    }
  }, [profile, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-body" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate global isPremium status
  const getPremiumStatus = (prof) => {
    if (!prof) return false;
    const tier = prof.subscription_tier;
    if (tier === 'premium') return true;
    if (tier?.startsWith('premium_cancelled:')) {
      const endDateStr = tier.split(':')[1];
      const endDate = new Date(endDateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);
      return endDate >= today; // Still active!
    }
    return false;
  };

  const isPremium = getPremiumStatus(profile);

  // Calculate recovery and MFA pending states to enforce login page constraints
  const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
  
  let isMfaPending = false;
  if (session && session.access_token) {
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      const hasVerifiedFactor = session.user?.factors?.some(f => f.status === 'verified');
      isMfaPending = hasVerifiedFactor && payload.aal === 'aal1';
    } catch (e) {
      console.error("Error decoding session token:", e);
    }
  }

  // Developer bypass flag for MFA lockouts in local development
  const mfaBypass = localStorage.getItem('optilife_mfa_bypass') === 'true';
  const shouldShowAuth = !session || isRecovery || isRecoveryActive || (isMfaPending && !mfaBypass);
  const isCoachOrAdmin = (profile?.role === 'coach' || profile?.role === 'admin') && coachViewMode !== 'user';

  return (
    <UserContext.Provider value={{ session, profile, setProfile, isPremium, coachViewMode, setCoachViewMode }}>
      <NotificationsProvider session={session}>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={shouldShowAuth ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={shouldShowAuth ? <Auth isRecovery={isRecoveryActive} onRecoveryComplete={() => setIsRecoveryActive(false)} /> : <Navigate to="/dashboard" replace />} />
            
            {/* Protected Routes */}
            <Route element={(session && (!isMfaPending || mfaBypass)) ? <Layout /> : <Navigate to="/auth" replace />}>
              <Route 
                path="/dashboard" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <OverviewPage />
                } 
              />
              <Route 
                path="/upload" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <TestAnalysisPage />
                } 
              />
              <Route 
                path="/analysis" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <AnalysisResultsPage />
                } 
              />
              <Route 
                path="/pricing" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <PricingPage />
                } 
              />
              <Route 
                path="/notifications" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <NotificationsPage />
                } 
              />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Coach Dashboard - protected by role */}
              <Route 
                path="/coach" 
                element={
                  (profile?.role === 'coach' || profile?.role === 'admin') 
                    ? <CoachDashboard /> 
                    : <Navigate to="/dashboard" replace />
                } 
              />
              
              {/* Placeholder routes for links in the sidebar */}
              <Route 
                path="/plan" 
                element={
                  isCoachOrAdmin 
                    ? <Navigate to="/coach" replace /> 
                    : <ActionPlanPage />
                } 
              />
              <Route path="/support" element={<SupportInboxPage />} />
              <Route path="/help" element={<main className="md:pr-72 pt-24 min-h-screen p-xl"><h1 className="text-2xl font-bold text-primary">עזרה ותמיכה - בקרוב</h1></main>} />
            </Route>
            
            {/* Protected Standalone Routes (Without Sidebar/Navbar/Footer) */}
            <Route element={(session && (!isMfaPending || mfaBypass)) ? <Outlet /> : <Navigate to="/auth" replace />}>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>
            
            <Route path="/logout" element={<Logout />} />
            <Route path="*" element={<div className="min-h-screen flex items-center justify-center bg-background" dir="rtl"><h1 className="text-2xl font-bold text-status-error">404 - עמוד לא נמצא</h1></div>} />
          </Routes>
        </BrowserRouter>
      </NotificationsProvider>
      {/* 🔒 Stunning Premium Suspension Modal */}
      {showSuspendedModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: 'rgba(15, 23, 42, 0.85)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)', 
            zIndex: 99999, 
            padding: '16px', 
            boxSizing: 'border-box' 
          }} 
          dir="rtl"
        >
          <div 
            style={{ 
              width: '94%', 
              maxWidth: '480px', 
              minWidth: '280px', 
              backgroundColor: '#ffffff', 
              borderRadius: '32px', 
              border: '1px solid rgba(239, 68, 68, 0.12)', 
              padding: '40px', 
              textAlign: 'center', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', 
              boxSizing: 'border-box',
              flexShrink: 0
            }}
          >
            {/* Decorative background red glows */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '9999px', filter: 'blur(32px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '128px', height: '128px', backgroundColor: 'rgba(0, 168, 181, 0.03)', borderRadius: '9999px', filter: 'blur(32px)', pointerEvents: 'none' }} />

            {/* Warning Icon Shield */}
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '80px', 
                height: '80px', 
                borderRadius: '9999px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: '#EF4444', 
                marginBottom: '24px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '48px', fontWeight: 'bold' }}>shield_with_heart</span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E1E2D', marginBottom: '16px', fontFamily: '"Assistant", sans-serif', letterSpacing: '-0.5px' }}>
              הגישה לחשבון הוגבלה
            </h2>
            
            <div style={{ color: '#47464c', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px', textAlign: 'center', fontFamily: '"Heebo", sans-serif' }}>
              חשבונך נחסם או הושעה על ידי מנהל המערכת.  
              <span style={{ display: 'block', marginTop: '12px', color: '#6b6375', fontWeight: 500, fontSize: '13px', backgroundColor: '#FDFBF7', padding: '16px', borderRadius: '16px', border: '1px solid #c8c5cc', textAlign: 'right', lineHeight: '1.5' }}>
                מטעמי אבטחה, משמעת או חריגה מתנאי השימוש, הגישה לפלטפורמת OptiLife הוגבלה זמנית או לצמיתות.
              </span>
              <span style={{ display: 'block', marginTop: '16px', fontSize: '13px', fontWeight: 700, color: '#00A8B5', lineHeight: '1.4' }}>
                אם לדעתך חלה טעות או ברצונך לערער על החלטה זו, אנא פנה למחלקת התמיכה והביקורת של OptiLife.
              </span>
            </div>

            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  console.error(e);
                }
                // Clear only developer MFA bypass, leaving notification history intact
                localStorage.removeItem('optilife_mfa_bypass');
                setSession(null);
                setProfile(null);
                setShowSuspendedModal(false);
                window.location.href = '/auth';
              }}
              style={{ 
                width: '100%', 
                padding: '16px', 
                backgroundColor: '#EF4444', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '16px', 
                fontSize: '16px', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                transition: 'all 0.2s', 
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.25)',
                fontFamily: '"Heebo", sans-serif'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#EF4444'; }}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>הבנתי, חזרה להתחברות</span>
            </button>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
}
