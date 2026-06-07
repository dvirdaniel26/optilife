import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2, AlertCircle, User as UserIcon, ShieldCheck, KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 🌐 Robust & Premium Hebrew Auth Error Translator
const translateAuthError = (message, currentEmail, isLogin) => {
  if (!message) return null;
  const msg = typeof message === 'string' ? message.toLowerCase() : String(message).toLowerCase();
  const isGoogleMail = currentEmail && currentEmail.toLowerCase().endsWith('@gmail.com');

  // Intercept Google account errors only during login and strictly for credential conflicts
  if (isLogin && isGoogleMail && (
    msg.includes('invalid login credentials') || 
    msg.includes('user not found') || 
    msg.includes('invalid credentials')
  )) {
    return {
      title: 'התחברות באמצעות Google בלבד',
      description: 'חשבון זה רשום ומאובטח דרך Google.\n\nעליך להתחבר באמצעות לחיצה על כפתור **"התחברו באמצעות Google"** שבתחתית העמוד בלבד.'
    };
  }

  // 1. Email rate limit
  if (msg.includes('rate limit exceeded') || msg.includes('rate_limit') || msg.includes('too many requests')) {
    return {
      title: 'נחסמה שליחת מיילים זמנית (מגבלת שרת)',
      description: 'השרת זיהה מספר רב של בקשות לקבלת קוד אימות או מייל איפוס בזמן קצר, וחסם את השליחה מטעמי אבטחה. אנא נסה שוב בעוד מספר דקות.'
    };
  }

  // 2. Invalid credentials
  if (msg.includes('invalid login credentials') || msg.includes('user not found') || msg.includes('invalid credentials')) {
    return {
      title: 'פרטי ההתחברות אינם נכונים',
      description: 'כתובת האימייל או הסיסמה שהזנת אינם תואמים לרישומים שלנו. אנא ודא שהקלדת אותם נכון ונסה שוב.'
    };
  }

  // 3. Token expired or invalid
  if (msg.includes('token has expired') || msg.includes('invalid') || msg.includes('otp expired') || msg.includes('email link is invalid')) {
    return {
      title: 'קוד האימות פג תוקף או שגוי',
      description: 'הקוד שהזנת או הקישור שעליו לחצת כבר אינם תקפים מטעמי אבטחה. אנא בקש קוד חדש ונסה שוב.'
    };
  }

  // 4. User already registered
  if (msg.includes('user already registered') || msg.includes('user already exists')) {
    return {
      title: 'כתובת אימייל זו כבר רשומה',
      description: 'קיים כבר חשבון הרשום עם כתובת המייל הזו במערכת.\n\n💡 **מה לעשות?** עבור למסך ההתחברות כדי להיכנס, או לחץ על קישור "שכחת סיסמה" כדי לשחזר את הגישה.'
    };
  }

  // 5. Weak password
  if (msg.includes('signup requires a valid password') || msg.includes('password should be') || msg.includes('weak password')) {
    return {
      title: 'הסיסמה שהזנת חלשה מדי',
      description: 'על הסיסמה להכיל לפחות 6 תווים. מומלץ לשלב אותיות, מספרים ותווים מיוחדים כדי להבטיח את בטיחות החשבון שלך.'
    };
  }

  // 6. Invalid email format
  if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
    return {
      title: 'כתובת אימייל לא תקינה',
      description: 'הכתובת שהזנת אינה במבנה תקין של דואר אלקטרוני. אנא ודא שהקלדת אותה נכון (למשל: name@example.com).'
    };
  }

  // 7. Network / connection issues
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return {
      title: 'בעיית חיבור לרשת',
      description: 'לא הצלחנו ליצור קשר עם שרת האבטחה. אנא ודא שחיבור האינטרנט שלך פעיל ויציב, ונסה שוב.'
    };
  }

  // Default fallback for any other messages
  return {
    title: 'אירעה שגיאה בתהליך ההתחברות',
    description: message || 'אנא ודא שהפרטים נכונים ונסה שוב. אם הבעיה נמשכת, פנה לתמיכה הטכנית.'
  };
};

