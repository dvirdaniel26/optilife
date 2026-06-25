import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { generateActionPlan } from '../lib/gemini';
import { Loader2, AlertCircle, Sparkles, Check, Flame, Salad, Printer, Dumbbell, Calendar, ShieldAlert, ChevronLeft, ChevronDown, Share2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ActionPlanPage() {
  const { profile, session, isPremium } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTestId = searchParams.get('testId');
  const isFemale = profile?.gender === 'female';

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestTest, setLatestTest] = useState(null);       // most recent analyzed test (for generating new plan)
  const [labResults, setLabResults] = useState([]);
  const [allPlans, setAllPlans] = useState([]);             // ALL action plans ever created
  const [selectedPlan, setSelectedPlan] = useState(null);   // currently viewed plan
  const [selectedPlanMeta, setSelectedPlanMeta] = useState(null); // {test_name, test_date} for selected plan
  const [viewMode, setViewMode] = useState('detail');       // 'list' or 'detail'
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('nutrition');
  const [totalPlans, setTotalPlans] = useState(0);

  const currentTier = profile?.subscription_tier || 'free';
  const isCurrentlyStandard = currentTier === 'standard' || currentTier.startsWith('standard_cancelled:');
  const isAllowedToGenerate = isPremium || (isCurrentlyStandard && totalPlans < 1);

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

      // 1. Fetch analyzed test (either requested test or the newest test if none requested)
      let testQuery = supabase
        .from('medical_tests')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['completed', 'נותח']);

      if (requestedTestId) {
        testQuery = testQuery.eq('id', requestedTestId);
      } else {
        testQuery = testQuery.order('test_date', { ascending: false }).limit(1);
      }

      const { data: test } = await testQuery;

      if (test && test.length > 0) {
        const activeTest = test[0];
        setLatestTest(activeTest);
        const { data: results } = await supabase
          .from('lab_results')
          .select('*')
          .eq('test_id', activeTest.id);
        setLabResults(results || []);
      }

      // 2. Fetch ALL action plans created by this user
      const { data: insights } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', session.user.id)
        .like('summary_text', 'ACTION_PLAN:%')
        .order('id', { ascending: false });

      if (insights && insights.length > 0) {
        setTotalPlans(insights.length);

        // For each plan, fetch its associated test metadata
        const plansWithMeta = await Promise.all(
          insights.map(async (insight) => {
            let parsedPlan = null;
            try {
              parsedPlan = JSON.parse(insight.summary_text.replace('ACTION_PLAN:', ''));
            } catch (e) {
              console.error('Error parsing plan:', e);
            }

            const { data: testMeta } = await supabase
              .from('medical_tests')
              .select('test_name, test_date')
              .eq('id', insight.test_id)
              .in('status', ['completed', 'נותח'])
              .maybeSingle();

            return {
              insightId: insight.id,
              testId: insight.test_id,
              plan: parsedPlan,
              testName: testMeta?.test_name || 'בדיקת דם',
              testDate: testMeta?.test_date || '',
            };
          })
        );

        const validPlans = plansWithMeta
          .filter(p => p.plan !== null)
          .sort((a, b) => {
             const dateA = new Date(a.testDate).getTime();
             const dateB = new Date(b.testDate).getTime();
             if (dateA !== dateB) {
                return dateB - dateA; // Sort by test date descending
             }
             return b.insightId - a.insightId; // Fallback to insightId descending
          });
        
        setAllPlans(validPlans);

        // Default: show the requested plan, or the most recent plan
        if (validPlans.length > 0) {
          if (!requestedTestId && validPlans.length > 1) {
            setViewMode('list');
          } else {
            setViewMode('detail');
          }
          
          let planToSelect = validPlans[0];
          if (requestedTestId) {
             const requestedPlan = validPlans.find(p => p.testId === requestedTestId);
             if (requestedPlan) planToSelect = requestedPlan;
          }
          setSelectedPlan(planToSelect.plan);
          setSelectedPlanMeta({ testName: planToSelect.testName, testDate: planToSelect.testDate });
        }
      } else {
        setTotalPlans(0);
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
  }, [session, requestedTestId]);

  const handleCreatePlan = async () => {
    if (!isAllowedToGenerate) { navigate('/pricing'); return; }
    if (!latestTest || labResults.length === 0) return;

    // Block: check if a plan already exists for this test
    const existingForTest = allPlans.find(p => p.testId === latestTest.id);
    if (existingForTest) {
      // Just switch to that plan
      setSelectedPlan(existingForTest.plan);
      setSelectedPlanMeta({ testName: existingForTest.testName, testDate: existingForTest.testDate });
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const plan = await generateActionPlan(labResults, profile);
      const serializedPlan = `ACTION_PLAN:${JSON.stringify(plan)}`;
      const { error: insertErr } = await supabase
        .from('ai_insights')
        .insert([{ test_id: latestTest.id, user_id: session.user.id, summary_text: serializedPlan }]);

      if (insertErr) throw insertErr;

      addNotification({
        type: 'plan',
        title: 'תוכנית הבריאות האישית שלך מוכנה! ✨',
        message: 'הבינה המלאכותית יצרה עבורך תפריט תזונתי מפורט ותוכנית אימונים אישית על בסיס בדיקת הדם האחרונה.',
        link: '/plan'
      });

      // Refresh to get the new plan in the list
      await fetchData();
    } catch (err) {
      console.error('Error generating action plan:', err);
      setError(err.message || (isFemale ? 'אירעה שגיאה במהלך יצירת התוכנית. אנא נסי שוב.' : 'אירעה שגיאה במהלך יצירת התוכנית. אנא נסה שוב.'));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <Loader2 className="w-12 h-12 text-secondary animate-spin" />
          <p className="text-on-surface-variant font-semibold">טוען את תוכנית הבריאות שלך...</p>
        </div>
      </main>
    );
  }

  // ── Generating ───────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-6 w-full max-w-md mx-auto text-center pt-20">
          <div className="bg-white rounded-3xl p-10 custom-shadow border border-slate-100 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-secondary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
              </div>
            </div>
            <h3 className="font-heading text-2xl font-bold text-primary mb-3">יוצר את תוכנית הבריאות...</h3>
            <p className="text-on-surface-variant font-medium text-sm transition-all duration-500 animate-pulse leading-relaxed">
              {steps[loadingStep]}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Free tier gate (no plan exists) ─────────────────────────────────────
  const isFreeTier = !isPremium && !isCurrentlyStandard && allPlans.length === 0;
  if (isFreeTier) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 filter blur-[6px] opacity-20 select-none pointer-events-none p-8 max-w-5xl mx-auto space-y-6 mt-16" dir="rtl">
          <h1 className="font-heading text-3xl text-primary font-bold">תוכנית הבריאות האישית שלך</h1>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-3">
            <h3 className="font-heading text-xl font-bold text-primary">דגשים והמלצות תזונה לפי בדיקות הדם</h3>
            <p className="text-on-surface leading-relaxed text-lg">לאור רמות הגלוקוז והכולסטרול שנמדדו, מומלץ להקפיד על תזונה עשירה בסיבים מסיסים...</p>
          </div>
        </div>
        <div className="p-md w-full max-w-4xl mx-auto text-center relative z-10 mt-6 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-xl custom-shadow border border-outline/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-secondary to-primary" />
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-lg text-secondary">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>
            
            <h2 className="font-heading text-3xl md:text-4xl text-primary font-bold mb-md">
              תוכנית פעולה אישית (Action Plan)
            </h2>
            <p className="text-on-surface-variant text-lg w-full max-w-2xl mx-auto mb-xl leading-relaxed">
              תוכנית הבריאות האישית זמינה למסלול מתקדם ומעלה. ה-AI שלנו יבנה עבורך תפריט תזונתי מפורט ותוכנית כושר שבועית מותאמת אישית לפי תוצאות הבדיקה.
            </p>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl text-right">
              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                  <Salad className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">תפריט תזונה מותאם</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    בניית תפריט תזונה יומי קליני לתיקון החוסרים שלך בדם.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">תוכנית אימונים שבועית</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    התאמת תוכנית כושר ליעדים שלך ולמצבך הרפואי.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 text-indigo-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">מבוסס בדיקות דם</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    התוכנית כולה נבנית באופן מדעי לפי תוצאות המעבדה המדויקות שלך.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">יעדים ומעקב</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    יצירת יעדים שבועיים קטנים ומדידים שניתן לעמוד בהם בקלות.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-md justify-center items-center mt-xl border-t border-slate-100 pt-xl">
              <button onClick={() => navigate('/pricing')} className="bg-[#FFE24B] hover:bg-[#FFD700] text-[#1D1B20] font-black text-lg py-4 px-10 rounded-full w-full sm:w-auto shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-0">
                <Sparkles className="w-5 h-5" />
                <span>שדרג עכשיו</span>
              </button>
              <button onClick={() => navigate('/pricing')} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold text-lg py-4 px-8 rounded-full w-full sm:w-auto transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer bg-transparent">
                <span>צפה בכל החבילות</span>
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── No test analyzed yet ─────────────────────────────────────────────────
  if (!latestTest) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-6 w-full max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-10 custom-shadow border border-outline/10 text-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary/40 text-4xl">science</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-primary mb-3">טרם זוהו תוצאות מעבדה</h2>
            <p className="text-on-surface-variant text-base max-w-md mx-auto mb-8 leading-relaxed">
              כדי לבנות עבורך תפריט תזונתי ותוכנית אימונים מותאמת אישית, עלינו קודם לנתח לפחות בדיקת דם אחת.
            </p>
            <button onClick={() => navigate('/upload')} className="bg-accent-action text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-all active:scale-95 text-base border-0 cursor-pointer">
              {isFemale ? 'העלי בדיקת דם כעת' : 'העלה בדיקת דם כעת'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── No plan yet — generation CTA ────────────────────────────────────────
  if (allPlans.length === 0 || (requestedTestId && !allPlans.some(p => p.testId === requestedTestId))) {
    const abnormalCount = labResults.filter(r => r.is_abnormal).length;
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background" dir="rtl">
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-heading text-3xl font-black text-primary">תוכנית הבריאות</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold">תפריט תזונה ואימונים מותאם אישית לפי בדיקות הדם שלך</p>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 custom-shadow border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              <div>
                <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {currentTier === 'standard' ? 'מסלול מתקדם 🌟' : currentTier === 'premium' ? 'מסלול מקצועי ✨' : 'מסלול אולטימטיבי ⚡'}
                </span>
                <h2 className="font-heading text-2xl font-bold text-primary mt-3">תוכנית בריאות וכושר אישית</h2>
                <p className="text-on-surface-variant text-sm mt-1">על בסיס בדיקת הדם מתאריך {new Date(latestTest.test_date).toLocaleDateString('he-IL')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-primary/5 text-primary text-xs font-semibold px-3 py-1.5 rounded-xl">{labResults.length} מדדים שזוהו</span>
                {abnormalCount > 0 && <span className="bg-status-error/10 text-status-error text-xs font-bold px-3 py-1.5 rounded-xl">{abnormalCount} מדדים חריגים</span>}
              </div>
            </div>

            <div className="bg-gradient-to-br from-secondary/5 to-primary/5 border border-secondary/10 rounded-2xl p-6">
              {isAllowedToGenerate ? (
                <>
                  <h3 className="font-bold text-primary text-lg mb-2">{isFemale ? 'מוכנה להרכיב את התוכנית?' : 'מוכן להרכיב את התוכנית?'}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
                    ה-AI שלנו ישלב את ממצאי המעבדה ויבנה תפריט תזונה ממוקד ותוכנית אימונים מפורטת. כל הרכיבים יותאמו כדי להחזיר את המדדים החריגים לטווח הנורמה.
                  </p>
                  <button onClick={handleCreatePlan} className="bg-accent-action text-primary font-bold px-7 py-3.5 rounded-full shadow hover:shadow-md transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2 border-0 cursor-pointer">
                    <Sparkles className="w-4 h-4" />
                    {isFemale ? 'חוללי תוכנית תזונה וכושר מותאמת' : 'חולל תוכנית תזונה וכושר מותאמת'}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <div className="flex items-center gap-2 text-amber-600 font-bold">
                    <ShieldAlert className="w-5 h-5" />
                    <h3>הגעת למגבלת יצירת תוכניות הבריאות</h3>
                  </div>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    מסלול מתקדם מוגבל לתוכנית אחת בלבד. {isFemale ? 'שדרגי' : 'שדרג'} למסלול מקצועי או אולטימטיבי לתוכניות ללא הגבלה!
                  </p>
                  <button onClick={() => navigate('/pricing')} className="bg-primary text-white font-bold px-7 py-3 rounded-full shadow hover:shadow-md transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2 cursor-pointer border-0">
                    <Sparkles className="w-4 h-4 text-accent-action fill-accent-action" />
                    שדרג את המנוי
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── Plan exists — display it ─────────────────────────────────────────────
  const latestTestHasPlan = allPlans.some(p => p.testId === latestTest?.id);

  if (viewMode === 'list') {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background transition-all" dir="rtl">
        <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="font-heading text-3xl font-black text-primary">תוכניות הבריאות שלי</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold">בחרי את התוכנית שברצונך להציג</p>
          </div>
          
          <div className="bg-white rounded-3xl custom-shadow border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
              {allPlans.map((p, idx) => (
                <div 
                  key={p.insightId}
                  onClick={() => {
                    setSelectedPlan(p.plan);
                    setSelectedPlanMeta({ testName: p.testName, testDate: p.testDate });
                    setViewMode('detail');
                  }}
                  className={`flex items-center justify-between px-6 py-5 transition-all duration-200 cursor-pointer group ${idx === 0 ? 'bg-secondary/5 hover:bg-secondary/10' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${idx === 0 ? 'bg-secondary/20 text-secondary' : 'bg-primary/5 text-primary'}`}>
                      <span className="material-symbols-outlined text-2xl">{idx === 0 ? 'star' : 'assignment'}</span>
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-0.5 ${idx === 0 ? 'text-secondary' : 'text-primary group-hover:text-secondary'}`}>
                        {p.testName} {idx === 0 && <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded-full mr-2 align-middle font-normal">העדכנית ביותר</span>}
                      </h3>
                      <p className="text-sm text-on-surface-variant flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {new Date(p.testDate).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-secondary transition-colors" dir="ltr">chevron_left</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background print:pr-0 print:pt-4" dir="rtl">
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto print:max-w-full print:p-0 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {allPlans.length > 1 && (
                <button 
                  onClick={() => setViewMode('list')}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border-0 cursor-pointer shrink-0"
                  title="חזור לרשימת התוכניות"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              )}
              <h1 className="font-heading text-3xl font-black text-primary">תוכנית הבריאות</h1>
            </div>
            <p className="text-on-surface-variant text-sm mt-0.5 font-semibold pr-1">
              {selectedPlanMeta
                ? `${selectedPlanMeta.testName} — ${new Date(selectedPlanMeta.testDate).toLocaleDateString('he-IL')}`
                : 'תוכנית מותאמת אישית לפי בדיקות הדם'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary border border-slate-200 hover:border-slate-300 bg-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer">
              <Printer className="w-4 h-4" /> הדפס
            </button>
            <button 
              onClick={async () => {
                const shareData = {
                  title: 'תוכנית הבריאות שלי ב-OptiLife',
                  text: 'הנה תוכנית התזונה והאימונים המותאמת אישית שלי מ-OptiLife!',
                  url: window.location.href,
                };
                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                  try {
                    await navigator.share(shareData);
                  } catch (e) {
                    console.error('Error sharing', e);
                  }
                } else {
                  const text = encodeURIComponent(shareData.text + '\n' + shareData.url);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }
              }}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> שתף
            </button>
            {!latestTestHasPlan && isAllowedToGenerate && (
              <button onClick={handleCreatePlan} className="flex items-center gap-1.5 bg-accent-action text-primary font-bold text-xs px-4 py-2 rounded-xl shadow hover:shadow-md transition-all hover:scale-105 active:scale-95 border-0 cursor-pointer">
                <Sparkles className="w-4 h-4" /> צור תוכנית לבדיקה החדשה
              </button>
            )}
          </div>
        </div>

        {/* ── Plan Selector (if multiple plans) ── */}
        {allPlans.length > 1 && (
          <div className="relative print:hidden">
            <button
              onClick={() => setPlanSelectorOpen(!planSelectorOpen)}
              className="flex items-center justify-between w-full sm:w-auto min-w-[300px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-right shadow-sm hover:border-secondary/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">assignment</span>
                </span>
                <div>
                  <p className="text-xs text-on-surface-variant font-semibold">תוכנית מוצגת</p>
                  <p className="text-sm font-bold text-primary">
                    {selectedPlanMeta?.testName || 'בדיקת דם'} — {selectedPlanMeta?.testDate ? new Date(selectedPlanMeta.testDate).toLocaleDateString('he-IL') : ''}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${planSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {planSelectorOpen && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 min-w-[300px] overflow-hidden">
                {allPlans.map((p, idx) => (
                  <button
                    key={p.insightId}
                    onClick={() => {
                      setSelectedPlan(p.plan);
                      setSelectedPlanMeta({ testName: p.testName, testDate: p.testDate });
                      setPlanSelectorOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-right hover:bg-slate-50 transition-colors cursor-pointer border-0
                      ${idx < allPlans.length - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    <span className="w-8 h-8 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-primary">{p.testName}</p>
                      <p className="text-xs text-on-surface-variant">{p.testDate ? new Date(p.testDate).toLocaleDateString('he-IL') : ''}</p>
                    </div>
                    {selectedPlanMeta?.testDate === p.testDate && (
                      <Check className="w-4 h-4 text-secondary mr-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Gradient Header Card ── */}
        <div className="bg-gradient-to-l from-secondary/5 via-white to-primary/5 rounded-3xl p-5 md:p-6 custom-shadow border border-secondary/10 relative overflow-hidden print:hidden">
          <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-secondary to-primary" />
          <div className="flex flex-wrap items-center gap-2 mb-1 pr-2">
            <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {currentTier === 'standard' ? '🌟 מסלול מתקדם' : currentTier === 'premium' ? '✨ מסלול מקצועי' : '⚡ מסלול אולטימטיבי'}
            </span>
          </div>
          <h2 className="font-heading text-xl font-bold text-primary pr-2">תוכנית הבריאות המותאמת שלך</h2>
          <p className="text-on-surface-variant text-xs mt-1 font-semibold pr-2">
            נבנתה עבור {firstName} לפי תוצאות הבדיקה
            {selectedPlanMeta?.testDate ? ` מתאריך ${new Date(selectedPlanMeta.testDate).toLocaleDateString('he-IL')}` : ''}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-2xl w-full sm:w-fit print:hidden">
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-0
              ${activeTab === 'nutrition' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-primary bg-transparent'}`}
          >
            <Salad className="w-4 h-4" /> תזונה
          </button>
          <button
            onClick={() => setActiveTab('fitness')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-0
              ${activeTab === 'fitness' ? 'bg-white shadow text-secondary' : 'text-on-surface-variant hover:text-secondary bg-transparent'}`}
          >
            <Dumbbell className="w-4 h-4" /> אימונים
          </button>
        </div>

        {/* ── Print header ── */}
        <div className="hidden print:flex justify-between items-end border-b-2 border-primary pb-6 mb-8 text-right" dir="rtl">
          <div>
            <h1 className="text-3xl font-black text-primary">OptiLife</h1>
            <p className="text-xs text-secondary font-bold tracking-widest">PERSONAL WELLNESS PLAN</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-slate-800">{firstName} {profile?.last_name || ''}</p>
            <p className="text-xs text-slate-500 mt-1">{selectedPlanMeta?.testDate}</p>
          </div>
        </div>

        {/* ── Nutrition Tab ── */}
        {(activeTab === 'nutrition' || true) && (
          <div className={activeTab === 'nutrition' ? 'space-y-5 print:block' : 'hidden print:block'}>
            {/* General recs */}
            <div className="bg-white rounded-3xl p-5 md:p-6 custom-shadow border border-slate-100">
              <h3 className="font-heading text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
                דגשים והמלצות תזונה לפי בדיקות הדם
              </h3>
              <p className="text-on-surface font-body leading-relaxed text-sm whitespace-pre-wrap">
                {selectedPlan?.nutrition_recommendations}
              </p>
            </div>

            {/* Meal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedPlan?.diet_plan?.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 custom-shadow border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-primary/25" />
                  <h4 className="font-heading text-base font-bold text-primary mb-3 flex items-center gap-2 pr-2">
                    <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
                    {item.meal}
                  </h4>
                  <ul className="space-y-1.5 mb-4 pr-1">
                    {item.suggestions?.map((s, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2 text-sm text-on-surface">
                        <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                  {item.why && (
                    <div className="bg-primary/5 rounded-xl p-3 text-xs text-primary leading-relaxed">
                      <span className="font-bold block mb-0.5">מדוע זה מומלץ עבורך:</span>
                      {item.why}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Fitness Tab ── */}
        {(activeTab === 'fitness' || true) && (
          <div className={activeTab === 'fitness' ? 'space-y-5 print:block' : 'hidden print:block'}>
            {/* General recs */}
            <div className="bg-white rounded-3xl p-5 md:p-6 custom-shadow border border-slate-100">
              <h3 className="font-heading text-lg font-bold text-secondary mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </span>
                דגשי כושר והשפעה פיזיולוגית
              </h3>
              <p className="text-on-surface font-body leading-relaxed text-sm whitespace-pre-wrap">
                {selectedPlan?.fitness_recommendations}
              </p>
            </div>

            {/* Weekly schedule */}
            <div className="bg-white rounded-3xl custom-shadow border border-slate-100 overflow-hidden">
              <div className="px-5 md:px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                <h3 className="font-heading text-base font-bold text-primary">סדר אימונים שבועי</h3>
              </div>
              <div className="divide-y divide-slate-50 text-right">
                {selectedPlan?.workout_plan?.map((item, idx) => {
                  const hasWorkout = item.duration !== '0 דקות' && item.duration !== '0' && item.intensity !== 'אין';
                  return (
                    <div key={idx} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center gap-3 sm:w-44 shrink-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
                          ${hasWorkout ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-400'}`}>
                          {item.day}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{item.activity}</p>
                          <p className="text-xs text-on-surface-variant">{hasWorkout ? `${item.duration} | ${item.intensity}` : 'מנוחה'}</p>
                        </div>
                      </div>
                      <ul className="flex-1 space-y-1 pr-2 sm:pr-0">
                        {item.exercises?.map((ex, exIdx) => (
                          <li key={exIdx} className="text-xs text-on-surface-variant flex items-start gap-1.5">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3 text-right" dir="rtl">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1">הבהרה רפואית חשובה:</h4>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              תוכנית הפעולה לעיל הופקה באופן אוטומטי על ידי מודל בינה מלאכותית (Gemini AI). מידע זה נועד להעשרה בלבד ואינו מחליף ייעוץ רפואי, אבחנה או טיפול מקצועי. חובה להתייעץ עם רופא או תזונאי מוסמך לפני כל שינוי תזונתי או גופני.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
