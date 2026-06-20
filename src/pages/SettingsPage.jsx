import { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { User, Mail, CreditCard, ShieldAlert, Loader2, AlertCircle, ShieldCheck, Key, Copy, Check, Lock, Heart, Activity } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',  label: 'פרופיל',        icon: 'person'        },
  { id: 'health',   label: 'מידע רפואי',    icon: 'favorite'      },
  { id: 'security', label: 'אבטחה',         icon: 'shield'        },
  { id: 'billing',  label: 'מנוי',          icon: 'credit_card'   },
  { id: 'danger',   label: 'אזור מסוכן',    icon: 'warning'       },
];

const HEALTH_GOALS = [
  { value: 'fitness',       label: '🏃 שיפור כושר וסיבולת'         },
  { value: 'weight_loss',   label: '⚖️ ירידה במשקל'                },
  { value: 'heart',         label: '❤️ שמירה על לב וכלי דם'        },
  { value: 'muscle',        label: '💪 עלייה במסת שריר'             },
  { value: 'blood_markers', label: '🩸 איזון סוכר/כולסטרול'         },
  { value: 'general',       label: '✅ בריאות כללית'                },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'ישבני (ללא פעילות)' },
  { value: 'light',       label: 'פעילות קלה (1-2 ימים)' },
  { value: 'moderate',    label: 'פעיל (3-4 ימים)' },
  { value: 'active',      label: 'פעיל מאוד (5+ ימים)' },
  { value: 'athlete',     label: 'אתלט / ספורטאי' },
];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, color = 'secondary', children }) {
  return (
    <div className="bg-white rounded-3xl custom-shadow border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-50">
        <span className={`w-10 h-10 rounded-xl bg-${color}/10 text-${color} flex items-center justify-center shrink-0`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
        <h3 className="font-heading text-lg font-bold text-primary">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-on-surface-variant block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-on-surface font-medium text-sm focus:outline-none focus:border-secondary focus:bg-white transition-all ${props.className || ''}`}
    />
  );
}

// ── SaveButton ────────────────────────────────────────────────────────────────
function SaveButton({ loading, onClick, label = 'שמור שינויים' }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 bg-secondary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-secondary/90 transition-all active:scale-95 disabled:opacity-60 cursor-pointer border-0"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { profile, session, setProfile, isPremium } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const isFemale = profile?.gender === 'female';
  const [activeTab, setActiveTab] = useState('profile');

  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const targetPlan = searchParams.get('plan') || 'premium';
  const navigate = useNavigate();
  const location = useLocation();

  // If navigated here with a specific tab in state (e.g. from dashboard BMI card), activate it
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const isOAuth = session?.user?.app_metadata?.provider === 'google' ||
    session?.user?.identities?.some(id => id.provider === 'google');

  // ── Profile state ────────────────────────────────────────────────────────
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [gender, setGender]         = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // ── Health info state ─────────────────────────────────────────────────────
  const [height, setHeight]             = useState('');
  const [weight, setWeight]             = useState('');
  const [bdDay, setBdDay]       = useState('');
  const [bdMonth, setBdMonth]   = useState('');
  const [bdYear, setBdYear]     = useState('');
  const [healthGoal, setHealthGoal]     = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [isSavingHealth, setIsSavingHealth] = useState(false);

  // ── MFA state ────────────────────────────────────────────────────────────
  const [mfaStatus, setMfaStatus]   = useState('disabled');
  const [factors, setFactors]       = useState([]);
  const [qrCodeUri, setQrCodeUri]   = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [factorId, setFactorId]     = useState('');
  const [totpCode, setTotpCode]     = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // ── Password state ───────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [sessionAal, setSessionAal]           = useState('aal1');

  // ── Date refs for auto-jump ──────────────────────────────────────────────
  const dayRef   = useRef(null);
  const monthRef = useRef(null);
  const yearRef  = useRef(null);

  // ── Billing state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        setSessionAal(payload.aal || 'aal1');
      } catch (e) { console.error(e); }
    }
  }, [session]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setGender(profile.gender || '');
      setHeight(profile.height ? profile.height.toString() : '');
      setWeight(profile.weight ? profile.weight.toString() : '');
      // Split stored YYYY-MM-DD into parts
      if (profile.birthdate) {
        const parts = profile.birthdate.split('-');
        if (parts.length === 3) { setBdYear(parts[0]); setBdMonth(parts[1]); setBdDay(parts[2]); }
      } else { setBdDay(''); setBdMonth(''); setBdYear(''); }
      setHealthGoal(profile.health_goal || '');
      setActivityLevel(profile.activity_level || '');
    }
  }, [profile]);

  useEffect(() => {
    if (session?.user?.id) fetchMFAFactors();
  }, [session]);

  // ── MFA handlers ─────────────────────────────────────────────────────────
  const fetchMFAFactors = async () => {
    try {
      let activeFactors = [];
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.all) { activeFactors = data.all; }
      else if (session?.user?.factors) { activeFactors = session.user.factors; }
      setFactors(activeFactors);
      const isTotpEnabled = activeFactors.some(f =>
        (f.factorType === 'totp' || f.factor_type === 'totp') && f.status === 'verified'
      );
      setMfaStatus(isTotpEnabled ? 'enabled' : 'disabled');
    } catch (err) {
      console.error('Error fetching MFA factors:', err);
      if (session?.user?.factors) {
        const af = session.user.factors;
        setFactors(af);
        setMfaStatus(af.some(f => (f.factorType === 'totp' || f.factor_type === 'totp') && f.status === 'verified') ? 'enabled' : 'disabled');
      } else { setMfaStatus('disabled'); }
    }
  };

  const handleMFAEnroll = async () => {
    setMfaLoading(true); setError(null); setMessage(null);
    try {
      const { data: cf } = await supabase.auth.mfa.listFactors();
      if (cf?.all) {
        for (const f of cf.all.filter(f => f.status === 'unverified')) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const uniqueName = `${profile?.first_name || 'User'} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'OptiLife', friendlyName: uniqueName });
      if (error) throw error;
      setFactorId(data.id);
      setTotpSecret(data.totp.secret);
      setQrCodeUri(data.totp.qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.totp.uri)}`);
      setMfaStatus('enrolling');
    } catch (err) {
      setError('אירעה שגיאה ביצירת התחברות דו-שלבית: ' + (err.message || err));
    } finally { setMfaLoading(false); }
  };

  const handleMFAVerify = async () => {
    if (totpCode.length !== 6) return;
    setMfaLoading(true); setError(null); setMessage(null);
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: totpCode });
      if (ve) throw ve;
      addNotification({ type: 'success', title: 'אימות דו-שלבי הופעל! 🛡️', message: 'המפתח שלך מאובטח.', link: '/settings' });
      localStorage.removeItem('optilife_mfa_bypass');
      setMessage('האימות הדו-שלבי הופעל בהצלחה!');
      setMfaStatus('enabled'); setTotpCode('');
      const { data: { session: ns } } = await supabase.auth.getSession();
      if (ns?.access_token) { const p = JSON.parse(atob(ns.access_token.split('.')[1])); setSessionAal(p.aal || 'aal1'); }
      fetchMFAFactors();
    } catch (err) {
      setError(isFemale ? 'קוד אימות שגוי. אנא ודאי שהקוד תואם לאפליקציה.' : 'קוד אימות שגוי. אנא ודא שהקוד תואם לאפליקציה.');
    } finally { setMfaLoading(false); }
  };

  const handleStepUpVerify = async () => {
    if (totpCode.length !== 6) return;
    setMfaLoading(true); setError(null); setMessage(null);
    try {
      const vf = factors.find(f => f.status === 'verified');
      if (!vf) throw new Error('לא נמצא גורם אימות פעיל.');
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: vf.id });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId: vf.id, challengeId: challenge.id, code: totpCode });
      if (ve) throw ve;
      const { data: { session: ns } } = await supabase.auth.getSession();
      if (ns?.access_token) { const p = JSON.parse(atob(ns.access_token.split('.')[1])); setSessionAal(p.aal || 'aal1'); }
      localStorage.removeItem('optilife_mfa_bypass');
      addNotification({ type: 'success', title: 'זהותך אומתה! 🛡️', message: 'החיבור שודרג ל-AAL2.', link: '/settings' });
      setMessage('זהותך אומתה בהצלחה!'); setTotpCode(''); fetchMFAFactors();
    } catch (err) {
      setError(isFemale ? 'קוד אימות שגוי.' : 'קוד אימות שגוי.');
    } finally { setMfaLoading(false); }
  };

  const handleMFADisable = async (id) => {
    const msg = isFemale ? 'האם את בטוחה שברצונך לבטל את ההתחברות הדו-שלבית?' : 'האם אתה בטוח שברצונך לבטל את ההתחברות הדו-שלבית?';
    if (!window.confirm(msg)) return;
    setMfaLoading(true); setError(null); setMessage(null);
    try {
      const fid = id || factors.find(f => f.status === 'verified')?.id;
      if (!fid) throw new Error('לא נמצא גורם פעיל לביטול.');
      const { error } = await supabase.auth.mfa.unenroll({ factorId: fid });
      if (error) throw error;
      localStorage.removeItem('optilife_mfa_bypass');
      setSessionAal('aal1'); setMessage('ההתחברות הדו-שלבית בוטלה.'); setMfaStatus('disabled'); fetchMFAFactors();
    } catch (err) { setError('אירעה שגיאה בביטול האימות.'); } finally { setMfaLoading(false); }
  };

  const handleCopySecret = () => { navigator.clipboard.writeText(totpSecret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); };

  // ── Password handler ─────────────────────────────────────────────────────
  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return; }
    if (newPassword !== confirmPassword) { setError('הסיסמאות אינן תואמות.'); return; }
    setIsUpdatingPassword(true); setError(null); setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      addNotification({ type: 'success', title: 'הסיסמה עודכנה! 🔑', message: '', link: '/settings' });
      setMessage('הסיסמה עודכנה בהצלחה!'); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      if (err.message?.includes('AAL2')) { setError('נדרש אימות דו-שלבי (AAL2) כדי לשנות סיסמה.'); }
      else { setError('שגיאה בעדכון הסיסמה: ' + (err.message || err)); }
    } finally { setIsUpdatingPassword(false); }
  };

  // ── Profile handler ──────────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true); setError(null); setMessage(null);
    try {
      const birthdateVal = (bdDay && bdMonth && bdYear)
        ? `${String(bdYear).padStart(4,'0')}-${String(bdMonth).padStart(2,'0')}-${String(bdDay).padStart(2,'0')}`
        : null;
      const { error } = await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        gender: gender || null,
        birthdate: birthdateVal,
      }).eq('id', session.user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, first_name: firstName, last_name: lastName, gender: gender || null, birthdate: birthdateVal }));
      setMessage('הפרופיל עודכן בהצלחה!');
    } catch (err) { setError('אירעה שגיאה בעדכון הפרופיל.'); } finally { setIsUpdatingProfile(false); }
  };

  // ── Health info handler ──────────────────────────────────────────────────
  const handleSaveHealth = async () => {
    setIsSavingHealth(true); setError(null); setMessage(null);
    try {
      const birthdateVal = null; // birthdate is now saved via handleUpdateProfile in the Profile tab
      const updates = {
        health_goal: healthGoal || null,
        activity_level: activityLevel || null,
      };
      if (height) updates.height = Number(height);
      if (weight) updates.weight = Number(weight);

      const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...updates }));
      addNotification({ type: 'success', title: 'המידע הרפואי עודכן! 💪', message: 'הנתונים ישפיעו על ניתוחי ה-AI ותוכניות הבריאות שלך.', link: '/settings' });
      setMessage('המידע הרפואי עודכן בהצלחה!');
    } catch (err) { console.error('handleSaveHealth error:', err); setError('אירעה שגיאה בשמירת המידע הרפואי: ' + (err?.message || JSON.stringify(err))); } finally { setIsSavingHealth(false); }
  };

  // ── Billing helpers ───────────────────────────────────────────────────────
  const paymentProcessedRef = useRef(false);
  const pollIntervalRef     = useRef(null);

  useEffect(() => { return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); }; }, []);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (paymentStatus === 'success' && session?.user?.id && !paymentProcessedRef.current) {
        if (profile?.subscription_tier === targetPlan) return;
        paymentProcessedRef.current = true;
        const pendingCheckoutPlan = localStorage.getItem('optilife_pending_checkout');
        if (pendingCheckoutPlan !== targetPlan) {
          setError('לא נמצאה רכישה פעילה בתהליך עבור מסלול זה.');
          navigate('/settings', { replace: true }); return;
        }
        setLoading(true); setMessage('ממתינים לאישור התשלום... 💳');
        let attempts = 0; const maxAttempts = 6;
        pollIntervalRef.current = setInterval(async () => {
          attempts++;
          try {
            const { data, error } = await supabase.from('profiles').select('subscription_tier, gender').eq('id', session.user.id).single();
            if (error) throw error;
            if (data?.subscription_tier === targetPlan) {
              clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; setLoading(false);
              localStorage.removeItem('optilife_pending_checkout');
              setProfile(prev => ({ ...prev, subscription_tier: targetPlan }));
              const isAi = targetPlan === 'ai_ultimate'; const isStd = targetPlan === 'standard';
              let planName = 'מקצועי 👑';
              if (isAi) planName = 'אולטימטיבי ⚡';
              else if (isStd) planName = 'מתקדם 🌟';
              addNotification({ type: 'welcome', title: `שודרגת למסלול ${planName}`, message: 'תודה על שדרוג המנוי!', link: isAi ? '/ai-coach' : '/plan' });
              setMessage(`תשלום התקבל! החשבון שלך שודרג למסלול ${planName}.`);
              navigate('/settings', { replace: true });
            } else if (attempts >= maxAttempts) {
              clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; setLoading(false);
              setMessage(null); localStorage.removeItem('optilife_pending_checkout');
              setError('לא הצלחנו לאמת את קבלת התשלום. אם חויבת, אנא פנה לתמיכה.');
              navigate('/settings', { replace: true });
            }
          } catch (err) {
            if (attempts >= maxAttempts) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; setLoading(false); setMessage(null); setError('שגיאה בבדיקת סטטוס התשלום.'); navigate('/settings', { replace: true }); }
          }
        }, 2000);
      }
    };
    handlePaymentSuccess();
  }, [paymentStatus, targetPlan, session, navigate, setProfile]);

  const tier = profile?.subscription_tier || 'free';
  const isPremiumActive    = tier === 'standard' || tier === 'premium' || tier === 'ai_ultimate';
  const isPremiumCancelled = tier.startsWith('standard_cancelled:') || tier.startsWith('premium_cancelled:') || tier.startsWith('ai_ultimate_cancelled:');
  const isAiUltimate       = tier === 'ai_ultimate' || tier.startsWith('ai_ultimate_cancelled:');
  const isStandard         = tier === 'standard' || tier.startsWith('standard_cancelled:');

  const trialEndStr = profile?.trial_end;
  const isTrialActive = trialEndStr && new Date(trialEndStr) > new Date();
  const trialDateFormatted = isTrialActive ? (() => { const d = new Date(trialEndStr); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })() : '';
  let cancelledDateFormatted = '';
  if (isPremiumCancelled) { const ds = tier.split(':')[1]; if (ds) { const [y,m,d] = ds.split('-'); cancelledDateFormatted = `${d}/${m}/${y}`; } }

  const getTierDisplayName = () => {
    if (tier === 'ai_ultimate') return 'AI Ultimate ⚡';
    if (tier.startsWith('ai_ultimate_cancelled:')) return 'AI Ultimate (מבוטל)';
    if (tier === 'premium') return 'מקצועי 👑';
    if (tier.startsWith('premium_cancelled:')) return 'מקצועי (מבוטל)';
    if (tier === 'standard') return 'מתקדם 🌟';
    if (tier.startsWith('standard_cancelled:')) return 'מתקדם (מבוטל)';
    return 'חינמי';
  };
  const getTierColor = () => {
    if (tier.includes('ai_ultimate')) return 'from-purple-600 to-indigo-600';
    if (tier.includes('premium')) return 'from-secondary to-teal-600';
    if (tier.includes('standard')) return 'from-blue-500 to-cyan-500';
    return 'from-slate-400 to-slate-500';
  };

  const handleCancelSubscription = async () => {
    const msg = isFemale ? 'האם את בטוחה שברצונך לבטל את המנוי?' : 'האם אתה בטוח שברצונך לבטל את המנוי?';
    if (!window.confirm(msg)) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/cancel-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` } });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to cancel');
      setProfile(prev => ({ ...prev, subscription_tier: resData.cancelledTier }));
      const [year, month, day] = resData.endDate.split('-');
      setMessage(isFemale ? `המנוי בוטל. יישאר פעיל עד ${day}/${month}/${year}.` : `המנוי בוטל. יישאר פעיל עד ${day}/${month}/${year}.`);
      addNotification({ type: 'info', title: 'המנוי בוטל 😔', message: `יישאר פעיל עד ${day}/${month}/${year}.`, link: '/settings' });
    } catch (err) { setError('שגיאה בביטול המנוי: ' + (err.message || err)); } finally { setLoading(false); }
  };

  const handleReactivate = () => {
    const link = import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_LINK;
    if (link) { window.location.href = `${link}?prefilled_email=${encodeURIComponent(session?.user?.email)}`; }
  };

  // ── Profile initials avatar ───────────────────────────────────────────────
  const initials = `${(profile?.first_name || '?')[0]}${(profile?.last_name || '?')[0]}`.toUpperCase();

  // ── Computed BMI for display ──────────────────────────────────────────────
  const computedBmi = (() => {
    if (!height || !weight) return null;
    const h = Number(height) / 100;
    return (Number(weight) / (h * h)).toFixed(1);
  })();

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background transition-all" dir="rtl">
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">

        {/* ── Profile Header Card ── */}
        <div className="bg-white rounded-3xl custom-shadow border border-slate-100 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l ${getTierColor()}`} />
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getTierColor()} flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md`}>
            {initials}
          </div>
          <div className="flex-1 text-center sm:text-right">
            <h1 className="font-heading text-2xl font-black text-primary">
              {profile?.first_name || ''} {profile?.last_name || ''}
              {!profile?.first_name && <span className="text-on-surface-variant text-base font-normal">משתמש אנונימי</span>}
            </h1>
            <p className="text-on-surface-variant text-sm font-semibold mt-0.5">{session?.user?.email}</p>
            <span className={`inline-flex mt-2 items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-l ${getTierColor()} text-white`}>
              <span className="material-symbols-outlined text-xs" style={{ fontSize: 13 }}>workspace_premium</span>
              {getTierDisplayName()} {isTrialActive && '· ניסיון'}
            </span>
          </div>
          {!isPremium && (
            <button onClick={() => navigate('/pricing')} className="flex items-center gap-1.5 bg-accent-action text-primary font-bold text-xs px-4 py-2 rounded-xl shadow hover:shadow-md transition-all hover:scale-105 active:scale-95 border-0 cursor-pointer shrink-0">
              <span className="material-symbols-outlined text-sm">bolt</span>
              {isFemale ? 'שדרגי מנוי' : 'שדרג מנוי'}
            </button>
          )}
        </div>

        {/* ── Global alerts ── */}
        {message && (
          <div className="mb-4 p-4 bg-status-success/10 border border-status-success/20 rounded-2xl text-status-success text-sm flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="font-bold">{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-status-error/10 border border-status-error/20 rounded-2xl flex items-center gap-3 text-status-error text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Tab Nav ── */}
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-2xl mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMessage(null); setError(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer border-0 shrink-0
                ${activeTab === tab.id ? 'bg-white shadow text-primary' : 'bg-transparent text-on-surface-variant hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: פרופיל */}
        {activeTab === 'profile' && (
          <Section icon="person" title="פרטים אישיים">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="שם פרטי">
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={isFemale ? 'הזיני שם פרטי' : 'הזן שם פרטי'} />
                </Field>
                <Field label="שם משפחה">
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={isFemale ? 'הזיני שם משפחה' : 'הזן שם משפחה'} />
                </Field>
              </div>

              {/* Gender + Birthdate side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <Field label="מגדר" hint="* משמש לחישוב טווחי מעבדה פיזיולוגיים.">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGender('male')}
                      className={`py-2.5 px-5 rounded-xl font-bold text-sm border flex-1 cursor-pointer transition-all ${gender === 'male' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                      זכר ♂
                    </button>
                    <button type="button" onClick={() => setGender('female')}
                      className={`py-2.5 px-5 rounded-xl font-bold text-sm border flex-1 cursor-pointer transition-all ${gender === 'female' ? 'bg-pink-50 border-pink-400 text-pink-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                      נקבה ♀
                    </button>
                  </div>
                </Field>

                <Field label="תאריך לידה">
                  <div className="flex gap-3 items-center w-full" dir="ltr">
                    <input
                      ref={dayRef}
                      type="number" min="1" max="31"
                      value={bdDay}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setBdDay(val);
                        if (val.length === 2) monthRef.current?.focus();
                      }}
                      placeholder="DD"
                      className="flex-1 min-w-0 px-3 py-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-sm focus:outline-none focus:border-secondary focus:bg-white transition-all"
                    />
                    <span className="text-slate-300 font-bold shrink-0">/</span>
                    <input
                      ref={monthRef}
                      type="number" min="1" max="12"
                      value={bdMonth}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setBdMonth(val);
                        if (val.length === 2) yearRef.current?.focus();
                      }}
                      placeholder="MM"
                      className="flex-1 min-w-0 px-3 py-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-sm focus:outline-none focus:border-secondary focus:bg-white transition-all"
                    />
                    <span className="text-slate-300 font-bold shrink-0">/</span>
                    <input
                      ref={yearRef}
                      type="number" min="1900" max={new Date().getFullYear()}
                      value={bdYear}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setBdYear(val);
                      }}
                      placeholder="YYYY"
                      className="flex-[2] min-w-0 px-3 py-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-sm focus:outline-none focus:border-secondary focus:bg-white transition-all"
                    />
                  </div>
                </Field>
              </div>

              <Field label="כתובת אימייל">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-on-surface-variant text-sm">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  {session?.user?.email}
                </div>
              </Field>

              <SaveButton loading={isUpdatingProfile} onClick={handleUpdateProfile} label={isFemale ? 'שמרי שינויים' : 'שמור שינויים'} />
            </div>
          </Section>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: מידע רפואי */}
        {activeTab === 'health' && (
          <div className="space-y-5">
            {/* Body metrics */}
            <Section icon="monitor_weight" title="מדדי גוף">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="גובה (סנטימטרים)">
                    <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="לדוגמה: 175" min="100" max="220" />
                  </Field>
                  <Field label="משקל (קילוגרמים)">
                    <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="לדוגמה: 72" min="30" max="250" />
                  </Field>
                </div>

                {/* Live BMI preview */}
                {computedBmi && (
                  <div className="bg-gradient-to-l from-secondary/5 to-primary/5 border border-secondary/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center font-black text-xl shrink-0">
                      {computedBmi}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">BMI מחושב</p>
                      <p className="font-bold text-primary text-sm mt-0.5">
                        {Number(computedBmi) < 18.5 ? '⚠️ תת-משקל' : Number(computedBmi) < 25 ? '✅ תקין' : Number(computedBmi) < 30 ? '⚠️ משקל עודף' : '🔴 השמנת יתר'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Personal medical info — birthdate moved to Profile tab */}
            <Section icon="favorite" title="מטרות ופעילות">
              <div className="space-y-5">
                <Field label="מטרת בריאות עיקרית">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HEALTH_GOALS.map(g => (
                      <button key={g.value} type="button" onClick={() => setHealthGoal(g.value)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs text-right border cursor-pointer transition-all
                          ${healthGoal === g.value ? 'bg-secondary/10 border-secondary text-secondary' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="רמת פעילות גופנית שבועית">
                  <div className="space-y-2">
                    {ACTIVITY_LEVELS.map(a => (
                      <button key={a.value} type="button" onClick={() => setActivityLevel(a.value)}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs text-right border cursor-pointer transition-all flex items-center justify-between
                          ${activityLevel === a.value ? 'bg-secondary/10 border-secondary text-secondary' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <span>{a.label}</span>
                        {activityLevel === a.value && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </Section>

            <SaveButton loading={isSavingHealth} onClick={handleSaveHealth} label={isFemale ? 'שמרי מידע רפואי' : 'שמור מידע רפואי'} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: אבטחה */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            {/* MFA */}
            <Section icon="shield" title="אימות דו-שלבי (MFA)">
              {isOAuth ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-primary">אבטחת חשבון Google פעילה 🛡️</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">התחברת דרך Google. האימות מנוהל על ידי Google ואין צורך ב-MFA נוסף.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    הוספת שכבת אבטחה נוספת — בכל התחברות תידרש להזין קוד חד-פעמי מאפליקציית Authenticator.
                  </p>

                  {mfaStatus === 'disabled' && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-primary text-sm mb-1">התחברות דו-שלבית אינה פעילה</h4>
                        <p className="text-xs text-on-surface-variant">מומלץ להפעיל להגנה על המידע הרפואי שלך.</p>
                      </div>
                      <button onClick={handleMFAEnroll} disabled={mfaLoading}
                        className="flex items-center gap-2 bg-secondary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors cursor-pointer border-0">
                        {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        הפעל אימות דו-שלבי
                      </button>
                    </div>
                  )}

                  {mfaStatus === 'enrolling' && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-6">
                      <h4 className="font-bold text-primary text-sm">הגדרת אפליקציית Authenticator</h4>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-4 flex justify-center">
                          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            {qrCodeUri.startsWith('data:image/svg+xml;base64,') || !qrCodeUri.startsWith('<svg') ? (
                              <img src={qrCodeUri} alt="QR Code" className="w-44 h-44 object-contain" />
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: qrCodeUri }} className="w-44 h-44 flex items-center justify-center" />
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-8 space-y-4">
                          <p className="text-xs font-bold text-primary leading-relaxed">
                            {isFemale ? '1. סרקי את קוד ה-QR באפליקציית אימות (Google/Microsoft Authenticator).' : '1. סרוק את קוד ה-QR באפליקציית אימות (Google/Microsoft Authenticator).'}
                          </p>
                          <p className="text-xs font-bold text-primary leading-relaxed">
                            {isFemale ? '2. אם אינך יכולה לסרוק, הזיני את הקוד הסודי:' : '2. אם אינך יכול לסרוק, הזן את הקוד הסודי:'}
                          </p>
                          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl max-w-sm justify-between">
                            <span className="font-mono text-sm tracking-wider font-extrabold text-slate-700 select-all">{totpSecret}</span>
                            <button onClick={handleCopySecret} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors">
                              {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-5 space-y-3 max-w-sm">
                        <label className="text-xs font-bold text-primary block">3. {isFemale ? 'הזיני' : 'הזן'} קוד 6 ספרות מהאפליקציה:</label>
                        <div className="flex gap-3">
                          <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-center font-mono font-bold text-lg tracking-wider focus:outline-none focus:border-secondary transition-colors" placeholder="••••••" />
                          <button onClick={handleMFAVerify} disabled={mfaLoading || totpCode.length !== 6}
                            className="px-5 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-1 border-0 cursor-pointer">
                            {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFemale ? 'אמתי' : 'אמת')}
                          </button>
                        </div>
                        <button onClick={() => setMfaStatus('disabled')} className="text-xs text-slate-400 font-bold hover:underline cursor-pointer bg-transparent border-0">ביטול הגדרה</button>
                      </div>
                    </div>
                  )}

                  {mfaStatus === 'enabled' && sessionAal === 'aal2' && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900 text-sm">אימות דו-שלבי פעיל ✅</h4>
                          <p className="text-xs text-emerald-700 mt-0.5">{isFemale ? 'בכל כניסה תידרשי להזין קוד מהאפליקציה.' : 'בכל כניסה תידרש להזין קוד מהאפליקציה.'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-3 pt-2 border-t border-emerald-100">
                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> TOTP (Google Authenticator)</div>
                        <button onClick={() => handleMFADisable()} disabled={mfaLoading}
                          className="px-4 py-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer bg-transparent">
                          {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} בטל אימות דו-שלבי
                        </button>
                      </div>
                    </div>
                  )}

                  {mfaStatus === 'enabled' && sessionAal === 'aal1' && (
                    <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">נדרש אימות זהות (AAL2)</h4>
                          <p className="text-xs text-amber-700 leading-relaxed mt-1">לפעולות רגישות (שינוי סיסמה / ביטול MFA), יש לאמת זהות עם קוד מהאפליקציה.</p>
                        </div>
                      </div>
                      <div className="border-t border-amber-200/50 pt-4 max-w-sm space-y-3">
                        <label className="text-xs font-bold text-amber-900 block">{isFemale ? 'הזיני קוד 6 ספרות:' : 'הזן קוד 6 ספרות:'}</label>
                        <div className="flex gap-3">
                          <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-center font-mono font-bold text-lg tracking-wider focus:outline-none focus:border-amber-500 transition-colors" placeholder="••••••" />
                          <button onClick={handleStepUpVerify} disabled={mfaLoading || totpCode.length !== 6}
                            className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1 border-0 cursor-pointer">
                            {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFemale ? 'אמתי' : 'אמת')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Password */}
            <Section icon="lock" title="שינוי סיסמה">
              {isOAuth ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-700 text-sm">התחברת דרך חשבון חיצוני</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">שינוי סיסמה אינו זמין עבור התחברות דרך Google.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {mfaStatus === 'enabled' && sessionAal === 'aal1' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p><span className="font-bold">נדרש AAL2.</span> אמת את זהותך בסקציית האבטחה למעלה לפני שינוי סיסמה.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="סיסמה חדשה">
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={isFemale ? 'הזיני סיסמה חדשה' : 'הזן סיסמה חדשה'} disabled={mfaStatus === 'enabled' && sessionAal === 'aal1'} dir="ltr" />
                    </Field>
                    <Field label="אימות סיסמה חדשה">
                      <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={isFemale ? 'הזיני שוב' : 'הזן שוב'} disabled={mfaStatus === 'enabled' && sessionAal === 'aal1'} dir="ltr" />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || !confirmPassword || (mfaStatus === 'enabled' && sessionAal === 'aal1')}
                      className="flex items-center gap-2 bg-secondary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-0">
                      {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      עדכון סיסמה
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: מנוי */}
        {activeTab === 'billing' && (
          <div className="space-y-5">
            {/* Current plan card */}
            <div className={`rounded-3xl custom-shadow p-6 relative overflow-hidden text-white bg-gradient-to-br ${getTierColor()}`}>
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">המסלול שלך</p>
                <h2 className="font-heading text-3xl font-black mb-1">{getTierDisplayName()}</h2>
                <p className="text-white/80 text-sm">{isPremium ? (isAiUltimate ? 'גישה מלאה לליווי AI ולכל תכונות המערכת' : 'גישה מלאה לכל יכולות המערכת') : 'גישה בסיסית בלבד'}</p>

                {isPremiumActive && (
                  <div className="mt-5 bg-white/10 rounded-2xl p-4">
                    {isTrialActive ? (
                      <>
                        <p className="text-white text-sm font-bold mb-1">תקופת ניסיון פעילה 🎁</p>
                        <p className="text-white/80 text-xs">החיוב הראשון ב-{trialDateFormatted} ({isAiUltimate ? '₪49' : isStandard ? '₪19' : '₪29'}/חודש)</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white text-sm font-medium mb-1">התשלום הבא</p>
                        <p className="text-white/80 text-xs">יחויב בעוד חודש ({isAiUltimate ? '₪49' : isStandard ? '₪19' : '₪29'}/חודש)</p>
                      </>
                    )}
                  </div>
                )}

                {isPremiumCancelled && (
                  <div className="mt-5 bg-white/10 rounded-2xl p-4">
                    <p className="text-white text-sm font-bold mb-1">המנוי בוטל</p>
                    <p className="text-white/80 text-xs leading-relaxed">יישאר פעיל עד <span className="font-extrabold">{cancelledDateFormatted}</span>. לאחר מכן ישונמך לחינם.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {isPremiumActive && (
              <button onClick={handleCancelSubscription} disabled={loading}
                className="w-full py-3 bg-white border border-slate-200 text-on-surface-variant font-bold rounded-2xl hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 cursor-pointer text-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ביטול מנוי'}
              </button>
            )}
            {isPremiumCancelled && (
              <button onClick={handleReactivate} disabled={loading}
                className="w-full py-3 bg-accent-action text-primary font-bold rounded-2xl hover:shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer text-sm border-0">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '🔄 הפעל מנוי מחדש'}
              </button>
            )}
            {!isPremium && (
              <button onClick={() => navigate('/pricing')}
                className="w-full py-3.5 bg-accent-action text-primary font-bold rounded-2xl hover:shadow-lg transition-all cursor-pointer text-sm border-0 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">bolt</span>
                {isFemale ? 'שדרגי לפרימיום' : 'שדרג לפרימיום'}
              </button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: אזור מסוכן */}
        {activeTab === 'danger' && (
          <Section icon="warning" title="אזור מסוכן" color="status-error">
            <div className="space-y-4">
              <div className="bg-status-error/5 border border-status-error/15 rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-status-error text-sm">מחיקת חשבון — פעולה בלתי הפיכה</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-1">כל הנתונים, בדיקות המעבדה, ניתוחי ה-AI והתוכניות שלך יימחקו לצמיתות.</p>
                </div>
              </div>
              <button disabled className="px-6 py-3 bg-status-error/10 text-status-error font-bold rounded-xl opacity-50 cursor-not-allowed text-sm">
                מחק חשבון (לא זמין כרגע)
              </button>
            </div>
          </Section>
        )}

      </div>
    </main>
  );
}
