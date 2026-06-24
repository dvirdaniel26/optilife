import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Salad, 
  Dumbbell, 
  Sparkles, 
  Scale, 
  Heart, 
  Calendar, 
  ChevronLeft, 
  CheckCircle2, 
  TrendingUp,
  Flame,
  Lock,
  Target,
  Trophy,
  Moon,
  Droplets,
  Apple
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function OverviewPage() {
  const { profile, session } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const navigate = useNavigate();
  const isFemale = profile?.gender === 'female';
  
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    glucose: { value: '--', status: 'אין נתונים', unit: 'mg/dL', statusClass: 'bg-slate-100 text-on-surface-variant' },
    cholesterol: { value: '--', status: 'אין נתונים', unit: 'mg/dL', statusClass: 'bg-slate-100 text-on-surface-variant' },
    hemoglobin: { value: '--', status: 'אין נתונים', unit: 'g/dL', statusClass: 'bg-slate-100 text-on-surface-variant' }
  });
  const [activeMetricTab, setActiveMetricTab] = useState('glucose');
  const [historyData, setHistoryData] = useState({
    glucose: [],
    cholesterol: [],
    hemoglobin: []
  });

  // --- New states for Redesign ---
  const [abnormalMarkers, setAbnormalMarkers] = useState([]);
  const [actionPlan, setActionPlan] = useState(null);
  const [latestLabResults, setLatestLabResults] = useState([]);
  const [wellnessHistory, setWellnessHistory] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);

  // --- BMI & Body Metrics State ---
  const [bodyMetrics, setBodyMetrics] = useState({
    height: '',
    weight: '',
    bodyFat: '',
    gender: '', // 'male' | 'female'
    bmi: null,
    category: 'אין נתונים',
    categoryClass: 'bg-slate-100 text-on-surface-variant'
  });
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [inputHeight, setInputHeight] = useState('');
  const [inputWeight, setInputWeight] = useState('');
  const [inputBodyFat, setInputBodyFat] = useState('');
  const [inputGender, setInputGender] = useState('');

  useEffect(() => {
    const fetchRecentTestsAndMetrics = async () => {
      if (!session?.user?.id) return;
      try {
        const { data: tests, error: testsError } = await supabase
          .from('medical_tests')
          .select('*')
          .eq('user_id', session.user.id)
          .in('status', ['completed', 'נותח'])
          .order('test_date', { ascending: false });
          
        if (testsError) throw testsError;
        setRecentTests(tests || []);
        
        if (tests && tests.length > 0) {
          const latestTest = tests[0];
          
          // 1. Fetch metrics from latest test
          const { data: results, error: resultsError } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', latestTest.id);
            
          if (resultsError) throw resultsError;
          
          setLatestLabResults(results || []);
          if (results && results.length > 0) {
            const abnormal = results.filter(r => r.is_abnormal);
            setAbnormalMarkers(abnormal);

            const findMarker = (names) => {
              return results.find(r => 
                names.some(name => r.marker_name.toLowerCase().includes(name.toLowerCase()))
              );
            };
            
            const gluc = findMarker(['glucose', 'גלוקוז']);
            const chol = findMarker(['cholesterol', 'כולסטרול']);
            const hemo = findMarker(['hemoglobin', 'המוגלובין', 'hb']);
            
            // If the hardcoded markers are not found, pick other available markers
            let finalGluc = gluc;
            let finalChol = chol;
            let finalHemo = hemo;
            
            const unusedMarkers = results.filter(r => r !== gluc && r !== chol && r !== hemo);
            
            if (!finalGluc && unusedMarkers.length > 0) finalGluc = unusedMarkers.shift();
            if (!finalChol && unusedMarkers.length > 0) finalChol = unusedMarkers.shift();
            if (!finalHemo && unusedMarkers.length > 0) finalHemo = unusedMarkers.shift();

            const createMetricObj = (marker, defaultUnit) => ({
              value: marker ? marker.measured_value : '--',
              status: marker ? (marker.is_abnormal ? 'חורג מהנורמה' : 'מאוזן') : 'אין נתונים',
              unit: marker ? marker.unit : defaultUnit,
              statusClass: marker ? (marker.is_abnormal ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success') : 'bg-slate-100 text-on-surface-variant',
              label: marker ? marker.marker_name : ''
            });

            setMetrics({
              glucose: createMetricObj(finalGluc, 'mg/dL'),
              cholesterol: createMetricObj(finalChol, 'mg/dL'),
              hemoglobin: createMetricObj(finalHemo, 'g/dL')
            });
          }

          // 2. Fetch latest AI action plan from table for this specific test
          const { data: insights, error: insightsErr } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('test_id', latestTest.id)
            .like('summary_text', 'ACTION_PLAN:%')
            .order('id', { ascending: false })
            .limit(1);

          if (!insightsErr && insights && insights.length > 0) {
            try {
              const rawJson = insights[0].summary_text.replace('ACTION_PLAN:', '');
              const parsedPlan = JSON.parse(rawJson);
              setActionPlan(parsedPlan);
            } catch (e) {
              console.error('Error parsing plan in dashboard:', e);
            }
          }

          // 3. Fetch History from all tests
          const testIds = tests.map(t => t.id);
          const { data: allResults, error: allResultsError } = await supabase
            .from('lab_results')
            .select('test_id, measured_value, marker_name, is_abnormal')
            .in('test_id', testIds);
            
          if (!allResultsError && allResults) {
            const newHistoryData = {
              glucose: [],
              cholesterol: [],
              hemoglobin: []
            };

            const findCategory = (markerName) => {
              if (!markerName) return null;
              const name = markerName.toLowerCase();
              if (name.includes('glucose') || name.includes('גלוקוז')) return 'glucose';
              if (name.includes('cholesterol') || name.includes('כולסטרול')) return 'cholesterol';
              if (name.includes('hemoglobin') || name.includes('המוגלובין') || name.includes('hb')) return 'hemoglobin';
              return null;
            };

            allResults.forEach(r => {
              const category = findCategory(r.marker_name);
              if (category) {
                const test = tests.find(t => t.id === r.test_id);
                if (test) {
                  newHistoryData[category].push({
                    value: Number(r.measured_value),
                    dateStr: test.test_date,
                    isAbnormal: !!r.is_abnormal,
                    label: new Date(test.test_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
                  });
                }
              }
            });

            // Sort each category by date ascending
            Object.keys(newHistoryData).forEach(key => {
              newHistoryData[key].sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
            });

            setHistoryData(newHistoryData);
          }
          
          // 4. Fetch Wellness History (Last 7 days)
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          const { data: wellnessData } = await supabase
            .from('wellness_tracking')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('date', lastWeek.toISOString().split('T')[0])
            .order('date', { ascending: true });
            
          if (wellnessData) {
            setWellnessHistory(wellnessData.map(w => ({
              ...w,
              label: new Date(w.date).toLocaleDateString('he-IL', { weekday: 'short' })
            })));
          }
          
          // 5. Fetch Active Challenge
          const { data: challengeData } = await supabase
            .from('user_challenges')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (challengeData) {
            setActiveChallenge(challengeData);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentTestsAndMetrics();
  }, [session]);

  // Onboarding welcome notification
  useEffect(() => {
    if (profile && (!profile.first_name || !profile.last_name)) {
      const isFemale = profile?.gender === 'female';
      const alreadyNotified = localStorage.getItem('optilife_onboarding_notified');
      if (!alreadyNotified) {
        addNotification({
          type: 'welcome',
          title: isFemale ? 'ברוכות הבאות! אנא עדכני את פרטי הפרופיל 👤' : 'ברוכים הבאים! אנא עדכן את פרטי הפרופיל 👤',
          message: isFemale
            ? 'על מנת שנוכל להעניק לך חוויית שימוש מותאמת אישית ותובנות בריאות מובחרות, אנא היכנסי להגדרות והשלימי את פרטי הפרופיל.'
            : 'על מנת שנוכל להעניק לך חוויית שימוש מותאמת אישית ותובנות בריאות מובחרות, אנא היכנס להגדרות והשלם את פרטי הפרופיל.',
          link: '/settings'
        });
        localStorage.setItem('optilife_onboarding_notified', 'true');
      }
    }
  }, [profile, addNotification]);

  // Load body metrics from Supabase profile
  useEffect(() => {
    const loadBodyMetrics = () => {
      let h = '';
      let w = '';
      let bf = '';
      let g = '';

      if (profile) {
        if (profile.height) h = profile.height.toString();
        if (profile.weight) w = profile.weight.toString();
        if (profile.body_fat) bf = profile.body_fat.toString();
        if (profile.gender) g = profile.gender.toString();
      }

      if (h && w) {
        const heightInMeters = Number(h) / 100;
        const calculatedBmi = (Number(w) / (heightInMeters * heightInMeters)).toFixed(1);
        let cat = 'תקין';
        let catClass = 'bg-status-success/10 text-status-success';
        const bmiVal = Number(calculatedBmi);
        if (bmiVal < 18.5) {
          cat = 'תת-משקל';
          catClass = 'bg-amber-100 text-amber-700';
        } else if (bmiVal >= 25 && bmiVal < 30) {
          cat = 'משקל עודף';
          catClass = 'bg-amber-100 text-amber-700';
        } else if (bmiVal >= 30) {
          cat = 'השמנת יתר';
          catClass = 'bg-status-error/10 text-status-error';
        }
        
        setBodyMetrics({
          height: h,
          weight: w,
          bodyFat: bf,
          gender: g,
          bmi: calculatedBmi,
          category: cat,
          categoryClass: catClass
        });
      } else {
        setBodyMetrics({
          height: h,
          weight: w,
          bodyFat: bf,
          gender: g,
          bmi: null,
          category: 'אין נתונים',
          categoryClass: 'bg-slate-100 text-on-surface-variant'
        });
      }
    };
    
    loadBodyMetrics();
  }, [profile]);

  const openMetricsModal = () => {
    setInputHeight(bodyMetrics.height || '');
    setInputWeight(bodyMetrics.weight || '');
    setInputBodyFat(bodyMetrics.bodyFat || '');
    setInputGender(bodyMetrics.gender || '');
    setShowMetricsModal(true);
  };

  const handleSaveMetrics = async (e) => {
    e.preventDefault();
    if (!inputHeight || !inputWeight) {
      alert('יש להזין גובה ומשקל');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          height: Number(inputHeight),
          weight: Number(inputWeight),
          body_fat: inputBodyFat ? Number(inputBodyFat) : null
        })
        .eq('id', session?.user?.id);
        
      if (error) throw error;
    } catch (supabaseErr) {
      console.error("שגיאה בעדכון מדדי הגוף בשרת:", supabaseErr);
      alert(isFemale ? 'שגיאה בעדכון מדדי הגוף בשרת. אנא נסי שוב.' : 'שגיאה בעדכון מדדי הגוף בשרת. אנא נסה שוב.');
      return;
    }

    const heightInMeters = Number(inputHeight) / 100;
    const calculatedBmi = (Number(inputWeight) / (heightInMeters * heightInMeters)).toFixed(1);
    let cat = 'תקין';
    let catClass = 'bg-status-success/10 text-status-success';
    const bmiVal = Number(calculatedBmi);
    if (bmiVal < 18.5) {
      cat = 'תת-משקל';
      catClass = 'bg-amber-100 text-amber-700';
    } else if (bmiVal >= 25 && bmiVal < 30) {
      cat = 'משקל עודף';
      catClass = 'bg-amber-100 text-amber-700';
    } else if (bmiVal >= 30) {
      cat = 'השמנת יתר';
      catClass = 'bg-status-error/10 text-status-error';
    }

    setBodyMetrics(prev => ({
      ...prev,
      height: inputHeight,
      weight: inputWeight,
      bodyFat: inputBodyFat,
      bmi: calculatedBmi,
      category: cat,
      categoryClass: catClass
    }));

    addNotification({
      type: 'success',
      title: 'מדדי הגוף עודכנו בהצלחה! 🏃‍♂️',
      message: `גובה: ${inputHeight} ס"מ, משקל: ${inputWeight} ק"ג. ה-BMI המעודכן שלך הוא ${calculatedBmi}.`,
      link: '/dashboard'
    });
    setShowMetricsModal(false);
  };

  const getBmiPercentage = (bmi) => {
    if (!bmi) return 0;
    const bmiVal = Number(bmi);
    const minBmi = 15;
    const maxBmi = 35;
    const percentage = ((bmiVal - minBmi) / (maxBmi - minBmi)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const renderChartPath = (history) => {
    if (!history || history.length < 2) return '';
    const values = history.map(h => h.value);
    const min = Math.min(...values) - 10;
    const max = Math.max(...values) + 10;
    const range = max - min || 1;
    
    return history.map((h, i) => {
      const x = 465 - (i / (history.length - 1)) * 430;
      const y = 110 - ((h.value - min) / range) * 80;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getTodayWorkout = (workoutPlan) => {
    if (!workoutPlan || !Array.isArray(workoutPlan)) return null;
    const dayIndex = new Date().getDay();
    
    // Pattern to match Hebrew days (0 = Sunday, 1 = Monday, etc.)
    const dayPatterns = [
      /ראשון|יום\s+א/i,
      /שני|יום\s+ב/i,
      /שלישי|יום\s+ג/i,
      /רביעי|יום\s+ד/i,
      /חמישי|יום\s+ה/i,
      /שישי|יום\s+ו/i,
      /שבת|יום\s+ש/i
    ];
    
    const pattern = dayPatterns[dayIndex];
    
    const todayWorkout = workoutPlan.find(item => {
      const dayStr = (item.day || '').toLowerCase();
      return pattern.test(dayStr);
    });
    
    return todayWorkout || workoutPlan[dayIndex] || workoutPlan[0];
  };

  const getTodayDiet = (dietPlan) => {
    if (!dietPlan || !Array.isArray(dietPlan)) return [];
    return dietPlan;
  };

  const generateHealthTip = (abnormalList) => {
    if (!abnormalList || abnormalList.length === 0) {
      return "כל הכבוד! כל המדדים שנבדקו מאוזנים ובטווח הנורמה. המשך/י להקפיד על אורח חיים פעיל ותזונה נכונה כדי לשמור על ההישג.";
    }
    
    const names = abnormalList.map(m => (m.marker_name || '').toLowerCase());
    
    if (names.some(n => n.includes('glucose') || n.includes('גלוקוז') || n.includes('סוכר'))) {
      return "נראה שרמת הגלוקוז בדם דורשת תשומת לב. מומלץ לשלב סיבים תזונתיים בכל ארוחה (ירקות, שיבולת שועל, קטניות) ולבצע הליכה קלה של 15-20 דקות מיד לאחר הארוחות הגדולות לשיפור הרגישות לאינסולין.";
    }
    if (names.some(n => n.includes('cholesterol') || n.includes('כולסטרול') || n.includes('ldl'))) {
      return "רמות הכולסטרול שלך חורגות מעט מהנורמה. כדאי להעשיר את התזונה בשומנים חד-בלתי רווים (שמן זית, אבוקדו, אגוזים, טחינה) ולהפחית צריכת שומן רווי ומזונות מעובדים.";
    }
    if (names.some(n => n.includes('hemoglobin') || n.includes('המוגלובין') || n.includes('hb') || n.includes('iron') || n.includes('ברזל'))) {
      return "רמת ההמוגלובין או הברזל שלך נמוכה מהרגיל. כדאי לשלב מזונות עשירים בברזל מהחי (בשר רזה, דגים) או מהצומח (טחינה גולמית, קטניות) יחד עם מקור של ויטמין C (לימון, פלפל אדום) שמגביר את הספיגה.";
    }
    
    return `זוהו מדדים חורגים (${abnormalList.map(m => m.marker_name).join(', ')}). מומלץ לעיין בהמלצות התזונה והכושר המותאמות אישית בתוכנית הפעולה שלך כדי לעזור להם לחזור לטווח התקין.`;
  };

  const metricConfigs = {
    glucose: { label: 'גלוקוז', title: 'מגמת גלוקוז לאורך זמן', unit: 'mg/dL', badge: 'Glucose (mg/dL)' },
    cholesterol: { label: 'כולסטרול', title: 'מגמת כולסטרול לאורך זמן', unit: 'mg/dL', badge: 'Cholesterol (mg/dL)' },
    hemoglobin: { label: 'המוגלובין', title: 'מגמת המוגלובין לאורך זמן', unit: 'g/dL', badge: 'Hemoglobin (g/dL)' }
  };
  const activeHistory = historyData[activeMetricTab] || [];
  const currentMetric = metricConfigs[activeMetricTab];

  const currentTier = profile?.subscription_tier || 'free';
  const hasPlan = !!actionPlan;
  const todayWorkout = actionPlan ? getTodayWorkout(actionPlan.workout_plan) : null;
  const todayDiet = actionPlan ? getTodayDiet(actionPlan.diet_plan) : [];

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all bg-background" dir="rtl">
      <div className="p-xl max-w-6xl mx-auto">
        
        {/* Onboarding Alert for missing profile name */}
        {!loading && profile && (!profile.first_name || !profile.last_name) && (
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-200/60 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-2xl font-bold">person_edit</span>
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-amber-900">השלמת פרטי פרופיל נדרשת 👤</h4>
                <p className="text-sm text-amber-800 leading-relaxed mt-1">
                  על מנת שנוכל להעניק לך ניתוח מדויק ותובנות בריאותיות מותאמות אישית, אנא {profile?.gender === 'female' ? 'השלימי' : 'השלם'} את שמך הפרטי ושם משפחתך בהגדרות החשבון.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm whitespace-nowrap cursor-pointer border-0"
            >
              {profile?.gender === 'female' ? 'עדכני' : 'עדכן'} פרטים עכשיו
            </button>
          </div>
        )}

        {/* Welcome Hero Banner - Light Premium Theme */}
        <div className="relative overflow-hidden bg-gradient-to-l from-secondary/15 via-primary/5 to-white rounded-3xl p-6 md:p-8 text-primary mb-8 border border-secondary/10 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] pointer-events-none select-none"></div>
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] pointer-events-none select-none"></div>

          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full text-xs font-bold text-secondary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>מרחב בריאות אישי</span>
            </span>
            <h2 className="font-heading text-3xl font-black leading-tight text-primary">
              שלום, {firstName} 👋
            </h2>
            <p className="text-slate-650 font-body text-sm max-w-xl leading-relaxed font-semibold">
              המדדים הבריאותיים ותוכנית הפעולה שלך מעודכנים על בסיס בדיקת הדם האחרונה. {isFemale ? 'עקבי' : 'עקוב'} אחר היעדים היומיים כדי לשפר את החיוניות והאנרגיה.
            </p>
          </div>

          <button 
            onClick={() => navigate('/upload')} 
            className="relative z-10 bg-accent-action text-primary px-6 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer border-0 flex items-center gap-2 text-sm shrink-0 self-stretch md:self-auto justify-center"
          >
            <Activity className="w-4 h-4" />
            <span>{isFemale ? 'העלי בדיקה חדשה' : 'העלה בדיקה חדשה'}</span>
          </button>
        </div>

        {/* Top 3 Core Metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Glucose */}
          <div className="bg-white p-6 rounded-2xl custom-shadow border border-slate-100 hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary/5 text-secondary rounded-lg"><Activity className="w-5 h-5" /></div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${metrics.glucose.statusClass}`}>{metrics.glucose.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1 font-bold">{metrics.glucose.label || 'רמת גלוקוז (Glucose)'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{metrics.glucose.value}</span>
                <span className="text-on-surface-variant text-xs font-semibold">{metrics.glucose.unit}</span>
              </div>
            </div>
          </div>
          
          {/* Cholesterol */}
          <div className="bg-white p-6 rounded-2xl custom-shadow border border-slate-100 hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary/5 text-secondary rounded-lg"><Activity className="w-5 h-5" /></div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${metrics.cholesterol.statusClass}`}>{metrics.cholesterol.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1 font-bold">{metrics.cholesterol.label || 'כולסטרול כללי (Cholesterol)'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{metrics.cholesterol.value}</span>
                <span className="text-on-surface-variant text-xs font-semibold">{metrics.cholesterol.unit}</span>
              </div>
            </div>
          </div>
          
          {/* Hemoglobin */}
          <div className="bg-white p-6 rounded-2xl custom-shadow border border-slate-100 hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary/5 text-secondary rounded-lg"><Activity className="w-5 h-5" /></div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${metrics.hemoglobin.statusClass}`}>{metrics.hemoglobin.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1 font-bold">{metrics.hemoglobin.label || 'המוגלובין (Hemoglobin)'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{metrics.hemoglobin.value}</span>
                <span className="text-on-surface-variant text-xs font-semibold">{metrics.hemoglobin.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column main Grid container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content Area (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Today's Action Plan Focus Card */}
            {hasPlan ? (
              <div className="bg-white rounded-3xl p-6 md:p-8 custom-shadow border border-slate-100 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-secondary to-primary"></div>
                
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-secondary/10 text-secondary rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </span>
                    <h3 className="font-heading text-xl font-bold text-primary">מיקוד תוכנית הפעולה להיום</h3>
                  </div>
                  <button 
                    onClick={() => navigate('/plan?testId=' + recentTests[0]?.id)} 
                    className="text-secondary text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                  >
                    <span>לתוכנית המלאה</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Nutrition Section */}
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="font-heading text-base font-bold text-primary flex items-center gap-2 border-b border-slate-100/60 pb-2">
                        <Salad className="w-5 h-5 text-secondary" />
                        <span>תזונה מומלצת להיום</span>
                      </h4>
                      
                      <div className="space-y-3">
                        {todayDiet.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <span className="text-xs font-extrabold text-secondary block">{item.meal}</span>
                            <p className="text-xs font-semibold text-primary leading-relaxed line-clamp-2">
                              {item.suggestions?.[0] || 'הקפדה על ארוחה מזינה דלת פחמימות'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100/50 text-[10px] text-on-surface-variant flex items-start gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="leading-tight">התזונה הותאמה כדי לאזן את רמות המדדים שלך.</span>
                    </div>
                  </div>

                  {/* Fitness Section */}
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="font-heading text-base font-bold text-primary flex items-center gap-2 border-b border-slate-100/60 pb-2">
                        <Dumbbell className="w-5 h-5 text-primary animate-pulse" />
                        <span>אימון ופעילות להיום</span>
                      </h4>
                      
                      {todayWorkout ? (
                        <div className="space-y-2">
                          <span className="text-xs font-extrabold text-primary block">{todayWorkout.day} - {todayWorkout.activity}</span>
                          <div className="flex flex-wrap gap-2 text-[10px] text-on-surface-variant font-bold">
                            <span className="bg-primary/5 px-2 py-0.5 rounded-full">משך: {todayWorkout.duration}</span>
                            {todayWorkout.intensity && todayWorkout.intensity !== 'אין' && (
                              <span className="bg-secondary/5 px-2 py-0.5 rounded-full text-secondary">עצימות: {todayWorkout.intensity}</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed truncate-2-lines pt-1">
                            {todayWorkout.exercises?.[0] || 'מנוחה והתאוששות'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface-variant">מנוחה והתאוששות. תן לגוף זמן להחלים.</p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100/50 text-[10px] text-on-surface-variant flex items-start gap-1">
                      <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="leading-tight">הקפדה על אימונים משפרת את זרימת הדם והמדדים הכלליים.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Promotion for Action Plan
              currentTier !== 'free' && currentTier !== 'free_trial' ? (
                // Upgraded subscriber but no plan yet
                <div className="bg-white rounded-3xl p-6 md:p-8 custom-shadow border border-slate-100 relative overflow-hidden text-center space-y-6">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-secondary to-primary"></div>
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-secondary">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading text-2xl font-bold text-primary">תוכנית הפעולה האישית שלך ממתינה</h3>
                    <p className="text-on-surface-variant text-sm max-w-lg mx-auto leading-relaxed">
                      כמשתמש במסלול משודרג, מגיעה לך תוכנית בריאות וכושר מותאמת אישית מבוססת AI שתסייע לאזן את המדדים החריגים שלך.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/plan?testId=' + recentTests[0]?.id)}
                    className="bg-secondary hover:bg-secondary/95 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-secondary/20 transition-all hover:scale-105 active:scale-95 text-sm cursor-pointer border-0 inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-accent-action fill-accent-action" />
                    <span>צור תוכנית בריאות אישית כעת</span>
                  </button>
                </div>
              ) : (
                // Free user upgrade promotion - Light Premium Theme
                <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-white rounded-3xl p-6 md:p-8 text-primary relative overflow-hidden shadow-md border border-secondary/10">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-secondary/10 rounded-full blur-[50px] pointer-events-none select-none"></div>
                  <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-primary/10 rounded-full blur-[40px] pointer-events-none select-none"></div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full text-[10px] font-extrabold text-secondary">
                        <Flame className="w-3.5 h-3.5 animate-pulse" />
                        <span>שדרג לתוכנית פעולה מותאמת אישית</span>
                      </span>
                      <h3 className="font-heading text-xl font-bold text-primary">פתח תוכנית תזונה וכושר מבוססת AI</h3>
                      <p className="text-slate-650 font-body text-xs max-w-xl leading-relaxed font-semibold">
                        רוצה לקחת את הבריאות בידיים? שדרג את המנוי לקבלת תפריט יומי ותוכנית אימונים שבועית מפורטת, שתוכננו במיוחד עבור מדדי הדם והרכבי הגוף שלך כדי להחזיר אותם לנורמה.
                      </p>
                    </div>
                    
                    <button
                      onClick={() => navigate('/pricing')}
                      className="bg-secondary hover:bg-secondary/95 text-white font-bold px-6 py-3 rounded-full shadow-md hover:shadow-secondary/15 transition-all hover:scale-105 active:scale-95 text-sm border-0 cursor-pointer self-stretch md:self-auto text-center shrink-0"
                    >
                      {isFemale ? 'שדרגי מנוי עכשיו 💎' : 'שדרג מנוי עכשיו 💎'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Daily Wellness Tracking & Active Challenge */}
            {currentTier === 'free' || currentTier === 'free_trial' ? (
              // Locked State - Free user upgrade promotion style (replaces the entire card)
              <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-white rounded-3xl p-6 md:p-8 text-primary relative overflow-hidden shadow-md border border-secondary/10">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-secondary/10 rounded-full blur-[50px] pointer-events-none select-none"></div>
                <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-primary/10 rounded-full blur-[40px] pointer-events-none select-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="space-y-3 flex-1 text-right">
                    <h3 className="font-heading text-xl font-bold text-primary">פתח מעקב יומי ואתגרים אישיים מבוססי AI</h3>
                    <p className="text-slate-650 font-body text-xs max-w-xl leading-relaxed font-semibold">
                      רוצה לשמור על המדדים לאורך זמן? שדרג את המנוי כדי לפתוח מעקב אחר מים, שינה וצעדים, ולקבל אתגרים מותאמים אישית המשפרים את הבריאות שלך באופן אקטיבי.
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full text-[10px] font-extrabold text-secondary self-start md:self-end">
                      <Target className="w-3.5 h-3.5 animate-pulse" />
                      <span>שדרג למרכז בריאות חכם</span>
                    </span>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="bg-secondary hover:bg-secondary/95 text-white font-bold px-8 py-3 rounded-full shadow-md hover:shadow-secondary/15 transition-all hover:scale-105 active:scale-95 text-sm border-0 cursor-pointer w-full md:w-auto text-center"
                    >
                      {isFemale ? 'שדרגי מנוי עכשיו 💎' : 'שדרג מנוי עכשיו 💎'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Unlocked State - The full Wellness Hub dashboard card
              <div className="bg-white rounded-3xl p-6 md:p-8 custom-shadow border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-primary/60 to-secondary/60"></div>
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-primary/10 text-primary rounded-xl">
                      <Heart className="w-5 h-5" />
                    </span>
                    <h3 className="font-heading text-xl font-bold text-primary">מרכז בריאות אישי</h3>
                  </div>
                  <button 
                    onClick={() => navigate('/wellness')} 
                    className="text-primary text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                  >
                    <span>לעמוד המלא</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trends Graph */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col h-64">
                    <h4 className="font-bold text-sm text-primary mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-secondary" />
                      מגמות השבוע האחרון
                    </h4>
                    {wellnessHistory.length > 0 ? (
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={wellnessHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                            />
                            <Line yAxisId="left" type="monotone" name="מים (כוסות)" dataKey="water" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            <Line yAxisId="left" type="monotone" name="שינה (שעות)" dataKey="sleep" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            <Line yAxisId="right" type="monotone" name="צעדים" dataKey="steps" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-xs">אין נתונים לשבוע האחרון</p>
                      </div>
                    )}
                  </div>

                  {/* Active Challenge */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-primary mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-secondary" />
                        האתגר הפעיל שלך
                      </h4>
                      {activeChallenge ? (
                        <div className="space-y-4 mt-2">
                          <h5 className="font-bold text-primary">{activeChallenge.title}</h5>
                          <p className="text-xs text-slate-500 leading-relaxed">{activeChallenge.description}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>התקדמות</span>
                              <span>{Math.round(((activeChallenge.progress || 0) / (activeChallenge.days || 30)) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.round(((activeChallenge.progress || 0) / (activeChallenge.days || 30)) * 100)}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 pt-6">
                          <Trophy className="w-10 h-10 text-slate-300" />
                          <p className="text-xs text-slate-500">לא נבחר אתגר כרגע.</p>
                          <button onClick={() => navigate('/wellness')} className="text-xs font-bold text-secondary bg-secondary/10 px-4 py-2 rounded-full border-0 cursor-pointer hover:bg-secondary/20 transition-all">בחר אתגר חדש</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Trends Graph Container */}
            <div className="bg-white rounded-3xl custom-shadow border border-slate-100 p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-primary/10 text-primary rounded-xl">
                    <TrendingUp className="w-5 h-5 animate-pulse" />
                  </span>
                  <h3 className="font-heading text-xl font-bold text-primary">{currentMetric.title}</h3>
                </div>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider bg-secondary/5 px-3 py-1 rounded-full">
                  {currentMetric.badge}
                </span>
              </div>

              {/* Selector Tabs */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(metricConfigs).map(([key, config]) => {
                  const isActive = activeMetricTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveMetricTab(key)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
                        isActive 
                          ? 'bg-secondary text-white shadow-md shadow-secondary/15' 
                          : 'bg-slate-50 hover:bg-slate-100 text-on-surface-variant'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="py-8 text-center text-on-surface-variant font-semibold">טוען מגמות...</div>
              ) : activeHistory.length < 2 ? (
                <div className="py-12 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[180px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Activity className="w-10 h-10 mb-3 opacity-40 text-primary animate-pulse" />
                  <p className="text-sm font-medium w-full max-w-[340px] leading-relaxed">
                    {isFemale 
                      ? `העלי 2 בדיקות דם או יותר המכילות ${currentMetric.label} כדי לצפות בגרף המגמות האישי שלך.` 
                      : `העלה 2 בדיקות דם או יותר המכילות ${currentMetric.label} כדי לצפות בגרף המגמות האישי שלך.`}
                  </p>
                </div>
              ) : (
                <div className="relative mt-4 flex justify-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <svg className="w-full h-48 overflow-visible" viewBox="0 0 500 165">
                    <defs>
                      <linearGradient id="gradient-secondary-dashboard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A8B5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00A8B5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Fill area */}
                    <path 
                      d={`${renderChartPath(activeHistory)} L 35 130 L 465 130 Z`} 
                      fill="url(#gradient-secondary-dashboard)"
                    />
                    {/* Line */}
                    <path 
                      d={renderChartPath(activeHistory)} 
                      fill="none" 
                      stroke="#00A8B5" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                    />
                    {/* Dots & Labels */}
                    {activeHistory.map((h, i) => {
                      const values = activeHistory.map(item => item.value);
                      const min = Math.min(...values) - 10;
                      const max = Math.max(...values) + 10;
                      const range = max - min || 1;
                      const x = 465 - (i / (activeHistory.length - 1)) * 430;
                      const y = 110 - ((h.value - min) / range) * 80;
                      return (
                        <g key={i}>
                          <circle 
                            cx={x} 
                            cy={y} 
                            r="7" 
                            className={`${h.isAbnormal ? 'fill-status-error' : 'fill-secondary'} stroke-white stroke-2 shadow-sm`} 
                          />
                          <text 
                            x={x} 
                            y={y - 12} 
                            className="text-[12px] font-black fill-primary"
                            textAnchor="middle"
                          >
                            {h.value}
                          </text>
                          <text 
                            x={x} 
                            y={145} 
                            className="text-[11px] font-bold fill-on-surface-variant"
                            textAnchor="middle"
                          >
                            {h.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Recent Tests Area (Moved to main column for layout balance) */}
            <div className="bg-white rounded-3xl custom-shadow border border-slate-100 p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-secondary/10 text-secondary rounded-xl">
                    <Activity className="w-5 h-5" />
                  </span>
                  <h3 className="font-heading text-xl font-bold text-primary">הבדיקות האחרונות שלך</h3>
                </div>
                <button 
                  onClick={() => navigate('/tests')} 
                  className="text-secondary text-xs font-bold hover:underline bg-transparent border-0 cursor-pointer"
                >
                  לכל התוצאות
                </button>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-on-surface-variant font-semibold">טוען בדיקות...</div>
              ) : recentTests.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Activity className="w-10 h-10 mb-3 opacity-40 text-primary" />
                  <p className="text-sm font-medium">לא נמצאו בדיקות קודמות במערכת.</p>
                  <button onClick={() => navigate('/upload')} className="mt-4 text-xs text-secondary hover:underline bg-transparent border-0 font-bold cursor-pointer">
                    {isFemale ? 'העלי את הבדיקה הראשונה שלך' : 'העלה את הבדיקה הראשונה שלך'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTests.slice(0, 3).map((test) => (
                    <div 
                      key={test.id} 
                      onClick={() => navigate('/analysis', { state: { testId: test.id } })} 
                      className="group p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-secondary/25 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0 transition-colors group-hover:bg-secondary/15">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">{test.test_name}</h4>
                          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{new Date(test.created_at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="px-3 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-full">
                          {test.status}
                        </span>
                        <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-secondary group-hover:-translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Area (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Attention Needed (מדדים חורגים) card */}
            {recentTests.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 custom-shadow border border-slate-100 space-y-4 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold text-primary">אין נתונים זמינים</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    העלה בדיקת דם כדי לראות ניתוח של המדדים שלך.
                  </p>
                </div>
              </div>
            ) : abnormalMarkers.length > 0 ? (
              <div className="bg-white rounded-3xl p-6 custom-shadow border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3">
                  <span className="p-1.5 bg-status-error/10 text-status-error rounded-lg">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-primary">מדדים חורגים מהנורמה</h3>
                </div>
                
                <div className="space-y-2">
                  {abnormalMarkers.map((marker, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-status-error/5 rounded-xl border border-status-error/10 text-right">
                      <div>
                        <span className="text-xs font-extrabold text-primary block">{marker.marker_name}</span>
                        <span className="text-[10px] text-on-surface-variant font-bold leading-none">
                          נורמה: <span dir="ltr">{marker.normal_range_min} - {marker.normal_range_max}</span> {marker.unit}
                        </span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-md font-black text-status-error">{marker.measured_value}</span>
                        <span className="text-[10px] text-status-error font-extrabold block">{marker.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 custom-shadow border border-slate-100 space-y-4 text-center">
                <div className="w-12 h-12 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold text-primary">כל המדדים מאוזנים!</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    לא נמצאו חריגות בבדיקת הדם האחרונה שלך. המשך/י בעבודה הטובה!
                  </p>
                </div>
              </div>
            )}

            {/* BMI & Body Metrics Card */}
            <div className="bg-white rounded-3xl p-6 custom-shadow border border-slate-100 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-secondary/10 text-secondary rounded-lg">
                    <Scale className="w-5 h-5" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-primary">הרכב גוף ו-BMI</h3>
                </div>
                <button 
                  onClick={() => navigate('/settings', { state: { tab: 'health' } })}
                  className="text-secondary text-[11px] font-bold py-1 px-3 bg-secondary/5 rounded-full hover:bg-secondary/10 transition-all cursor-pointer border-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                  ערוך בהגדרות
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">גובה</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-black text-primary">{bodyMetrics.height || '--'}</span>
                    <span className="text-on-surface-variant text-[10px] font-semibold">ס"מ</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">משקל</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-black text-primary">{bodyMetrics.weight || '--'}</span>
                    <span className="text-on-surface-variant text-[10px] font-semibold">ק"ג</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">אחוז שומן</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-black text-primary">{bodyMetrics.bodyFat || '--'}</span>
                    <span className="text-on-surface-variant text-[10px] font-semibold">%</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-center flex flex-col justify-center items-center font-bold">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">BMI</span>
                  <span className="text-xl font-black text-secondary">{bodyMetrics.bmi || '--'}</span>
                </div>
              </div>

              {bodyMetrics.bmi && (
                <div className="pt-2 px-1 w-full">
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1" style={{ direction: 'rtl' }}>
                    <span>תקין (18.5-25)</span>
                    <span className="text-status-error font-extrabold">{bodyMetrics.category}</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-gradient-to-l from-amber-200 via-status-success via-amber-400 to-status-error rounded-full">
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full border-2 border-white shadow-md transition-all duration-500"
                      style={{ right: `${getBmiPercentage(bodyMetrics.bmi)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* AI Health Tip Card */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-6 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <Heart className="w-5 h-5 text-secondary animate-pulse" />
                </span>
                <h3 className="font-heading text-base font-bold text-primary">טיפ בריאות יומי (AI)</h3>
              </div>
              <p className="text-xs text-on-surface-variant font-body leading-relaxed">
                {generateHealthTip(abnormalMarkers)}
              </p>
            </div>



          </div>

        </div>

      </div>

      {/* Body Metrics modal removed — editing moved to /settings (health tab) */}
    </main>
  );
}
