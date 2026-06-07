import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { generateActionPlan } from '../lib/gemini';
import { Loader2, AlertCircle, Sparkles, Check, Flame, Salad, Printer, Dumbbell, Calendar, Heart, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ActionPlanPage() {
  const { profile, session, isPremium } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const navigate = useNavigate();
  const isFemale = profile?.gender === 'female';

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestTest, setLatestTest] = useState(null);
  const [labResults, setLabResults] = useState([]);
  const [actionPlan, setActionPlan] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('nutrition'); // 'nutrition' or 'fitness'

  // Loading cycling messages
  const [loadingStep, setLoadingStep] = useState(0);
  const steps = [
    'מנתח את תוצאות המעבדה והמדדים החריגים שלך...',
    'מרכיב המלצות תזונה קליניות לשיפור המדדים...',
    'בונה תוכנית אימונים וכושר מותאמת אישית...',
    'מלטש ומאמת את תוכנית הבריאות האישית שלך...'
  ];

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % steps.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);



  const fetchData = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch latest analyzed test
      const { data: test, error: testErr } = await supabase
        .from('medical_tests')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'נותח')
        .order('test_date', { ascending: false })
        .limit(1);

      if (testErr) throw testErr;

      if (test && test.length > 0) {
        const activeTest = test[0];
        setLatestTest(activeTest);

        // 2. Fetch lab results
        const { data: results, error: resultsErr } = await supabase
          .from('lab_results')
          .select('*')
          .eq('test_id', activeTest.id);

        if (resultsErr) throw resultsErr;
        setLabResults(results || []);

        // 3. Fetch action plan if it exists
        const { data: insights, error: insightsErr } = await supabase
          .from('ai_insights')
          .select('*')
          .eq('test_id', activeTest.id)
          .like('summary_text', 'ACTION_PLAN:%');

        if (insightsErr) throw insightsErr;

        if (insights && insights.length > 0) {
          try {
            const rawJson = insights[0].summary_text.replace('ACTION_PLAN:', '');
            const parsedPlan = JSON.parse(rawJson);
            setActionPlan(parsedPlan);
          } catch (e) {
            console.error('Error parsing existing plan:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching plan data:', err);
      setError(isFemale ? 'אירעה שגיאה בטעינת הנתונים. אנא נסי שוב.' : 'אירעה שגיאה בטעינת הנתונים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleCreatePlan = async () => {
    if (!isPremium) {
      navigate('/pricing');
      return;
    }

    if (!latestTest || labResults.length === 0) return;

    try {
      setIsGenerating(true);
      setError(null);

      // Generate action plan using Gemini
      const plan = await generateActionPlan(labResults, profile);

      // Store in Supabase inside ai_insights table as ACTION_PLAN:<json>
      const serializedPlan = `ACTION_PLAN:${JSON.stringify(plan)}`;
      const { error: insertErr } = await supabase
        .from('ai_insights')
        .insert([{
          test_id: latestTest.id,
          user_id: session.user.id,
          summary_text: serializedPlan
        }]);

      if (insertErr) throw insertErr;

      // Add notification
      addNotification({
        type: 'plan',
        title: 'תוכנית הבריאות האישית שלך מוכנה! ✨',
        message: 'הבינה המלאכותית יצרה עבורך תפריט תזונתי מפורט ותוכנית אימונים אישית על בסיס בדיקת הדם האחרונה.',
        link: '/plan'
      });

      setActionPlan(plan);
    } catch (err) {
      console.error('Error generating action plan:', err);
      setError(err.message || (isFemale ? 'אירעה שגיאה במהלך יצירת התוכנית. אנא נסי שוב.' : 'אירעה שגיאה במהלך יצירת התוכנית. אנא נסה שוב.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-center">
          <Loader2 className="w-12 h-12 text-secondary animate-spin" />
          <p className="text-on-surface-variant font-medium">טוען את תוכנית הבריאות שלך...</p>
        </div>
      </main>
    );
  }

  // Gate for free tier users
  if (!isPremium) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-xl w-full max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-secondary to-primary"></div>

            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-lg text-secondary">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>

            <h2 className="font-heading text-3xl md:text-4xl text-primary font-bold mb-md">
              תוכנית פעולה אישית (תזונה וכושר)
            </h2>
            <p className="text-on-surface-variant text-lg w-full max-w-2xl mx-auto mb-xl leading-relaxed">
              תוכנית הבריאות האישית היא פיצ'ר פרימיום בלעדי. ה-AI שלנו יבנה עבורך תפריט תזונתי מפורט ותוכנית כושר שבועית מותאמת אישית על בסיס תוצאות בדיקת הדם הספציפיות שלך.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg max-w-3xl mx-auto mb-xl text-right">
              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                  <Salad className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">תפריט תזונה קליני אישי</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    תפריט ארוחות מלא (בוקר, ביניים, צהריים, ערב) עם רכיבים שמטרתם להעלות או להוריד מדדים חריגים שנתגלו בבדיקה שלך.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0 text-secondary">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">תוכנית אימונים מותאמת מדדים</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    חלוקת אימונים שבועית עם תרגילים, עצימויות וזמנים, שנועדו לשפר רגישות לאינסולין, סיבולת לב ריאה או בריאות השלד בהתאם לצורך.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/pricing')}
              className="bg-accent-action text-primary font-bold px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 text-lg uppercase inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {isFemale ? 'שדרגי לפרימיום ופתחי את התוכנית' : 'שדרג לפרימיום ופתח את התוכנית'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // If no test has been analyzed yet
  if (!latestTest) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-xl w-full max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/10 text-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-primary/40 text-4xl">science</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-primary mb-md">טרם זוהו תוצאות מעבדה</h2>
            <p className="text-on-surface-variant text-lg w-full max-w-md mx-auto mb-xl leading-relaxed">
              כדי לבנות עבורך תפריט תזונתי ותוכנית אימונים מותאמת אישית, עלינו קודם כל לנתח לפחות בדיקת דם אחת.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="bg-accent-action text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-all active:scale-95 text-lg"
            >
              {isFemale ? 'העלי בדיקת דם כעת' : 'העלה בדיקת דם כעת'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Active generating state
  if (isGenerating) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-xl w-full max-w-md mx-auto text-center pt-20">
          <div className="bg-white rounded-3xl p-xl custom-shadow border border-slate-100 flex flex-col items-center w-full">
            <div className="relative mb-lg">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-secondary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
              </div>
            </div>
            <h3 className="font-heading text-2xl font-bold text-primary mb-md">יוצר את תוכנית הבריאות...</h3>
            <div className="min-h-[50px] flex items-center justify-center w-full">
              <p className="text-on-surface-variant font-medium text-md transition-all duration-500 animate-pulse leading-relaxed">
                {steps[loadingStep]}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Plan generation screen (if no plan exists yet)
  if (!actionPlan) {
    const abnormalCount = labResults.filter(r => r.is_abnormal).length;

    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-xl max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-xl pb-6 border-b border-slate-50">
              <div>
                <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">PREMIUM ACTIVE</span>
                <h2 className="font-heading text-3xl font-bold text-primary mt-2">תוכנית בריאות וכושר אישית</h2>
                <p className="text-on-surface-variant text-sm mt-1">על בסיס תוצאות המעבדה שלך מתאריך {latestTest.test_date}</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-primary/5 text-primary text-xs font-medium px-4 py-2 rounded-xl">
                  {labResults.length} מדדים שזוהו
                </span>
                {abnormalCount > 0 && (
                  <span className="bg-status-error/10 text-status-error text-xs font-bold px-4 py-2 rounded-xl">
                    {abnormalCount} מדדים מחוץ לטווח
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-lg mb-xl text-right">
              <h3 className="font-bold text-primary text-lg mb-xs">
                {isFemale ? 'מוכנה להרכיב את התוכנית?' : 'מוכן להרכיב את התוכנית?'}
              </h3>
              <p className="text-on-surface-variant text-md leading-relaxed mb-lg">
                ה-AI שלנו ישלב כעת את ממצאי המעבדה שלך ויבנה תפריט תזונה ממוקד ותוכנית אימונים מפורטת. רכיבי התפריט ותרגילי הכושר יותאמו במיוחד כדי להחזיר את המדדים החריגים שלך לטווח הנורמה.
              </p>
              <button
                onClick={handleCreatePlan}
                className="bg-accent-action text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 text-md flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {isFemale ? 'חוללי תוכנית תזונה וכושר מותאמת אישית' : 'חולל תוכנית תזונה וכושר מותאמת אישית'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Fully generated plan screen!
  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background print:pr-0 print:pt-4" dir="rtl">
      <div className="p-xl max-w-5xl mx-auto print:max-w-full print:p-0">

        {/* Header Block */}
        <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/5 mb-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden print:hidden">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-secondary to-primary"></div>
          <div>
            <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">PREMIUM PLAN ACTIVE</span>
            <h2 className="font-heading text-3xl font-bold text-primary mt-2">תוכנית הבריאות המותאמת שלך</h2>
            <p className="text-on-surface-variant text-md mt-1">נבנתה בהתאמה אישית עבור {firstName} לפי תוצאות הבדיקה מתאריך {latestTest.test_date}</p>
          </div>
          <button
            onClick={handlePrint}
            className="border-2 border-primary/20 text-primary font-bold px-6 py-3 rounded-full hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            הדפס תוכנית
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 gap-md mb-lg print:hidden">
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`pb-4 px-4 font-heading text-lg font-bold transition-all border-b-4 flex items-center gap-2 ${activeTab === 'nutrition' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
          >
            <Salad className="w-5 h-5" />
            תפריט ותוכנית תזונה
          </button>
          <button
            onClick={() => setActiveTab('fitness')}
            className={`pb-4 px-4 font-heading text-lg font-bold transition-all border-b-4 flex items-center gap-2 ${activeTab === 'fitness' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-secondary'}`}
          >
            <Dumbbell className="w-5 h-5" />
            תוכנית אימונים וכושר
          </button>
        </div>

        {/* PRINT MODE HEADER (Visible only in print) */}
        <div className="hidden print:flex justify-between items-end border-b-2 border-primary pb-6 mb-8 text-right font-body" dir="rtl">
          <div>
            <h1 className="text-3xl font-black text-primary">OptiLife Clinic</h1>
            <p className="text-xs text-secondary font-bold tracking-widest">PERSONAL WELLNESS & CLINICAL INSIGHTS</p>
            <p className="text-[10px] text-slate-400 mt-1">דוח בריאות קליני ממוחשב - מבוסס בינה מלאכותית (AI)</p>
          </div>
          <div className="text-left font-semibold">
            <p className="text-sm text-slate-800">שם המטופל: <span className="font-bold">{firstName} {profile?.last_name || ''}</span></p>
            <p className="text-xs text-slate-500 mt-1">תאריך ביצוע הבדיקה: <span className="font-mono">{latestTest.test_date}</span></p>
            <p className="text-xs text-slate-500">תאריך הפקת הדוח: <span className="font-mono">{new Date().toLocaleDateString('he-IL')}</span></p>
          </div>
        </div>

        {/* Tab Contents: Nutrition */}
        <div className={activeTab === 'nutrition' ? 'space-y-lg print:block' : 'hidden print:block'}>
          <div className="space-y-lg">
            {/* General Recommendations */}
            <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/5 print:shadow-none print:border-slate-200 print:p-lg">
              <h3 className="font-heading text-xl font-bold text-primary mb-md flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary print:text-primary" />
                דגשים והמלצות תזונה לפי בדיקות הדם
              </h3>
              <p className="text-on-surface font-body leading-relaxed text-lg whitespace-pre-wrap print:text-sm">
                {actionPlan.nutrition_recommendations}
              </p>
            </div>

            {/* Diet Plan Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg print:grid-cols-2">
              {actionPlan.diet_plan.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-lg custom-shadow border border-outline/5 flex flex-col justify-between relative overflow-hidden print:shadow-none print:border-slate-200 print:break-inside-avoid">
                  <div className="absolute top-0 right-0 w-2 h-full bg-primary/20 print:hidden"></div>
                  <div>
                    <h4 className="font-heading text-xl font-bold text-primary mb-md flex items-center gap-2 print:text-md">
                      <span className="material-symbols-outlined text-primary text-xl">restaurant</span>
                      {item.meal}
                    </h4>
                    <ul className="space-y-sm text-on-surface font-body text-md mb-lg print:text-xs">
                      {item.suggestions.map((s, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2 pr-2">
                          <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5 print:text-primary print:w-4 print:h-4" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {item.why && (
                    <div className="bg-primary/5 rounded-xl p-md text-xs text-primary leading-relaxed print:bg-slate-50 print:border print:border-slate-100">
                      <span className="font-bold block mb-1">מדוע זה מומלץ עבורך:</span>
                      {item.why}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Contents: Fitness */}
        <div 
          className={`${activeTab === 'fitness' ? 'space-y-lg print:block' : 'hidden print:block'} print:break-before-page`}
          style={{ breakBefore: 'page' }}
        >
          <div className="space-y-lg">
            {/* General Recommendations */}
            <div className="bg-white rounded-3xl p-xl custom-shadow border border-outline/5 print:shadow-none print:border-slate-200 print:p-lg">
              <h3 className="font-heading text-xl font-bold text-secondary mb-md flex items-center gap-2 print:text-primary">
                <Flame className="w-5 h-5 text-accent-action animate-pulse print:hidden" />
                דגשי כושר והשפעה פיזיולוגית
              </h3>
              <p className="text-on-surface font-body leading-relaxed text-lg whitespace-pre-wrap print:text-sm">
                {actionPlan.fitness_recommendations}
              </p>
            </div>

            {/* Fitness Program Schedule */}
            <div className="bg-white rounded-3xl custom-shadow border border-outline/5 overflow-hidden print:shadow-none print:border-slate-200 print:rounded-2xl">
              <div className="p-lg bg-slate-50/50 border-b border-slate-100 print:bg-slate-50 print:border-slate-200">
                <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-secondary print:text-primary" />
                  סדר אימונים שבועי
                </h3>
              </div>
              <div className="divide-y divide-slate-100 text-right print:divide-slate-200">
                {actionPlan.workout_plan.map((item, idx) => {
                  const hasWorkout = item.duration !== "0 דקות" && item.duration !== "0" && item.intensity !== "אין";

                  return (
                    <div key={idx} className="p-lg flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/20 transition-colors print:break-inside-avoid print:py-md">
                      <div className="flex items-start gap-3 md:w-1/3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 print:w-10 print:h-10 ${hasWorkout ? 'bg-secondary/10 text-secondary print:bg-slate-100 print:text-primary' : 'bg-slate-100 text-slate-400'}`}>
                          <span className="font-bold text-sm print:text-xs">{item.day}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-primary text-md print:text-sm">{item.activity}</h4>
                          <span className="text-xs text-on-surface-variant print:text-[10px]">
                            {hasWorkout ? `${item.duration} | עצימות: ${item.intensity}` : 'מנוחה והתאוששות'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <ul className="list-disc list-inside space-y-1 text-sm text-on-surface-variant font-body pr-4 print:text-xs">
                          {item.exercises.map((ex, exIdx) => (
                            <li key={exIdx} className="leading-relaxed">{ex}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Medical Disclaimer under action plan */}
        <div className="mt-8 bg-amber-50/70 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3 text-right print:bg-slate-50 print:border-slate-200 print:text-[10px] print:p-4" dir="rtl">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5 print:text-slate-500 print:text-lg" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1 print:text-slate-800 print:text-[10px]">הבהרה רפואית חשובה:</h4>
            <p className="text-amber-800 text-[11px] leading-relaxed print:text-slate-600 print:text-[9px]">
              תוכנית הפעולה לעיל (תפריט התזונה ותוכנית האימונים) הופקה באופן אוטומטי על ידי מודל בינה מלאכותית (Gemini AI). מידע זה נועד להעשרה ולתמיכה בלבד ואינו מחליף ייעוץ רפואי, אבחנה או טיפול תזונתי מקצועי. חובה להתייעץ עם רופא או תזונאי מוסמך לפני התחלת כל פעילות גופנית או שינוי תזונתי משמעותי.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
