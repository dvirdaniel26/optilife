import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
          .order('created_at', { ascending: false });
          
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
          
          if (results && results.length > 0) {
            const findMarker = (names) => {
              return results.find(r => 
                names.some(name => r.marker_name.toLowerCase().includes(name.toLowerCase()))
              );
            };
            
            const gluc = findMarker(['glucose', 'גלוקוז']);
            const chol = findMarker(['cholesterol', 'כולסטרול']);
            const hemo = findMarker(['hemoglobin', 'המוגלובין', 'hb']);
            
            setMetrics({
              glucose: {
                value: gluc ? gluc.measured_value : '--',
                status: gluc ? (gluc.is_abnormal ? 'חורג מהנורמה' : 'מאוזן') : 'אין נתונים',
                unit: gluc ? gluc.unit : 'mg/dL',
                statusClass: gluc ? (gluc.is_abnormal ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success') : 'bg-slate-100 text-on-surface-variant'
              },
              cholesterol: {
                value: chol ? chol.measured_value : '--',
                status: chol ? (chol.is_abnormal ? 'חורג מהנורמה' : 'מאוזן') : 'אין נתונים',
                unit: chol ? chol.unit : 'mg/dL',
                statusClass: chol ? (chol.is_abnormal ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success') : 'bg-slate-100 text-on-surface-variant'
              },
              hemoglobin: {
                value: hemo ? hemo.measured_value : '--',
                status: hemo ? (hemo.is_abnormal ? 'חורג מהנורמה' : 'מאוזן') : 'אין נתונים',
                unit: hemo ? hemo.unit : 'g/dL',
                statusClass: hemo ? (hemo.is_abnormal ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success') : 'bg-slate-100 text-on-surface-variant'
              }
            });
          }

          // 2. Fetch History from all tests
          const testIds = tests.map(t => t.id);
          const { data: allResults, error: allResultsError } = await supabase
            .from('lab_results')
            .select('test_id, measured_value, marker_name')
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
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentTestsAndMetrics();
  }, [session]);

  // Trigger onboarding welcome notification if details are missing
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
    
    // Save to Supabase profiles
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

    // Update state
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

  const metricConfigs = {
    glucose: { label: 'גלוקוז', title: 'מגמת גלוקוז לאורך זמן', unit: 'mg/dL', badge: 'Glucose (mg/dL)' },
    cholesterol: { label: 'כולסטרול', title: 'מגמת כולסטרול לאורך זמן', unit: 'mg/dL', badge: 'Cholesterol (mg/dL)' },
    hemoglobin: { label: 'המוגלובין', title: 'מגמת המוגלובין לאורך זמן', unit: 'g/dL', badge: 'Hemoglobin (g/dL)' }
  };
  const activeHistory = historyData[activeMetricTab] || [];
  const currentMetric = metricConfigs[activeMetricTab];

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all">
      <div className="p-xl max-w-6xl mx-auto">
        
        {/* 👤 דרישת השלמת פרופיל */}
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
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm whitespace-nowrap cursor-pointer"
            >
              {profile?.gender === 'female' ? 'עדכני' : 'עדכן'} פרטים עכשיו
            </button>
          </div>
        )}

        <div className="mb-xl flex justify-between items-end">
          <div>
            <h2 className="font-heading text-3xl text-primary mb-xs">המדדים שלך, {firstName}</h2>
            <p className="font-body text-lg text-on-surface-variant">סקירה כללית של מדדי הבריאות המרכזיים שלך בתוך מרחב הבריאות האישי</p>
          </div>
          <button onClick={() => navigate('/upload')} className="bg-accent-action text-primary px-6 py-2 rounded-full font-bold hover:shadow-lg transition-all hidden md:block">
            {isFemale ? 'העלי בדיקה חדשה' : 'העלה בדיקה חדשה'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
          {/* Glucose */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-md">
                <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">opacity</span></div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${metrics.glucose.statusClass}`}>{metrics.glucose.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1">רמת גלוקוז (Glucose)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{metrics.glucose.value}</span>
                <span className="text-on-surface-variant text-sm">{metrics.glucose.unit}</span>
              </div>
            </div>
          </div>
          
          {/* Cholesterol */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-md">
                <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">biotech</span></div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${metrics.cholesterol.statusClass}`}>{metrics.cholesterol.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1">כולסטרול כללי (Cholesterol)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{metrics.cholesterol.value}</span>
                <span className="text-on-surface-variant text-sm">{metrics.cholesterol.unit}</span>
              </div>
            </div>
          </div>
          
          {/* Hemoglobin */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-md">
                <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">bloodtype</span></div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${metrics.hemoglobin.statusClass}`}>{metrics.hemoglobin.status}</span>
              </div>
              <p className="text-on-surface-variant text-xs mb-1">המוגלובין (Hemoglobin)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{metrics.hemoglobin.value}</span>
                <span className="text-on-surface-variant text-sm">{metrics.hemoglobin.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🏃‍♂️ Body Metrics & BMI Section */}
        <div className="bg-white p-lg rounded-2xl custom-shadow border border-white mb-xl space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-2xl">monitoring</span>
              <h3 className="font-heading text-xl text-primary font-bold">פרופיל מדדי גוף והרכב גוף (BMI)</h3>
            </div>
            <button 
              onClick={openMetricsModal}
              className="text-secondary text-xs font-bold py-1.5 px-4 bg-secondary/5 rounded-full hover:bg-secondary/10 transition-all flex items-center gap-1.5 cursor-pointer border-0 group"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span className="group-hover:underline">עדכון מדדי גוף</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {/* Height */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">גובה</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black text-primary">{bodyMetrics.height || '--'}</span>
                <span className="text-on-surface-variant text-xs font-semibold">ס"מ</span>
              </div>
            </div>

            {/* Weight */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">משקל</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black text-primary">{bodyMetrics.weight || '--'}</span>
                <span className="text-on-surface-variant text-xs font-semibold">ק"ג</span>
              </div>
            </div>

            {/* Body Fat */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">אחוז שומן</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black text-primary">{bodyMetrics.bodyFat || '--'}</span>
                <span className="text-on-surface-variant text-xs font-semibold">%</span>
              </div>
            </div>

            {/* BMI */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">BMI מחושב</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black text-secondary">{bodyMetrics.bmi || '--'}</span>
              </div>
            </div>

            {/* Status */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">קטגוריה</span>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full mt-1 ${bodyMetrics.categoryClass}`}>{bodyMetrics.category}</span>
            </div>
          </div>

          {bodyMetrics.bmi && (
            <div className="pt-2 px-2 max-w-2xl mx-auto w-full">
              <div className="flex justify-between text-[9px] text-slate-500 font-bold px-1 mb-1" style={{ direction: 'rtl' }}>
                <span>תת-משקל (&lt;18.5)</span>
                <span>תקין (18.5-24.9)</span>
                <span>משקל עודף (25.0-29.9)</span>
                <span>השמנה (&gt;30.0)</span>
              </div>
              <div className="relative w-full h-3 bg-gradient-to-l from-amber-200 via-status-success via-amber-400 to-status-error rounded-full overflow-visible">
                {/* Indicator cursor */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all duration-500"
                  style={{ right: `${getBmiPercentage(bodyMetrics.bmi)}%` }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom dynamic grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-stretch">
          {/* Recent Tests Area (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-xl custom-shadow border border-white p-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-md border-b border-slate-50 pb-4">
                <h3 className="font-heading text-xl text-primary font-bold">הבדיקות האחרונות שלך</h3>
                <button onClick={() => navigate('/analysis')} className="text-secondary text-sm font-bold hover:underline">לכל התוצאות</button>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-on-surface-variant">טוען נתונים...</div>
              ) : recentTests.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[160px]">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">description</span>
                  <p>לא נמצאו בדיקות קודמות.</p>
                  <button onClick={() => navigate('/upload')} className="mt-4 text-secondary hover:underline">
                    {isFemale ? 'העלי את הבדיקה הראשונה שלך' : 'העלה את הבדיקה הראשונה שלך'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-sm">
                  {recentTests.slice(0, 3).map((test) => (
                    <div key={test.id} onClick={() => navigate('/analysis', { state: { testId: test.id } })} className="group p-md rounded-xl bg-background border border-transparent hover:border-secondary/20 transition-all cursor-pointer w-full flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                          <span className="material-symbols-outlined">science</span>
                        </div>
                        <div>
                          <p className="font-bold text-primary text-md">{test.test_name}</p>
                          <p className="text-sm text-on-surface-variant">{new Date(test.created_at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-full">{test.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Trends Graph (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-xl custom-shadow border border-white p-lg flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-md border-b border-slate-50 pb-4">
                <div>
                  <h3 className="font-heading text-xl text-primary font-bold">{currentMetric.title}</h3>
                </div>
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider bg-secondary/5 px-2.5 py-1 rounded-full text-secondary self-start sm:self-auto">
                  {currentMetric.badge}
                </span>
              </div>

              {/* Selector Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {Object.entries(metricConfigs).map(([key, config]) => {
                  const isActive = activeMetricTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveMetricTab(key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 ${
                        isActive 
                          ? 'bg-secondary text-white shadow-sm' 
                          : 'bg-slate-50 hover:bg-slate-100 text-on-surface-variant'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="py-8 text-center text-on-surface-variant">טוען מגמות...</div>
              ) : activeHistory.length < 2 ? (
                <div className="py-8 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[160px]">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">show_chart</span>
                  <p className="text-sm w-full max-w-[320px] text-center">
                    {isFemale 
                      ? `העלי 2 בדיקות דם או יותר המכילות ${currentMetric.label} כדי לצפות בגרף המגמות האישי שלך.` 
                      : `העלה 2 בדיקות דם או יותר המכילות ${currentMetric.label} כדי לצפות בגרף המגמות האישי שלך.`}
                  </p>
                </div>
              ) : (
                <div className="relative mt-4 flex justify-center">
                  <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 165">
                    <defs>
                      <linearGradient id="gradient-secondary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A8B5" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#00A8B5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Fill area */}
                    <path 
                      d={`${renderChartPath(activeHistory)} L 35 130 L 465 130 Z`} 
                      fill="url(#gradient-secondary)"
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
                            r="6.5" 
                            className="fill-secondary stroke-white stroke-2" 
                          />
                          <text 
                            x={x} 
                            y={y - 12} 
                            className="text-[13px] font-extrabold fill-primary"
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
          </div>
        </div>
        
      </div>

      {/* 🏃‍♂️ Body Metrics Editor Modal Popup */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right animate-in fade-in duration-200" dir="rtl">
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
            style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <h3 className="font-heading text-xl font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">scale</span>
                עדכון מדדי גוף
              </h3>
              <button 
                onClick={() => setShowMetricsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMetrics} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">גובה (בסנטימטרים)*</label>
                <input
                  type="number"
                  value={inputHeight}
                  onChange={(e) => setInputHeight(e.target.value)}
                  placeholder="לדוגמה: 175"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-right font-semibold"
                  required
                  min="50"
                  max="250"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">משקל (בקילוגרמים)*</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  placeholder="לדוגמה: 72.5"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-right font-semibold"
                  required
                  min="10"
                  max="300"
                />
              </div>



              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">אחוז שומן (אופציונלי)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputBodyFat}
                  onChange={(e) => setInputBodyFat(e.target.value)}
                  placeholder="לדוגמה: 18.2"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-right font-semibold"
                  min="1"
                  max="80"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary/90 shadow-md shadow-secondary/15 transition-all transform active:scale-[0.98] cursor-pointer"
              >
                {isFemale ? 'שמרי שינויים וחשבי BMI' : 'שמור שינויים וחשב BMI'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
