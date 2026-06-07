import { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { User, Mail, CreditCard, ShieldAlert, Loader2, AlertCircle, ShieldCheck, Key, Copy, Check, Lock } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { profile, session, setProfile, isPremium } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const isFemale = profile?.gender === 'female';
  const isCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'admin';
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isOAuth = session?.user?.app_metadata?.provider === 'google' || 
                  session?.user?.identities?.some(id => id.provider === 'google');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // --- MFA (2FA) State & Handlers ---
  const [mfaStatus, setMfaStatus] = useState('disabled'); // 'disabled' | 'enrolling' | 'enabled'
  const [factors, setFactors] = useState([]);
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // --- Change Password State ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [sessionAal, setSessionAal] = useState('aal1');

  useEffect(() => {
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        setSessionAal(payload.aal || 'aal1');
      } catch (e) {
        console.error("Error decoding session token:", e);
      }
    }
  }, [session]);

  const fetchMFAFactors = async () => {
    try {
      let activeFactors = [];
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.all) {
        activeFactors = data.all;
      } else {
        // Fallback to session cache ONLY if listFactors request failed/errored out
        if (session?.user?.factors) {
          activeFactors = session.user.factors;
        }
      }
      
      setFactors(activeFactors);
      
      const isTotpEnabled = activeFactors.some(f => 
        (f.factorType === 'totp' || f.factor_type === 'totp') && 
        f.status === 'verified'
      );
      if (isTotpEnabled) {
        setMfaStatus('enabled');
      } else {
        setMfaStatus('disabled');
      }
    } catch (err) {
      console.error('Error fetching MFA factors:', err);
      // Clean fallback
      if (session?.user?.factors) {
        const activeFactors = session.user.factors;
        setFactors(activeFactors);
        const isTotpEnabled = activeFactors.some(f => 
          (f.factorType === 'totp' || f.factor_type === 'totp') && 
          f.status === 'verified'
        );
        if (isTotpEnabled) {
          setMfaStatus('enabled');
          return;
        }
      }
      setMfaStatus('disabled');
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchMFAFactors();
    }
  }, [session]);

  const handleMFAEnroll = async () => {
    setMfaLoading(true);
    setError(null);
    setMessage(null);
    try {
      // 1. Clean up any existing unverified factors to prevent registration collisions
      const { data: currentFactors, error: listError } = await supabase.auth.mfa.listFactors();
      if (!listError && currentFactors?.all) {
        const unverified = currentFactors.all.filter(f => f.status === 'unverified');
        for (const f of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      // 2. Generate a unique friendly name incorporating a random unique token
      const uniqueFriendlyName = `${profile?.first_name || 'דביר'} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'OptiLife',
        friendlyName: uniqueFriendlyName
      });
      
      if (error) throw error;
      
      setFactorId(data.id);
      setTotpSecret(data.totp.secret);
      
      // Supabase returns raw svg base64 in data.totp.qr_code, fallback to qrserver.com if needed
      setQrCodeUri(data.totp.qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.totp.uri)}`);
      setMfaStatus('enrolling');
    } catch (err) {
      console.error('MFA Enroll Error:', err);
      setError('אירעה שגיאה ביצירת התחברות דו-שלבית: ' + (err.message || err.error_description || err));
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMFAVerify = async () => {
    if (totpCode.length !== 6) return;
    setMfaLoading(true);
    setError(null);
    setMessage(null);
    try {
      // 1. Create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      
      // 2. Verify it
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode
      });
      if (verifyError) throw verifyError;
      
      addNotification({
        type: 'success',
        title: 'אימות דו-שלבי הופעל! 🛡️',
        message: 'התחברות דו-שלבית (MFA) מאבטחת כעת את החשבון שלך באמצעות אפליקציית Authenticator.',
        link: '/settings'
      });

      localStorage.removeItem('optilife_mfa_bypass');
      setMessage('האימות הדו-שלבי (MFA) הופעל בהצלחה ומאבטח כעת את חשבונך!');
      setMfaStatus('enabled');
      setTotpCode('');
      
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.access_token) {
        const payload = JSON.parse(atob(newSession.access_token.split('.')[1]));
        setSessionAal(payload.aal || 'aal1');
      }
      
      fetchMFAFactors();
    } catch (err) {
      console.error('MFA Verify Error:', err);
      setError(isFemale ? 'קוד אימות שגוי. אנא ודאי שהקוד תואם לאפליקציית Authenticator שלך.' : 'קוד אימות שגוי. אנא ודא שהקוד תואם לאפליקציית Authenticator שלך.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleStepUpVerify = async () => {
    if (totpCode.length !== 6) return;
    setMfaLoading(true);
    setError(null);
    setMessage(null);
    try {
      const verifiedFactor = factors.find(f => f.status === 'verified');
      if (!verifiedFactor) throw new Error("לא נמצא גורם אימות פעיל.");
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
      if (challengeError) throw challengeError;
      
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.id,
        code: totpCode
      });
      if (verifyError) throw verifyError;
      
      // Update session state
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.access_token) {
        const payload = JSON.parse(atob(newSession.access_token.split('.')[1]));
        setSessionAal(payload.aal || 'aal1');
      }
      
      // Clear bypass since they successfully verified
      localStorage.removeItem('optilife_mfa_bypass');
      
      addNotification({
        type: 'success',
        title: 'זהותך אומתה! 🛡️',
        message: 'החיבור הנוכחי שודרג לרמת אבטחה AAL2. כעת באפשרותך לשנות סיסמה או לבטל את האימות הדו-שלבי.',
        link: '/settings'
      });

      setMessage('זהותך אומתה בהצלחה! החיבור שודרג לרמת אבטחה AAL2.');
      setTotpCode('');
      fetchMFAFactors();
    } catch (err) {
      console.error('Step up verification error:', err);
      setError(isFemale ? 'קוד אימות שגוי. אנא ודאי שהקוד תואם לאפליקציית Authenticator שלך.' : 'קוד אימות שגוי. אנא ודא שהקוד תואם לאפליקציית Authenticator שלך.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMFADisable = async (id) => {
    const confirmMsg = isFemale 
      ? 'האם את בטוחה שברצונך לבטל את ההתחברות הדו-שלבית? אבטחת החשבון שלך תפחת.' 
      : 'האם אתה בטוח שברצונך לבטל את ההתחברות הדו-שלבית? אבטחת החשבון שלך תפחת.';
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setMfaLoading(true);
    setError(null);
    setMessage(null);
    try {
      const factorToDisable = id || factors.find(f => f.status === 'verified')?.id;
      if (!factorToDisable) throw new Error("לא נמצא גורם אימות פעיל לביטול.");
      
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factorToDisable });
      if (error) throw error;
      
      localStorage.removeItem('optilife_mfa_bypass');
      setSessionAal('aal1');
      setMessage('ההתחברות הדו-שלבית בוטלה בהצלחה.');
      setMfaStatus('disabled');
      fetchMFAFactors();
    } catch (err) {
      console.error('MFA Unenroll Error:', err);
      setError('אירעה שגיאה בביטול האימות הדו-שלבי.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setError('הסיסמה החדשה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות. אנא ודא שהקלדת את אותה הסיסמה בשני השדות.');
      return;
    }

    setIsUpdatingPassword(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'הסיסמה עודכנה בהצלחה! 🔑',
        message: 'הסיסמה לחשבונך עודכנה בהצלחה במערכת.',
        link: '/settings'
      });

      setMessage('הסיסמה שלך עודכנה בהצלחה!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      if (err.message?.includes('AAL2')) {
        setError('נדרש אימות דו-שלבי פעיל (AAL2) כדי לעדכן את הסיסמה. אנא יש להתחבר מחדש עם קוד האימות שלך.');
      } else {
        setError('אירעה שגיאה בעדכון הסיסמה: ' + (err.message || err.error_description || err));
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setGender(profile.gender || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName, 
          last_name: lastName,
          gender: gender || null
        })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
        gender: gender || null
      }));
      
      setMessage('הפרופיל עודכן בהצלחה!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('אירעה שגיאה בעדכון הפרופיל.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  
  const paymentProcessedRef = useRef(false);

  // Handle Stripe successful redirect
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const paymentStatus = searchParams.get('payment');
      
      if (paymentStatus === 'success' && !isPremium && session?.user?.id && !paymentProcessedRef.current) {
        paymentProcessedRef.current = true;
        setLoading(true);
        try {
          // Store purchase date in Auth user metadata
          await supabase.auth.updateUser({
            data: {
              premium_since: new Date().toISOString()
            }
          });

          // Update DB
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: 'premium' })
            .eq('id', session.user.id);
            
          if (error) throw error;
          
          setProfile(prev => ({
            ...prev,
            subscription_tier: 'premium'
          }));
          
          addNotification({
            type: 'welcome',
            title: 'שודרגת ל-Premium! 👑',
            message: isFemale 
              ? 'תודה רבה על שדרוג המנוי! כעת כל תכונות ה-AI המקצועיות פתוחות עבורך. לחצי כאן לבניית תוכנית הבריאות האישית שלך.'
              : 'תודה רבה על שדרוג המנוי! כעת כל תכונות ה-AI המקצועיות פתוחות עבורך. לחץ כאן לבניית תוכנית הבריאות האישית שלך.',
            link: '/plan'
          });

          setMessage('תשלום התקבל בהצלחה! החשבון שלך שודרג למסלול פרימיום.');
          
          // Clear query params
          navigate('/settings', { replace: true });
        } catch (err) {
          console.error('Error updating after payment:', err);
          setError('התשלום התקבל אך אירעה שגיאה בעדכון החשבון. אנא פנה לתמיכה.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    handlePaymentSuccess();
  }, [searchParams, isPremium, session, navigate, setProfile]);

  const getSubscriptionEndDate = () => {
    const premiumSinceStr = session?.user?.user_metadata?.premium_since;
    const purchaseDate = premiumSinceStr ? new Date(premiumSinceStr) : new Date();
    const today = new Date();
    
    // Calculate the next monthly anniversary date
    let nextAnniversary = new Date(purchaseDate);
    nextAnniversary.setMonth(nextAnniversary.getMonth() + 1);
    
    // If next anniversary has passed, keep incrementing month by month until it is in the future
    while (nextAnniversary < today) {
      nextAnniversary.setMonth(nextAnniversary.getMonth() + 1);
    }
    
    const yyyy = nextAnniversary.getFullYear();
    const mm = String(nextAnniversary.getMonth() + 1).padStart(2, '0');
    const dd = String(nextAnniversary.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleCancelSubscription = async () => {
    const confirmMsg = isFemale 
      ? 'האם את בטוחה שברצונך לבטל את מנוי הפרימיום? המנוי יישאר פעיל עד סוף מחזור החיוב הנוכחי שלך.' 
      : 'האם אתה בטוח שברצונך לבטל את מנוי הפרימיום? המנוי יישאר פעיל עד סוף מחזור החיוב הנוכחי שלך.';
    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const endDateStr = getSubscriptionEndDate();
      const newTier = `premium_cancelled:${endDateStr}`;

      const { error } = await supabase
         .from('profiles')
         .update({ subscription_tier: newTier })
         .eq('id', session?.user?.id);
         
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        subscription_tier: newTier
      }));
      
      const [year, month, day] = endDateStr.split('-');
      setMessage(isFemale 
        ? `המנוי בוטל בהצלחה. הוא יישאר פעיל ותוכלי להמשיך להשתמש בפרימיום עד לתאריך ${day}/${month}/${year}.`
        : `המנוי בוטל בהצלחה. הוא יישאר פעיל ותוכל להמשיך להשתמש בפרימיום עד לתאריך ${day}/${month}/${year}.`);
      
      addNotification({
        type: 'info',
        title: 'המנוי בוטל בהצלחה 😔',
        message: `המנוי שלך יישאר פעיל עד סוף מחזור החיוב בתאריך ${day}/${month}/${year}. לאחר מכן הוא ישונמך למסלול חינמי.`,
        link: '/settings'
      });
    } catch (err) {
      console.error('Error canceling:', err);
      setError('אירעה שגיאה בביטול המנוי.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'premium' })
        .eq('id', session?.user?.id);
        
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        subscription_tier: 'premium'
      }));
      
      setMessage('המנוי הופעל מחדש בהצלחה! שמחים שחזרת אלינו 👑');
      
      addNotification({
        type: 'welcome',
        title: isFemale ? 'ברוכה השבה לפרימיום! 👑' : 'ברוך השב לפרימיום! 👑',
        message: 'המנוי שלך הופעל מחדש בהצלחה. כל תכונות ה-AI פתוחות כעת ללא הגבלה.',
        link: '/plan'
      });
    } catch (err) {
      console.error('Error reactivating:', err);
      setError('אירעה שגיאה בהפעלת המנוי מחדש.');
    } finally {
      setLoading(false);
    }
  };

  const isPremiumActive = profile?.subscription_tier === 'premium';
  const isPremiumCancelled = profile?.subscription_tier?.startsWith('premium_cancelled:');
  
  let cancelledDateFormatted = '';
  if (isPremiumCancelled) {
    const dateStr = profile.subscription_tier.split(':')[1];
    if (dateStr) {
      const [year, month, day] = dateStr.split('-');
      cancelledDateFormatted = `${day}/${month}/${year}`;
    }
  }

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all">
      <div className="p-xl max-w-4xl mx-auto space-y-8">
        <div className="mb-8">
          <h2 className="font-heading text-4xl text-primary font-bold mb-2">הגדרות חשבון</h2>
          <p className="text-on-surface-variant font-body text-lg">ניהול הפרופיל שלך, מנויים ואבטחה.</p>
        </div>

        {message && (
          <div className="p-4 bg-status-success/10 border border-status-success/20 rounded-xl text-status-success text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined w-5 h-5 shrink-0">check_circle</span>
            <p className="mt-0.5 font-bold">{message}</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        <div className={`grid grid-cols-1 ${isCoachOrAdmin ? 'max-w-2xl mx-auto w-full' : 'md:grid-cols-3'} gap-8`}>
          {/* Profile Settings */}
          <div className={`${isCoachOrAdmin ? 'col-span-1' : 'md:col-span-2'} space-y-6 w-full`}>
            <div className="bg-white p-8 rounded-2xl border border-outline/10 custom-shadow">
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-secondary" />
                פרטים אישיים
              </h3>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full">
                    <label className="text-sm font-semibold text-on-surface-variant mb-2 block">שם פרטי</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.first_name || ''} 
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={isFemale ? "הזיני שם פרטי" : "הזן שם פרטי"}
                      className="w-full px-4 py-3 bg-surface rounded-xl border border-outline/10 text-on-surface font-medium focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                  <div className="w-full">
                    <label className="text-sm font-semibold text-on-surface-variant mb-2 block">שם משפחה</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.last_name || ''} 
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={isFemale ? "הזיני שם משפחה" : "הזן שם משפחה"}
                      className="w-full px-4 py-3 bg-surface rounded-xl border border-outline/10 text-on-surface font-medium focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </div>

                {!isCoachOrAdmin && (
                  <div className="w-full">
                    <label className="text-sm font-semibold text-on-surface-variant mb-2 block">מגדר (הגדרה קבועה לצרכים רפואיים/פיזיולוגיים)</label>
                    <div className="flex gap-4 max-w-xs">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`py-2.5 px-6 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all flex-1 cursor-pointer ${
                          gender === 'male'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm shadow-blue-100'
                            : 'bg-slate-50 border-slate-200 text-slate-550 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span>זכר ♂</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`py-2.5 px-6 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all flex-1 cursor-pointer ${
                          gender === 'female'
                            ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm shadow-pink-100'
                            : 'bg-slate-50 border-slate-200 text-slate-550 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span>נקבה ♀</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      * המגדר משמש לחישוב מדדים פיזיולוגיים מדויקים של הרכב גוף וטווחי בדיקות מעבדה מומלצים, ומוגדר כהגדרה חד-פעמית וקבועה בחשבונך.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile}
                    className="px-6 py-2 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors flex items-center gap-2"
                  >
                    {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isFemale ? 'שמרי שינויים' : 'שמור שינויים'}
                  </button>
                </div>
                
                <div className="w-full">
                  <label className="text-sm font-semibold text-on-surface-variant mb-2 block">כתובת אימייל</label>
                  <div className="px-4 py-3 bg-surface rounded-xl border border-outline/10 text-on-surface-variant flex items-center gap-3">
                    <Mail className="w-5 h-5 opacity-50" />
                    {session?.user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* 🔒 שיתוף נתונים וליווי אישי */}
            {!isCoachOrAdmin && (
              <div className="bg-white p-8 rounded-2xl border border-outline/10 custom-shadow">
                <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-secondary" />
                  אישור שיתוף נתונים וליווי מקצועי
                </h3>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed font-body">
                  כאשר שיתוף הנתונים מאושר, המאמנים והתזונאים המוסמכים של OptiLife יוכלו לצפות בבדיקות הדם שלך, לעקוב אחר המדדים שלך ולשלוח לך הנחיות תזונה ואימונים מותאמות אישית.
                </p>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-right flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-primary text-sm mb-1 font-heading">
                      סטטוס שיתוף: {profile?.consent_sharing ? '✅ מאושר ופעיל' : '❌ כרגע חסום'}
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed font-body mt-1">
                      תוכל לשנות את בחירתך בכל עת כדי לאפשר או לחסום גישה של אנשי מקצוע.
                    </p>
                  </div>
                  
                  <button
                    onClick={async () => {
                      const newConsent = !profile?.consent_sharing;
                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ consent_sharing: newConsent })
                          .eq('id', session.user.id);
                        if (error) throw error;
                        
                        setProfile(prev => ({ ...prev, consent_sharing: newConsent }));
                        setMessage(newConsent ? 'אישור השיתוף הופעל בהצלחה!' : 'אישור השיתוף בוטל בהצלחה.');
                      } catch (err) {
                        console.error('Error updating consent:', err);
                        setError('אירעה שגיאה בעדכון ההצהרה.');
                      }
                    }}
                    className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 text-xs cursor-pointer select-none font-body ${
                      profile?.consent_sharing
                        ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                        : 'bg-secondary text-white hover:bg-secondary/90'
                    }`}
                  >
                    {profile?.consent_sharing ? 'בטל שיתוף נתונים' : 'אשר שיתוף נתונים 🤝'}
                  </button>
                </div>
              </div>
            )}

            {/* 🛡️ MFA (2FA) Two-Factor Authentication Security Settings */}
            <div className="bg-white p-8 rounded-2xl border border-outline/10 custom-shadow">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-secondary" />
                אבטחת חשבון והתחברות דו-שלבית (MFA)
              </h3>
              {isOAuth ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-right flex items-start gap-3.5">
                  <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm text-primary">אבטחת חשבון חיצוני פעילה 🛡️</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                      התחברת באמצעות חשבון Google. 
                      אבטחת החשבון והאימות הדו-שלבי שלך מנוהלים ומאובטחים בצורה הטובה ביותר ישירות על ידי ספק החשבון החיצוני שלך. 
                      אין צורך או אפשרות להפעיל אימות דו-שלבי נוסף באתר.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                    הוספת שכבת אבטחה נוספת לחשבונך. לאחר הפעלת אימות דו-שלבי, בכל התחברות יש להזין קוד אימות חד-פעמי המופק באפליקציית Authenticator בטלפון הנייד שלך.
                  </p>

                  {mfaStatus === 'disabled' && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-right flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-primary text-sm mb-1">התחברות דו-שלבית אינה פעילה</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed">מומלץ להפעיל את הפיצ'ר על מנת להגן על המידע הרפואי והאישי שלך.</p>
                      </div>
                      <button 
                        onClick={handleMFAEnroll}
                        disabled={mfaLoading}
                        className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-2 select-none"
                      >
                        {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        הפעל התחברות דו-שלבית
                      </button>
                    </div>
                  )}

                  {mfaStatus === 'enrolling' && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
                      <h4 className="font-bold text-primary text-md">הגדרת אפליקציית אימות (Authenticator App)</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* QR Code Container */}
                        <div className="md:col-span-4 flex justify-center">
                          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            {qrCodeUri.startsWith('data:image/svg+xml;base64,') ? (
                              <img 
                                src={qrCodeUri} 
                                alt="QR Code" 
                                className="w-44 h-44 object-contain" 
                              />
                            ) : qrCodeUri.startsWith('<svg') ? (
                              <div 
                                dangerouslySetInnerHTML={{ __html: qrCodeUri }} 
                                className="w-44 h-44 flex items-center justify-center"
                              />
                            ) : (
                              <img 
                                src={qrCodeUri} 
                                alt="QR Code" 
                                className="w-44 h-44 object-contain" 
                              />
                            )}
                          </div>
                        </div>

                        {/* Step description */}
                        <div className="md:col-span-8 space-y-4">
                          <p className="text-xs font-bold text-primary leading-relaxed">
                            {isFemale ? '1. סרקי את קוד ה-QR באמצעות אפליקציית אימות (כמו Google Authenticator, Microsoft Authenticator וכד\').' : '1. סרוק את קוד ה-QR באמצעות אפליקציית אימות (כמו Google Authenticator, Microsoft Authenticator וכד\').'}
                          </p>
                          <p className="text-xs font-bold text-primary leading-relaxed">
                            {isFemale ? '2. אם אינך יכולה לסרוק, תוכלי להזין את הקוד הסודי הבא באופן ידני באפליקציה:' : '2. אם אינך יכול לסרוק, תוכל להזין את הקוד הסודי הבא באופן ידני באפליקציה:'}
                          </p>
                          
                          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl max-w-sm justify-between">
                            <span className="font-mono text-sm tracking-wider font-extrabold text-slate-700 select-all">{totpSecret}</span>
                            <button 
                              onClick={handleCopySecret}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors flex items-center"
                              title={isFemale ? "העתיקי קוד סודי" : "העתק קוד סודי"}
                            >
                              {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-6 space-y-4 max-w-sm">
                        <label className="text-xs font-bold text-primary block">
                          {isFemale ? '3. הזיני את קוד האימות בן 6 הספרות המוצג כעת באפליקציה:' : '3. הזן את קוד האימות בן 6 הספרות המוצג כעת באפליקציה:'}
                        </label>
                        
                        <div className="flex gap-4">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-center font-mono font-bold text-lg tracking-wider focus:outline-none focus:border-secondary transition-colors flex-1"
                            placeholder="******"
                          />
                          <button 
                            onClick={handleMFAVerify}
                            disabled={mfaLoading || totpCode.length !== 6}
                            className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px]"
                          >
                            {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFemale ? 'אמתי והפעילי' : 'אמת והפעל')}
                          </button>
                        </div>

                        <button 
                          onClick={() => setMfaStatus('disabled')} 
                          className="text-xs text-slate-400 font-bold hover:underline"
                        >
                          ביטול הגדרה
                        </button>
                      </div>
                    </div>
                  )}

                  {mfaStatus === 'enabled' && sessionAal === 'aal2' && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900 text-sm">התחברות דו-שלבית פעילה ומאבטחת את חשבונך!</h4>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            {isFemale ? 'בכל פעם שתתחברי לחשבון, תידרשי להזין קוד אימות מאפליקציית Authenticator.' : 'בכל פעם שתתחבר לחשבון, תידרש להזין קוד אימות מאפליקציית Authenticator.'}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-emerald-100/50 pt-4 flex justify-between items-center flex-wrap gap-4">
                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                          <Key className="w-4 h-4" />
                          גורם אימות: Google Authenticator (TOTP)
                        </div>
                        <button 
                          onClick={() => handleMFADisable()}
                          disabled={mfaLoading}
                          className="px-4 py-2 border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                        >
                          {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          בטל התחברות דו-שלבית
                        </button>
                      </div>
                    </div>
                  )}

                  {mfaStatus === 'enabled' && sessionAal === 'aal1' && (
                    <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-amber-900 text-sm">נדרש אימות זהות מוגבר (AAL2)</h4>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            הפעלת בעבר אימות דו-שלבי (MFA), אך החיבור הנוכחי שלך אינו מאומת במלואו (רמת אבטחה AAL1).
                          </p>
                          <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                            על מנת לבצע פעולות רגישות כגון שינוי סיסמה או ביטול האימות הדו-שלבי, עליך לאמת כעת את זהותך באמצעות קוד מאפליקציית האימות.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-amber-200/50 pt-4 max-w-sm space-y-3">
                        <label className="text-xs font-bold text-amber-900 block">
                          {isFemale ? 'הזיני קוד אימות בן 6 ספרות מהאפליקציה בטלפון:' : 'הזן קוד אימות בן 6 ספרות מהאפליקציה בטלפון:'}
                        </label>
                        <div className="flex gap-4">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                            className="px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-center font-mono font-bold text-lg tracking-wider focus:outline-none focus:border-amber-500 transition-colors flex-1"
                            placeholder="******"
                          />
                          <button 
                            onClick={handleStepUpVerify}
                            disabled={mfaLoading || totpCode.length !== 6}
                            className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px]"
                          >
                            {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFemale ? 'אמתי זהות' : 'אמת זהות')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 🔑 שינוי סיסמה */}
            <div className="bg-white p-8 rounded-2xl border border-outline/10 custom-shadow">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-secondary" />
                שינוי סיסמה
              </h3>
              
              {isOAuth ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-right flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-700 text-sm">התחברת באמצעות חשבון חיצוני</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                      החשבון שלך מנוהל ומאובטח על ידי Google. 
                      אין צורך או אפשרות לשנות סיסמה באתר עבור התחברות חיצונית.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {mfaStatus === 'enabled' && sessionAal === 'aal1' ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-amber-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">נדרש אימות זהות מוגבר (AAL2)</p>
                        <p className="mt-1 leading-relaxed">
                          מאחר והפעלת אימות דו-שלבי (MFA), אינך יכול לשנות את הסיסמה בחיבור זה ללא ביצוע אימות נוסף. 
                          אנא הזן את קוד ה-OTP באזור **"אבטחת חשבון והתחברות דו-שלבית"** למעלה כדי לאמת את זהותך.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                      {isFemale ? 'רוצה להחליף סיסמה? הזיני סיסמה חדשה וחזקה (לפחות 6 תווים) ואשרי אותה.' : 'רוצה להחליף סיסמה? הזן סיסמה חדשה וחזקה (לפחות 6 תווים) ואשר אותה.'}
                    </p>
                  )}

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="w-full">
                        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">סיסמה חדשה</label>
                        <input 
                          type="password" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={isFemale ? "הזיני סיסמה חדשה" : "הזן סיסמה חדשה"}
                          disabled={mfaStatus === 'enabled' && sessionAal === 'aal1'}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-outline/10 text-on-surface font-medium focus:outline-none focus:border-secondary transition-colors text-right disabled:opacity-50"
                          dir="ltr"
                        />
                      </div>
                      <div className="w-full">
                        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">אימות סיסמה חדשה</label>
                        <input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={isFemale ? "הזיני את הסיסמה שוב" : "הזן את הסיסמה שוב"}
                          disabled={mfaStatus === 'enabled' && sessionAal === 'aal1'}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-outline/10 text-on-surface font-medium focus:outline-none focus:border-secondary transition-colors text-right disabled:opacity-50"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword || !newPassword || !confirmPassword || (mfaStatus === 'enabled' && sessionAal === 'aal1')}
                        className="px-6 py-2 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        עדכון סיסמה
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-outline/10 custom-shadow">
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-status-error" />
                אזור מסוכן
              </h3>
              <p className="text-on-surface-variant mb-6 text-sm">
                מחיקת חשבון היא פעולה בלתי הפיכה. כל הנתונים, בדיקות המעבדה והתובנות שלך יימחקו לצמיתות.
              </p>
              <button disabled className="px-6 py-3 bg-status-error/10 text-status-error font-bold rounded-xl opacity-50 cursor-not-allowed">
                מחק חשבון
              </button>
            </div>
          </div>

          {!isCoachOrAdmin && (
            /* Billing & Subscription */
            <div className="space-y-6">
              <div className={`p-8 rounded-2xl border custom-shadow relative overflow-hidden ${isPremium ? 'bg-primary border-primary' : 'bg-white border-outline/10'}`}>
                
                {isPremium && (
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
                )}
                
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isPremium ? 'text-white' : 'text-primary'}`}>
                  <CreditCard className={`w-6 h-6 ${isPremium ? 'text-secondary' : 'text-primary'}`} />
                  מסלול נוכחי
                </h3>
                
                <div className="mb-6">
                  <div className={`text-3xl font-bold mb-1 ${isPremium ? 'text-white' : 'text-primary'}`}>
                    {isPremiumActive ? 'Premium' : isPremiumCancelled ? 'Premium (מבוטל)' : 'חינמי'}
                  </div>
                  <p className={isPremium ? 'text-white/70 text-sm' : 'text-on-surface-variant text-sm'}>
                    {isPremium ? 'גישה מלאה לכל יכולות המערכת' : 'גישה בסיסית בלבד'}
                  </p>
                </div>
                
                {isPremiumActive && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-xl">
                      <p className="text-white text-sm font-medium mb-1">התשלום הבא</p>
                      <p className="text-white/80 text-xs">יחויב בעוד חודש (₪29.00)</p>
                    </div>
                    
                    <button 
                      onClick={handleCancelSubscription}
                      disabled={loading}
                      className="w-full py-3 bg-white text-primary font-bold rounded-xl hover:bg-slate-100 transition-colors flex justify-center cursor-pointer select-none text-xs"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ביטול מנוי'}
                    </button>
                  </div>
                )}

                {isPremiumCancelled && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                      <p className="text-white text-sm font-bold mb-1">המנוי בוטל</p>
                      <p className="text-white/80 text-xs leading-relaxed">
                        המנוי יישאר פעיל עד לתאריך <span className="font-extrabold">{cancelledDateFormatted}</span>. לאחר מכן ישונמך לחינם.
                      </p>
                    </div>
                    
                    <button 
                      onClick={handleReactivateSubscription}
                      disabled={loading}
                      className="w-full py-3 bg-accent-action text-primary font-bold rounded-xl hover:shadow-lg transition-all flex justify-center cursor-pointer select-none text-xs"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'הפעל מנוי מחדש 👑'}
                    </button>
                  </div>
                )}

                {!isPremium && (
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="w-full py-3 bg-accent-action text-primary font-bold rounded-xl hover:shadow-lg transition-all cursor-pointer text-xs"
                  >
                    {isFemale ? 'שדרגי לפרימיום' : 'שדרג לפרימיום'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