export default function Auth({ isRecovery, onRecoveryComplete }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isUpdatePasswordMode, setIsUpdatePasswordMode] = useState(false);

  // OTP (One-Time Password) Login state
  const [useOTP, setUseOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  // MFA Challenge State
  const [isMfaChallenge, setIsMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingFactorId, setPendingFactorId] = useState('');
  const [recoveryAfterMFA, setRecoveryAfterMFA] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

  // Helper to check if MFA is enrolled and trigger challenge screen
  const checkAndTriggerMFA = async (currentSession) => {
    if (!currentSession) return false;

    try {
      // Decode AAL from JWT token
      const payload = JSON.parse(atob(currentSession.access_token.split('.')[1]));
      const factors = currentSession.user?.factors || [];
      const hasVerifiedFactor = factors.some(f => f.status === 'verified');

      // If factor is verified but JWT is still AAL1, MFA verification is pending
      if (hasVerifiedFactor && payload.aal === 'aal1') {
        const activeFactor = factors.find(f => f.status === 'verified');
        setPendingFactorId(activeFactor.id);
        setIsMfaChallenge(true);
        setError(null);
        setMessage('חשבונך מאובטח בהתחברות דו-שלבית. אנא הזן את קוד ה-Authenticator.');
        return true;
      }
    } catch (e) {
      console.error("Error checking MFA state:", e);
    }
    return false;
  };

  // 1. Detect if the user arrived via a password reset/recovery link and check if MFA is required
  useEffect(() => {
    const checkRecoveryAndMFA = async () => {
      const isRecoveryHash = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
      if (isRecovery || isRecoveryHash) {
        setError(null);

        // Fetch current session (set by Supabase when clicking the link)
        const { data: { session } } = await supabase.auth.getSession();

        const hasMFA = await checkAndTriggerMFA(session);
        if (hasMFA) {
          setRecoveryAfterMFA(true);
          setMessage('נדרש אימות דו-שלבי (MFA) לפני שנוכל לאפשר את איפוס הסיסמה של החשבון המאובטח.');
        } else {
          setIsUpdatePasswordMode(true);
          setMessage('אנא קבע סיסמה חדשה ומאובטחת עבור החשבון שלך.');
        }
      }
    };

    checkRecoveryAndMFA();
  }, [isRecovery]);

  // 1b. Check if MFA challenge is required for an already established session (e.g. after Google OAuth redirect)
  useEffect(() => {
    const checkSessionMFA = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await checkAndTriggerMFA(currentSession);
      }
    };
    checkSessionMFA();
  }, []);

  // 1c. Check for OAuth / Redirect authentication errors in the URL (query or hash)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    
    const errorType = params.get('error') || hashParams.get('error');
    const errorDesc = params.get('error_description') || hashParams.get('error_description');
    
    if (errorType || errorDesc) {
      console.warn("Detected authentication error in URL:", errorType, errorDesc);
      const desc = (errorDesc || '').toLowerCase();
      if (desc.includes('suspended') || desc.includes('banned') || desc.includes('unauthorized') || desc.includes('blocked')) {
        setError('חשבונך נחסם או הושעה על ידי מנהל המערכת. לא ניתן להתחבר לחשבון זה.');
      } else {
        setError(errorDesc || 'אירעה שגיאה בתהליך ההזדהות. אנא נסה שוב.');
      }
      
      // Clean up the URL query/hash so the error message doesn't persist on page refreshes
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 2. Main Authentication handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isUpdatePasswordMode) {
        // A. Resetting / Updating to a new password
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        setMessage('הסיסמה שלך עודכנה בהצלחה! מועבר ללוח הבקרה...');
        setTimeout(() => {
          // Clear recovery hash and redirect
          window.location.hash = '';
          if (onRecoveryComplete) onRecoveryComplete();
          navigate('/dashboard', { replace: true });
        }, 2000);

      } else if (isResetPassword) {
        // B. Forgot password - sending recovery email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth',
        });
        if (error) throw error;
        setMessage('קישור לאיפוס סיסמה נשלח לאימייל שלך!');

      } else if (useOTP) {
        // C. Passwordless OTP flow
        if (!otpSent) {
          // Step 1: Send the One-Time-Password (OTP) to email
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin + '/auth',
            }
          });
          if (error) throw error;
          setOtpSent(true);
          setMessage('קוד אימות חד-פעמי נשלח לכתובת האימייל שלך! אנא הזן אותו מטה.');
        } else {
          // Step 2: Verify the 6-digit OTP code
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otpToken,
            type: 'email'
          });
          if (error) throw error;

          // Check if MFA is required for this logged in session
          const hasMFA = await checkAndTriggerMFA(data.session);
          if (!hasMFA) {
            navigate('/dashboard');
          }
        }

      } else if (isLogin) {
        // D. Regular email/password login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if MFA is required for this logged in session
        const hasMFA = await checkAndTriggerMFA(data.session);
        if (!hasMFA) {
          navigate('/dashboard');
        }

      } else {
        // E. Registration
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });
        if (error) throw error;

        setMessage('נשלח מייל אימות! אנא בדוק את תיבת הדואר שלך (ואז התחבר).');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'אירעה שגיאה. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };



  // 3. MFA Challenge Verification Handler
  const handleMFAChallengeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Enroll check & Challenge submission
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: pendingFactorId
      });
      if (challengeError) throw challengeError;

      // Verify the Authenticator code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: challengeData.id,
        code: mfaCode
      });
      if (verifyError) throw verifyError;

      // Successful verification! Check if we are in recovery mode
      if (recoveryAfterMFA) {
        setIsMfaChallenge(false);
        setIsUpdatePasswordMode(true);
        setMfaCode('');
        setMessage('האימות הדו-שלבי הושלם בהצלחה! כעת תוכל לקבוע סיסמה חדשה ומאובטחת עבור החשבון.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'קוד אימות שגוי. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || `אירעה שגיאה בהתחברות באמצעות ${provider}.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 font-body relative overflow-hidden" dir="rtl">

      {/* 🏛️ Public Premium Header - Navigation & Anti-Stuck Bar */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6 px-8 absolute top-0 z-20">
        {/* Left Side: Back to Homepage */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-primary hover:text-secondary font-bold transition-all group py-2 px-5 bg-white/70 hover:bg-white rounded-full custom-shadow border border-slate-100/50"
        >
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_forward</span>
          <span>חזרה לדף הבית</span>
        </button>

        {/* Right Side: Logo */}
        <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer select-none">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white custom-shadow">
            <span className="material-symbols-outlined text-2xl font-bold">favorite</span>
          </div>
          <span className="font-heading text-xl font-black tracking-wide text-primary">OptiLife</span>
        </div>
      </header>

      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-action/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-xl p-10 rounded-[28px] shadow-2xl border border-slate-100 z-10 custom-shadow transition-all duration-300 hover:shadow-secondary/10 mt-16">

        {/* Title Block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 text-secondary mb-4">
            <span className="material-symbols-outlined text-3xl">
              {isMfaChallenge ? 'shield_lock' : isUpdatePasswordMode ? 'key' : isResetPassword ? 'lock_reset' : 'login'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">
            {isMfaChallenge ? 'אימות דו-שלבי (MFA)' : isUpdatePasswordMode ? 'סיסמה חדשה לחשבונך' : 'OptiLife Wellness'}
          </h1>
          <p className="text-on-surface-variant text-xs font-semibold leading-relaxed">
            {isMfaChallenge
              ? 'חשבונך מאובטח. הזן את הקוד שמתקבל באפליקציית ה-Authenticator בטלפון.'
              : isUpdatePasswordMode
                ? 'הקלד את סיסמתך החדשה כדי להשלים את איפוס החשבון.'
                : isResetPassword
                  ? 'איפוס סיסמה לחשבון'
                  : isLogin
                    ? 'ברוכים הבאים! התחברו לחשבון שלכם'
                    : 'הצטרפו אלינו והתחילו במסע הבריאותי'}
          </p>
        </div>

        {error && (() => {
          const translated = translateAuthError(error, email, isLogin);
          return (
            <div className="mb-6 p-5 bg-status-error/5 border border-status-error/20 rounded-2xl flex flex-col gap-2.5 text-status-error text-xs animate-in fade-in slide-in-from-top-2 shadow-sm text-right" dir="rtl">
              <div className="flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0 text-status-error" />
                <span>{translated.title}</span>
              </div>
              <p className="mt-0.5 leading-relaxed text-slate-600 font-medium whitespace-pre-line">
                {translated.description}
              </p>
            </div>
          );
        })()}

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${isUpdatePasswordMode ? 'bg-secondary/10 border border-secondary/20 text-secondary' : 'bg-status-success/10 border border-status-success/20 text-status-success'}`}>
            <span className="material-symbols-outlined w-5 h-5 shrink-0">check_circle</span>
            <p className="mt-0.5 leading-relaxed">{message}</p>
          </div>
        )}

        {/* 📱 SCREEN 1: Two-Factor Authentication Verification */}
        {isMfaChallenge ? (
          <form onSubmit={handleMFAChallengeSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">קוד אימות דו-שלבי (MFA)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-on-surface-variant/50 transition-colors group-focus-within:text-secondary" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-4 pr-12 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface font-mono text-center text-xl letter-spacing-lg focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                  placeholder="******"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                הקוד מתעדכן בכל 30 שניות באפליקציית האימות שלך (כמו Google Authenticator).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full mt-6 py-4 px-4 bg-secondary text-white rounded-xl font-bold hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg shadow-secondary/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'אימות קוד והתחברות'}
            </button>

            {/* Developer Bypass Link */}
            <div className="text-center mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('optilife_mfa_bypass', 'true');
                  setMessage('עקיפת MFA לפיתוח הופעלה! מועבר...');
                  setTimeout(() => {
                    if (recoveryAfterMFA) {
                      setIsMfaChallenge(false);
                      setIsUpdatePasswordMode(true);
                      setMfaCode('');
                      setMessage('האימות הדו-שלבי נעקף בהצלחה (כלי פיתוח)! כעת תוכל לקבוע סיסמה חדשה.');
                    } else {
                      navigate('/dashboard');
                    }
                  }, 1200);
                }}
                className="text-xs text-secondary hover:text-primary font-bold transition-all hover:underline"
              >
                🔧 כלי פיתוח: עקוף אבטחה דו-שלבית (MFA Bypass)
              </button>
            </div>
          </form>
        ) : isUpdatePasswordMode ? (
          /* 🔐 SCREEN 2: Set New Password Form (Update Password) */
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2 group">
              <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">סיסמה חדשה</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-on-surface-variant/50 transition-colors group-focus-within:text-secondary" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                  placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 6}
              className="w-full mt-6 py-4 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'עדכן סיסמה והתחבר'}
            </button>
          </form>
        ) : (
          /* 💼 SCREEN 3: Standard Login / Signup / Forgot Password Form */
          <div className="space-y-5">

            {/* Login Type Tab Selector (only when logging in and not reset) */}
            {isLogin && !isResetPassword && (
              <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl mb-4 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => { setUseOTP(false); setError(null); setMessage(null); }}
                  className={`w-1/2 py-2 text-center rounded-lg transition-all ${!useOTP ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  סיסמה רגילה
                </button>
                <button
                  type="button"
                  onClick={() => { setUseOTP(true); setError(null); setMessage(null); }}
                  className={`w-1/2 py-2 text-center rounded-lg transition-all ${useOTP ? 'bg-white text-secondary shadow-sm' : 'text-on-surface-variant hover:text-secondary'}`}
                >
                  התחברות מהירה במייל
                </button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {/* Registration First/Last Name inputs */}
              {!isLogin && !isResetPassword && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-2 group w-1/2">
                    <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">שם פרטי</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-on-surface-variant/50 transition-colors group-focus-within:text-secondary" />
                      </div>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-4 pr-12 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                        placeholder="שם פרטי"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2 group w-1/2">
                    <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">שם משפחה</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                        placeholder="שם משפחה"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">דוא״ל</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-on-surface-variant/50 transition-colors group-focus-within:text-secondary" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSent}
                    className="w-full pl-4 pr-12 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background disabled:opacity-60"
                    placeholder="example@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input (Hidden for OTP/Passwordless or Forgot Password flows) */}
              {!isResetPassword && !useOTP && (
                <div className="space-y-2 group animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-sm font-semibold text-on-surface block transition-colors group-focus-within:text-secondary">סיסמה</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-on-surface-variant/50 transition-colors group-focus-within:text-secondary" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-background/50 border border-outline-variant/50 rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                      placeholder="הכנס סיסמה"
                      required
                      minLength={6}
                    />
                  </div>
                  {isLogin && (
                    <div className="flex justify-start mt-2">
                      <button
                        type="button"
                        onClick={() => { setIsResetPassword(true); setError(null); setMessage(null); }}
                        className="text-xs text-secondary hover:text-primary transition-colors hover:underline"
                      >
                        שכחת סיסמה?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 📧 OTP (One-Time Password) Token verification Input */}
              {useOTP && otpSent && (
                <div className="space-y-2 group animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-semibold text-secondary block transition-colors">קוד אימות מהמייל</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-secondary/70" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-4 pr-12 py-3.5 bg-cyan-50/20 border border-secondary/30 rounded-xl text-on-surface font-bold text-center text-lg focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-background"
                      placeholder="הזן 6 ספרות"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpToken(''); setError(null); setMessage(null); }}
                      className="text-xs text-secondary hover:underline"
                    >
                      שינוי כתובת מייל
                    </button>
                    <p className="text-[10px] text-on-surface-variant font-medium">הקוד נשלח וממתין בתיבת הדואר שלך.</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-8 py-4 px-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg ${useOTP ? 'bg-secondary hover:bg-secondary/90 shadow-secondary/20 text-white' : 'bg-primary hover:bg-primary/90 shadow-primary/20 text-white'}`}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isResetPassword ? (
                  'שליחת קישור לאיפוס'
                ) : useOTP ? (
                  otpSent ? 'אימות קוד והתחברות' : 'שלח קוד חד-פעמי במייל'
                ) : isLogin ? (
                  'התחברות'
                ) : (
                  'יצירת חשבון'
                )}
              </button>
            </form>

            <div className="mt-8 text-center flex flex-col items-center gap-3">
              {isResetPassword ? (
                <button
                  onClick={() => {
                    setIsResetPassword(false);
                    setIsLogin(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs font-semibold text-secondary hover:text-primary transition-colors focus:outline-none hover:underline underline-offset-4"
                >
                  חזרה להתחברות
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setUseOTP(false);
                    setOtpSent(false);
                    setOtpToken('');
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs font-semibold text-secondary hover:text-primary transition-colors focus:outline-none hover:underline underline-offset-4"
                >
                  {isLogin
                    ? 'עדיין אין לך חשבון? הירשם עכשיו'
                    : 'כבר יש לך חשבון? התחבר כאן'}
                </button>
              )}
            </div>

            {/* Divider */}
            {!isResetPassword && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs font-semibold uppercase">
                  <span className="bg-white px-3 text-slate-400">או התחברו באמצעות</span>
                </div>
              </div>
            )}

            {isLogin && !isResetPassword && (
              <p className="text-[10px] text-on-surface-variant/80 text-center mb-4 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                ⚠️ שימו לב: משתמשים שנרשמו באמצעות **Google** חייבים להתחבר באמצעות כפתור גוגל בלבד. התחברות מהירה במייל או סיסמה רגילה לא יפעלו עבור חשבונות אלו.
              </p>
            )}

            {/* OAuth Buttons */}
            {!isResetPassword && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200/60 font-bold transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>התחברו באמצעות Google</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
