import { useState, useContext } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { Check, Star, Loader2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const { profile, session, setProfile, isPremium } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const handleUpgrade = (planType) => {
    if (!session?.user?.id) {
      navigate('/auth');
      return;
    }


    const standardLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_STANDARD;
    const premiumLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
    const ultimateLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_ULTIMATE || premiumLink;
    const upgradeLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK_UPGRADE || ultimateLink;

    let targetLink;
    if (planType === 'standard') {
      targetLink = standardLink;
    } else if (planType === 'premium') {
      targetLink = premiumLink;
    } else if (planType === 'ai_ultimate') {
      targetLink = isCurrentlyPremium ? upgradeLink : ultimateLink;
    }
    
    if (targetLink) {
      localStorage.setItem('optilife_pending_checkout', planType);
      const separator = targetLink.includes('?') ? '&' : '?';
      const targetLinkWithParams = `${targetLink}${separator}client_reference_id=${session.user.id}_${planType}&prefilled_email=${encodeURIComponent(session.user.email)}`;
      window.location.href = targetLinkWithParams;
    } else {
      alert('קישור לתשלום לא מוגדר בקובץ ההגדרות.');
    }
  };

  const currentTier = profile?.subscription_tier || 'free';
  const isCurrentlyAiUltimate = currentTier === 'ai_ultimate';
  const isCurrentlyPremium = currentTier === 'premium' || currentTier.startsWith('premium_cancelled:');
  const isCurrentlyStandard = currentTier === 'standard' || currentTier.startsWith('standard_cancelled:');

  return (
    <>
      <main className="md:pr-72 pt-24 min-h-screen transition-all">
        <div className="p-xl max-w-[1550px] mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl text-primary font-bold mb-4">שדרג את חווית הבריאות שלך</h2>
            <p className="font-body text-xl text-on-surface-variant max-w-2xl mx-auto">
              {profile?.gender === 'female' ? 'בחרי' : 'בחר'} את המסלול המתאים לך ביותר. השקעה קטנה בבריאות שלך מניבה תוצאות גדולות.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto">
            {/* Free Plan */}
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl p-8 border border-slate-100 custom-shadow flex flex-col relative overflow-hidden text-center transform hover:scale-[1.02] transition-all duration-300">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-2xl font-bold text-primary mb-2 text-center w-full">בסיסי</h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-primary">₪0</span>
                <span className="text-on-surface-variant">/ לחודש</span>
              </div>
              <p className="text-on-surface-variant mb-8 text-center w-full">מעולה להתחלה ולהיכרות עם המערכת.</p>

              <ul className="space-y-4 mb-10 flex-1 w-full text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className="text-right text-sm">מעקב אחר מדדים בסיסיים</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className="text-right text-sm">העלאת בדיקת מעבדה 1</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">תוכנית בריאות (Action Plan)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">תובנות בינה מלאכותית (AI)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">גישה למרכז בריאות אישי</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">מאמן בריאות AI אינטראקטיבי 24/7</span>
                </li>
              </ul>

              <button
                disabled={true}
                className="w-full py-4 rounded-xl font-bold bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed text-xs"
              >
                {isCurrentlyStandard || isCurrentlyPremium || isCurrentlyAiUltimate ? 'מסלול קודם' : 'המסלול הנוכחי שלך'}
              </button>
            </div>

            {/* Standard Plan */}
            <div className="bg-gradient-to-b from-primary/5 via-white to-white rounded-3xl p-8 border border-primary/10 custom-shadow flex flex-col relative overflow-hidden text-center transform hover:scale-[1.02] transition-all duration-300">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-2xl font-bold text-primary mb-2 text-center w-full">מתקדם</h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-primary">₪19</span>
                <span className="text-on-surface-variant">/ לחודש</span>
              </div>
              <p className="text-on-surface-variant mb-8 text-center w-full">למעקב בריאות ממוקד ומדויק.</p>

              <ul className="space-y-4 mb-10 flex-1 w-full text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right text-sm">מעקב אחר מדדים בסיסיים</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right text-sm">העלאת עד 3 בדיקות מעבדה</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right text-sm">יצירת תוכנית בריאות 1 (AI)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right text-sm">ייצוא דוחות PDF ושיתוף רופא</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right text-sm">גישה למרכז בריאות אישי</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">מאמן בריאות AI אינטראקטיבי 24/7</span>
                </li>
              </ul>

              <button
                onClick={() => handleUpgrade('standard')}
                disabled={isCurrentlyStandard || isCurrentlyPremium || isCurrentlyAiUltimate || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs ${isCurrentlyStandard
                    ? 'bg-status-success text-white cursor-not-allowed border-0'
                    : (isCurrentlyPremium || isCurrentlyAiUltimate)
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/95 cursor-pointer border-0 shadow-md'
                  }`}
              >
                {isCurrentlyStandard ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>המסלול הנוכחי שלך</span>
                  </>
                ) : (isCurrentlyPremium || isCurrentlyAiUltimate) ? (
                  <span>מסלול קודם</span>
                ) : (
                  profile?.gender === 'female' ? 'שדרגי למסלול מתקדם' : 'שדרג למסלול מתקדם'
                )}
              </button>
            </div>

            {/* Premium Plan (Professional) */}
            <div className="bg-gradient-to-b from-secondary/5 via-white to-white rounded-3xl p-8 border-2 border-secondary custom-shadow flex flex-col relative overflow-hidden text-center transform hover:scale-[1.02] transition-all duration-300">
              <div className="absolute top-4 right-4 bg-secondary text-white text-[11px] font-bold px-3 py-1.5 rounded-full z-10 shadow-md flex items-center gap-1.5 select-none">
                <Star className="w-3.5 h-3.5 fill-current text-white shrink-0" />
                <span>מומלץ</span>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2 w-full text-center">
                מקצועי <Star className="w-5 h-5 text-secondary fill-secondary" />
              </h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-primary">₪29</span>
                <span className="text-on-surface-variant">/ לחודש</span>
              </div>
              <p className="text-on-surface-variant mb-8 text-center w-full">גישה מלאה לכל הכלים המקצועיים.</p>

              <ul className="space-y-4 mb-10 flex-1 w-full text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">כל מה שיש במסלול המתקדם</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">העלאת בדיקות ללא הגבלה</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">תוכניות בריאות ללא הגבלה (AI)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">גרפים ומעקב מגמות מורחב</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">מרכז בריאות אישי מתקדם</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/40 text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right">מאמן בריאות AI אינטראקטיבי 24/7</span>
                </li>
              </ul>

              <button
                onClick={() => handleUpgrade('premium')}
                disabled={isCurrentlyPremium || isCurrentlyAiUltimate || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs ${isCurrentlyPremium
                    ? 'bg-status-success text-white cursor-not-allowed border-0'
                    : isCurrentlyAiUltimate
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-secondary text-white hover:bg-secondary/95 hover:shadow-lg hover:shadow-secondary/20 cursor-pointer border-0'
                  }`}
              >
                {isCurrentlyPremium ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>המסלול הנוכחי שלך</span>
                  </>
                ) : isCurrentlyAiUltimate ? (
                  <span>מסלול קודם</span>
                ) : (
                  profile?.gender === 'female' ? 'שדרגי למסלול מקצועי' : 'שדרג למסלול מקצועי'
                )}
              </button>
            </div>

            {/* AI Ultimate Plan */}
            <div className="bg-gradient-to-br from-amber-500/5 via-white to-white rounded-3xl p-8 border-2 border-amber-400 custom-shadow flex flex-col relative overflow-hidden transform hover:scale-[1.02] transition-all duration-300 text-center shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2 w-full text-center">
                אולטימטיבי 🧠
              </h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-primary">₪49</span>
                <span className="text-on-surface-variant">/ לחודש</span>
              </div>
              <p className="text-on-surface-variant mb-8 text-center w-full">ליווי בינה מלאכותית מקיף ואינטראקטיבי.</p>

              <ul className="space-y-4 mb-10 flex-1 w-full text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">כל מה שיש במסלול המקצועי</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">צ'אט אינטראקטיבי חכם עם מאמן בריאות (AI Coach)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">פענוח מתקדם ודינאמי של מדדי דם בזמן אמת ע״י AI</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">גישה בלתי מוגבלת לכל הפלטפורמה והפיצ'רים העתידיים</span>
                </li>
              </ul>

              <button
                onClick={() => handleUpgrade('ai_ultimate')}
                disabled={isCurrentlyAiUltimate || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs ${isCurrentlyAiUltimate
                    ? 'bg-status-success text-white cursor-not-allowed border-0'
                    : 'bg-gradient-to-r from-secondary to-amber-500 text-white hover:shadow-lg hover:shadow-secondary/20 cursor-pointer border-0 shadow-md'
                  }`}
              >
                {isCurrentlyAiUltimate ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>המסלול הנוכחי שלך</span>
                  </>
                ) : isCurrentlyPremium ? (
                  profile?.gender === 'female' ? 'שדרגי למסלול אולטימטיבי (דלתא ב-₪20 לחודש) ⚡' : 'שדרג למסלול אולטימטיבי (דלתא ב-₪20 לחודש) ⚡'
                ) : isCurrentlyStandard ? (
                  profile?.gender === 'female' ? 'שדרגי למסלול אולטימטיבי ⚡' : 'שדרג למסלול אולטימטיבי ⚡'
                ) : (
                  profile?.gender === 'female' ? 'שדרגי למסלול אולטימטיבי ⚡' : 'שדרג למסלול אולטימטיבי ⚡'
                )}
              </button>
            </div>
          </div>

          {/* Billing footnotes detailing cancellation and period policies */}
          <p className="w-full text-center text-xs text-on-surface-variant/80 mt-12 max-w-2xl mx-auto leading-relaxed border-t border-slate-100 pt-6 block" style={{ width: '100%' }}>
            * המנוי הוא חודשי ומתחדש באופן אוטומטי. במקרה של ביטול מנוי הפרימיום במהלך החודש,
            <span className="font-bold text-primary"> הגישה לתכונות הפרימיום תימשך עד לסיום מחזור החיוב הנוכחי שלך</span> (לפי תאריך הרכישה האישי שלך), ולא תבוצע הפסקה מיידית של השירות.
          </p>
        </div>
      </main>

    </>
  );
}
