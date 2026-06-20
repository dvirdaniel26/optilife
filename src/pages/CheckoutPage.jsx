import { useState, useContext, useEffect } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CreditCard, ShieldCheck, ArrowRight, CheckCircle2, Lock, Smartphone } from 'lucide-react';

export default function CheckoutPage() {
  const { session, profile, setProfile } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isFemale = profile?.gender === 'female';

  const selectedPlan = location.state?.plan === 'ai_ultimate' 
    ? 'ai_ultimate' 
    : (location.state?.plan === 'standard' ? 'standard' : 'premium');
  const priceLabel = selectedPlan === 'ai_ultimate' 
    ? '₪49.00' 
    : (selectedPlan === 'standard' ? '₪19.00' : '₪29.00');
  const planNameHebrew = selectedPlan === 'ai_ultimate' 
    ? 'OptiLife אולטימטיבי 🧠' 
    : (selectedPlan === 'standard' ? 'OptiLife מתקדם ⚡' : 'OptiLife מקצועי 👑');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Credit Card States
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [focusedField, setFocusedField] = useState('');

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'gpay'

  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const currentTier = profile?.subscription_tier || 'free';

    // If they already have an active/cancelled subscription or customer ID, redirect them to Customer Portal to change plan
    if (profile?.stripe_customer_id || currentTier !== 'free') {
      const portalLink = import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_LINK;
      if (portalLink) {
        window.location.href = `${portalLink}?prefilled_email=${encodeURIComponent(session.user.email)}`;
        return;
      }
    }

    const standardLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_STANDARD;
    const premiumLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
    const ultimateLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_ULTIMATE || premiumLink;
    
    let targetLink;
    if (selectedPlan === 'standard') {
      targetLink = standardLink;
    } else if (selectedPlan === 'ai_ultimate') {
      targetLink = ultimateLink;
    } else {
      targetLink = premiumLink;
    }

    if (targetLink) {
      localStorage.setItem('optilife_pending_checkout', selectedPlan);
      const separator = targetLink.includes('?') ? '&' : '?';
      const targetLinkWithParams = `${targetLink}${separator}client_reference_id=${session.user.id}_${selectedPlan}&prefilled_email=${encodeURIComponent(session.user.email)}`;
      window.location.href = targetLinkWithParams;
    } else {
      navigate('/pricing');
    }
  }, [session, selectedPlan, navigate, profile]);

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Format card number with spaces every 4 digits
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      const month = parseInt(value.slice(0, 2), 10);
      const activeMonth = Math.min(Math.max(month, 1), 12).toString().padStart(2, '0');
      const year = value.slice(2);
      value = `${activeMonth}/${year}`;
    }
    setExpiry(value);
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setCvv(value.slice(0, 3));
  };

  const processPayment = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (paymentMethod === 'card') {
        if (cardNumber.replace(/\s/g, '').length < 16) {
          throw new Error('מספר כרטיס האשראי אינו תקין. הוא חייב להכיל 16 ספרות.');
        }
        if (expiry.length < 5) {
          throw new Error('תוקף הכרטיס אינו תקין. יש להזין MM/YY.');
        }
        if (cvv.length < 3) {
          throw new Error('קוד אבטחה (CVV) אינו תקין. יש להזין 3 ספרות.');
        }
        if (!cardName.trim()) {
          throw new Error('יש להזין את שם בעל הכרטיס.');
        }
      }

      // Simulate network latency for payment gateway authorization
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update user subscription tier to selectedPlan in database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ subscription_tier: selectedPlan })
        .eq('id', session.user.id);

      if (dbError) throw dbError;

      // Update locally in context
      if (setProfile && profile) {
        setProfile({ ...profile, subscription_tier: selectedPlan });
      }

      // Trigger standard success states
      setSuccess(true);
      addNotification({
        type: 'success',
        title: selectedPlan === 'ai_ultimate' 
          ? 'ברוכים הבאים ל-OptiLife אולטימטיבי! ⚡' 
          : selectedPlan === 'premium' 
            ? 'ברוכים הבאים ל-OptiLife מקצועי! 🎉' 
            : 'ברוכים הבאים ל-OptiLife מתקדם! 🌟',
        message: selectedPlan === 'ai_ultimate'
          ? 'העסקה בוצעה בהצלחה. צ\'אט מאמן הבריאות ה-AI, מחולל התפריטים והחיזויים פתוחים בפניך כעת!'
          : selectedPlan === 'premium'
            ? 'העסקה בוצעה בהצלחה. העלאת בדיקות ותוכניות בריאות ללא הגבלה ומעקב המגמות פתוחים בפניך כעת!'
            : 'העסקה בוצעה בהצלחה. ניתוח בדיקות מורחב, יצירת תוכנית בריאות וייצוא PDF פתוחים בפניך כעת!',
        link: selectedPlan === 'ai_ultimate' ? '/ai-coach' : '/dashboard'
      });

      // Redirect after success animation
      setTimeout(() => {
        navigate(selectedPlan === 'ai_ultimate' ? '/ai-coach' : '/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Payment Error:', err);
      setError(err.message || (isFemale ? 'אירעה שגיאה בתהליך החיוב. אנא ודאי שהפרטים שהזנת תקינים ונסי שוב.' : 'אירעה שגיאה בתהליך החיוב. אנא ודא שהפרטים שהזנת תקינים ונסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStripeRedirect = () => {
    setLoading(true);
    setError(null);
    try {
      const standardLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_STANDARD;
      const premiumLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
      const ultimateLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_ULTIMATE || premiumLink;
      
      let targetLink;
      if (selectedPlan === 'standard') {
        targetLink = standardLink;
      } else if (selectedPlan === 'ai_ultimate') {
        targetLink = ultimateLink;
      } else {
        targetLink = premiumLink;
      }
      
      if (targetLink) {
        localStorage.setItem('optilife_pending_checkout', selectedPlan);
        const separator = targetLink.includes('?') ? '&' : '?';
        const targetLinkWithParams = `${targetLink}${separator}client_reference_id=${session.user.id}_${selectedPlan}&prefilled_email=${encodeURIComponent(session.user.email)}`;
        window.location.href = targetLinkWithParams;
      } else {
        throw new Error('קישור Stripe לא מוגדר בקובץ ההגדרות.');
      }
    } catch (err) {
      console.error(err);
      setError('אירעה שגיאה במעבר לעמוד התשלום המאובטח.');
      setLoading(false);
    }
  };

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-center">
        <Loader2 className="w-12 h-12 text-secondary animate-spin" />
        <p className="text-on-surface-variant font-medium text-lg">מעביר אותך בצורה מאובטחת לעמוד התשלום...</p>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-body text-right" dir="rtl">
      
      {/* 🏛️ Checkout Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => navigate('/pricing')} 
            className="flex items-center gap-1.5 text-primary hover:text-secondary font-bold transition-all group py-1.5 px-4 bg-slate-50 rounded-full text-sm border border-slate-200/50"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>חזרה לתוכניות</span>
          </button>
          
          <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-lg font-bold">favorite</span>
            </div>
            <span className="font-heading text-lg font-black tracking-wide text-primary">OptiLife</span>
          </div>
        </div>
      </header>

      {/* 💳 Checkout Grid Container */}
      <main className="max-w-5xl w-full mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* RIGHT SIDE: Payment Fields */}
        <div className="col-span-12 md:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Lock className="w-6 h-6 text-secondary" />
              תשלום מאובטח
            </h1>
            <p className="text-on-surface-variant text-xs mt-1">התשלום שלך מוצפן ומאובטח בתקני PCI-DSS המחמירים ביותר.</p>
          </div>

          {error && (
            <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-2xl flex items-start gap-3 text-status-error text-xs animate-in slide-in-from-top-1">
              <span className="material-symbols-outlined text-lg">error</span>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl text-xs font-semibold w-full">
            <button 
              onClick={() => { setPaymentMethod('card'); setError(null); }}
              className={`w-1/3 py-3 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${paymentMethod === 'card' ? 'bg-white text-primary shadow-sm font-bold border border-slate-100' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>כרטיס אשראי</span>
            </button>
            <button 
              onClick={() => { setPaymentMethod('gpay'); setError(null); }}
              className={`w-1/3 py-3 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${paymentMethod === 'gpay' ? 'bg-white text-primary shadow-sm font-bold border border-slate-100' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Google Pay</span>
            </button>
            <button 
              onClick={() => { setPaymentMethod('stripe'); setError(null); }}
              className={`w-1/3 py-3 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${paymentMethod === 'stripe' ? 'bg-indigo-650 bg-indigo-600 text-white font-bold shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-sm font-bold shrink-0">payments</span>
              <span>תשלום דיגיטלי</span>
            </button>
          </div>

          {paymentMethod === 'card' ? (
            /* 💳 Interactive Credit Card Form */
            <form onSubmit={processPayment} className="space-y-5">
              
              {/* Virtual Card Visualization */}
              <div className="relative w-full max-w-sm mx-auto h-48 rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-xl overflow-hidden mb-6 flex flex-col justify-between transition-transform duration-500 transform hover:scale-[1.02]">
                <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-[1px] pointer-events-none" />
                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl font-bold">favorite</span>
                    <span className="font-heading font-black tracking-wide text-sm">OptiLife Premium</span>
                  </div>
                  <div className="w-10 h-7 bg-white/10 rounded-md backdrop-blur-md flex items-center justify-center">
                    <CreditCard className="w-5 h-5 opacity-70" />
                  </div>
                </div>
                
                <div className="space-y-4 z-10">
                  {/* Card Number display */}
                  <div className="font-mono text-lg tracking-widest text-center">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex justify-between items-end text-xs font-semibold">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider block opacity-70 mb-0.5">בעל הכרטיס</span>
                      <span className="truncate max-w-[150px] block">{cardName || 'שם מלא'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider block opacity-70 mb-0.5">תוקף</span>
                      <span>{expiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold text-slate-700 block">שם בעל הכרטיס</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.replace(/[^A-Za-z\sא-ת]/g, ''))}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField('')}
                    placeholder="שם כפי שהוא מופיע על הכרטיס"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-slate-50"
                    required
                  />
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold text-slate-700 block">מספר כרטיס אשראי</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onFocus={() => setFocusedField('number')}
                      onBlur={() => setFocusedField('')}
                      placeholder="0000 0000 0000 0000"
                      className="w-full pl-4 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-slate-50 text-left"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-700 block">תוקף הכרטיס</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={handleExpiryChange}
                      onFocus={() => setFocusedField('expiry')}
                      onBlur={() => setFocusedField('')}
                      placeholder="MM/YY"
                      className="w-full py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-slate-50 text-center"
                      required
                    />
                  </div>

                  <div className="w-1/2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-700 block">קוד אבטחה (CVV)</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={handleCvvChange}
                      onFocus={() => setFocusedField('cvv')}
                      onBlur={() => setFocusedField('')}
                      placeholder="•••"
                      maxLength={3}
                      className="w-full py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all hover:bg-slate-50 text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 bg-accent-action text-primary rounded-xl font-bold hover:bg-accent-action/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-accent-action/10 cursor-pointer text-base"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isFemale ? `שלמי ${priceLabel} חודשי` : `שלם ${priceLabel} חודשי`)}
              </button>
            </form>
          ) : paymentMethod === 'gpay' ? (
            /* 📱 Google Pay simulated checkout */
            <div className="space-y-6 py-6 text-center">
              <div className="max-w-xs mx-auto p-6 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">nfc</span>
                <h4 className="font-bold text-primary mb-1 text-sm">התחברות מהירה ל-Google Pay</h4>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  {isFemale ? 'השתמשי בכרטיס האשראי או באמצעי התשלום המוגדרים בחשבון ה-Google שלך לתשלום מאובטח בלחיצה אחת.' : 'השתמש בכרטיס האשראי או באמצעי התשלום המוגדרים בחשבון ה-Google שלך לתשלום מאובטח בלחיצה אחת.'}
                </p>
              </div>

              <button
                onClick={processPayment}
                disabled={loading}
                className="w-full max-w-sm mx-auto py-4 bg-black text-white rounded-xl font-bold hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg shadow-black/10 cursor-pointer text-base"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>{isFemale ? 'שלמי באמצעות Google Pay' : 'שלם באמצעות Google Pay'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 🔗 Stripe Gateway checkout */
            <div className="space-y-6 py-6 text-center animate-in fade-in duration-300">
              <div className="max-w-xs mx-auto p-6 border border-slate-100 rounded-2xl bg-indigo-50/50 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-indigo-500 mb-2">payments</span>
                <h4 className="font-bold text-primary mb-1 text-sm">מעבר מאובטח לעמוד התשלום</h4>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  הינך מועבר לדף התשלום הרשמי והמאובטח להשלמת העסקה.
                </p>
              </div>

              <button
                onClick={handleStripeRedirect}
                disabled={loading}
                className="w-full max-w-sm mx-auto py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20 cursor-pointer text-base border-0"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span>המשך לתשלום מאובטח 💳</span>
                )}
              </button>
            </div>
          )}

          {/* Secure Trust Badges */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between text-xs text-on-surface-variant/80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
              <span>הצפנת SSL 256-bit מאובטחת</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>סליקה מאובטחת ומאושרת PCI</span>
            </span>
          </div>
        </div>

        {/* LEFT SIDE: Order Summary */}
        <div className="col-span-12 md:col-span-5 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-primary">סיכום הזמנה</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-primary text-sm">מנוי {planNameHebrew}</h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">
                  {selectedPlan === 'ai_ultimate'
                    ? 'החבילה הטכנולוגית המלאה: צ\'אט פתוח עם מאמן בריאות AI אינטראקטיבי 24/7, מחולל תפריטים, ומגמות חיזוי מתקדמות לצד כל יכולות המסלול המקצועי.'
                    : 'תוכנית חודשית לניתוח בדיקות דם עם AI, המלצות כושר ותזונה מפורטות, הפקת דוחות PDF מקיפים ומעקב מגמות בריאותיות.'}
                </p>
              </div>
              <span className="font-bold text-primary shrink-0 text-sm">{priceLabel}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">סכום ביניים:</span>
                <span className="font-semibold text-primary">{priceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">מע״מ (17%):</span>
                <span className="font-semibold text-primary">כלול</span>
              </div>
              <div className="border-t border-slate-200/50 my-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-primary">סה״כ לתשלום:</span>
                <span className="text-secondary">{priceLabel} / חודש</span>
              </div>
            </div>
          </div>

          <div className="bg-secondary/5 rounded-2xl p-4 border border-secondary/10 space-y-3">
            <h4 className="font-bold text-secondary text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">workspace_premium</span>
              הטבות המסלול שלך:
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-700">
              {selectedPlan === 'ai_ultimate' ? (
                <>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>💬 צ'אט אינטראקטיבי פתוח 24/7 עם AI Health Coach</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>🥦 מחולל תפריטים ומתכונים מבוסס חוסרים</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>🔮 מנוע חיזוי ומגמות מדדים עתידיות</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>🔬 מנתח שילוב תרופות ותוספים</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>ניתוח בדיקות דם ללא הגבלה במקום פעם אחת</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>המלצות תזונה וכושר מותאמות מדדים (AI)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>ייצוא דוח PDF מהודר לשיתוף עם הרופא</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    <span>גרפים ומעקב מגמות לאורך זמן</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* 🏛️ Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-on-surface-variant/80">
        <div className="max-w-5xl mx-auto px-6">
          <p>© {new Date().getFullYear()} OptiLife. כל הזכויות שמורות. מנוע סליקה מאובטח ומוצפן.</p>
        </div>
      </footer>

    </div>
  );
}
