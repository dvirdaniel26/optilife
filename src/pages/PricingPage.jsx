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
    navigate('/checkout', { state: { plan: planType } });
  };

  const currentTier = profile?.subscription_tier || 'free';
  const isCurrentlyAiUltimate = currentTier === 'ai_ultimate';
  const isCurrentlyPremium = currentTier === 'premium' || currentTier.startsWith('premium_cancelled:');

  return (
    <>
      <main className="md:pr-72 pt-24 min-h-screen transition-all">
        <div className="p-xl max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl text-primary font-bold mb-4">שדרג את חווית הבריאות שלך</h2>
            <p className="font-body text-xl text-on-surface-variant max-w-2xl mx-auto">
              {profile?.gender === 'female' ? 'בחרי' : 'בחר'} את המסלול המתאים לך ביותר. השקעה קטנה בבריאות שלך מניבה תוצאות גדולות.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-3xl p-8 border border-outline/10 custom-shadow flex flex-col relative overflow-hidden text-center">
              <h3 className="text-2xl font-bold text-primary mb-2 text-center w-full">חינמי</h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-primary">₪0</span>
                <span className="text-on-surface-variant">/ לחודש</span>
              </div>
              <p className="text-on-surface-variant mb-8 text-center w-full">מעולה להתחלה ולהיכרות עם המערכת.</p>

              <ul className="space-y-4 mb-10 flex-1 mx-auto w-fit text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-status-success shrink-0" />
                  <span className="text-right text-sm">מעקב אחר מדדים בסיסיים</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-status-success shrink-0" />
                  <span className="text-right text-sm">העלאת עד 2 בדיקות מעבדה בחודש</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-status-success shrink-0" />
                  <span className="text-right text-sm">צפייה בלוח בקרה אישי</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/50 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">תובנות בינה מלאכותית (AI)</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant/50 w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <span className="material-symbols-outlined w-5 h-5 shrink-0 text-current">close</span>
                  <span className="line-through text-right text-sm">מאמן בריאות AI אינטראקטיבי 24/7</span>
                </li>
              </ul>

              <button
                disabled={true}
                className="w-full py-4 rounded-xl font-bold bg-surface text-on-surface-variant border border-outline/20 cursor-not-allowed text-xs"
              >
                {isCurrentlyPremium || isCurrentlyAiUltimate ? 'מסלול קודם' : 'המסלול הנוכחי שלך'}
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-primary rounded-3xl p-8 border border-secondary/30 custom-shadow flex flex-col relative overflow-hidden shadow-xl text-center">
              <div className="absolute top-4 right-4 bg-secondary text-white text-[11px] font-bold px-3 py-1.5 rounded-full z-10 shadow-md flex items-center gap-1.5 select-none">
                <Star className="w-3.5 h-3.5 fill-current text-white shrink-0" />
                <span>מומלץ</span>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2 w-full text-center">
                פרימיום <Star className="w-5 h-5 text-accent-action fill-accent-action" />
              </h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-white">₪29</span>
                <span className="text-white/60">/ לחודש</span>
              </div>
              <p className="text-white/80 mb-8 text-center w-full">גישה מלאה לכל הכלים המקצועיים.</p>

              <ul className="space-y-4 mb-10 flex-1 mx-auto w-fit text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">כל מה שיש במסלול החינמי</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">העלאת בדיקות ללא הגבלה</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">תובנות בינה מלאכותית מתקדמות (AI)</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">יצירת דוחות PDF ושיתוף רופא</span>
                </li>
                <li className="flex items-center gap-3 text-white/50 text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
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
                      ? 'bg-white/10 text-white/50 cursor-not-allowed border-0'
                      : 'bg-accent-action text-primary hover:shadow-lg hover:shadow-accent-action/20 cursor-pointer border-0'
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
                  profile?.gender === 'female' ? 'שדרגי עכשיו' : 'שדרג עכשיו'
                )}
              </button>
            </div>

            {/* AI Ultimate Plan */}
            <div className="bg-slate-900 rounded-3xl p-8 border-2 border-secondary/80 custom-shadow flex flex-col relative overflow-hidden shadow-2xl text-center">
              <div className="absolute top-4 right-4 bg-gradient-to-l from-secondary to-amber-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full z-10 shadow-md flex items-center gap-1.5 select-none uppercase tracking-wide">
                <span>AI Ultimate ⚡</span>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2 w-full text-center">
                AI Ultimate 🧠
              </h3>
              <div className="flex items-baseline justify-center gap-1 mb-6 w-full">
                <span className="text-5xl font-bold text-white">₪49</span>
                <span className="text-white/60">/ לחודש</span>
              </div>
              <p className="text-white/80 mb-8 text-center w-full">ליווי בינה מלאכותית מקיף ואינטראקטיבי.</p>

              <ul className="space-y-4 mb-10 flex-1 mx-auto w-fit text-right" style={{ direction: 'rtl' }}>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">כל מה שיש במסלול הפרימיום</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm font-bold bg-white/5 -mx-4 px-4 py-2 rounded-lg text-right w-full" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">💬 צ'אט אינטראקטיבי 24/7 עם AI Health Coach</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">🥦 מחולל תפריטים ומתכונים מותאם מדדים</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">🔮 מנוע חיזוי ומגמות מדדים עתידיות</span>
                </li>
                <li className="flex items-center gap-3 text-white text-sm w-full text-right" style={{ justifyContent: 'flex-start' }}>
                  <Check className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-right">🔬 מנתח שילוב תרופות ותוספי תזונה</span>
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
                ) : (
                  profile?.gender === 'female' ? 'שדרגי ל-AI Ultimate ⚡' : 'שדרג ל-AI Ultimate ⚡'
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
