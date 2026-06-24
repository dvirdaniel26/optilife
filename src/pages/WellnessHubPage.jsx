import { useState, useContext, useEffect } from 'react';
import { UserContext } from '../App';
import { supabase } from '../lib/supabase';
import { Loader2, HeartPulse, Pill, CheckCircle2, Trophy, ArrowLeft, Target, Droplets, Moon, Sun, Apple, Activity, Flame, Sparkles, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WellnessHubPage() {
  const { profile, session, isPremium } = useContext(UserContext);
  const navigate = useNavigate();
  const firstName = profile?.first_name || 'אורח/ת';
  const isFemale = profile?.gender === 'female';

  const [activeTab, setActiveTab] = useState('supplements'); // supplements, challenges, tracker
  const [loading, setLoading] = useState(true);
  const [latestTest, setLatestTest] = useState(null);
  const [abnormalMarkers, setAbnormalMarkers] = useState([]);

  // Mock Tracker State
  const [trackerState, setTrackerState] = useState({
    water: 0, // 0 cups
    sleep: 0, // hours
    steps: 0,
    mood: null,
  });

  // Mock Challenges
  const [activeChallenge, setActiveChallenge] = useState(null);

  useEffect(() => {
    const fetchLatestTest = async () => {
      if (!session?.user?.id) return;
      try {
        const { data: test, error: testError } = await supabase
          .from('medical_tests')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'completed')
          .order('test_date', { ascending: false })
          .limit(1)
          .single();

        if (test) {
          setLatestTest(test);
          const { data: results } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', test.id)
            .eq('is_abnormal', true);
          
          if (results) setAbnormalMarkers(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestTest();
  }, [session]);

  // Load Tracker and Challenge State from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Load today's tracker
        const today = new Date().toISOString().split('T')[0];
        const { data: trackerData } = await supabase
          .from('wellness_tracking')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('date', today)
          .maybeSingle();

        if (trackerData) {
          setTrackerState({
            water: trackerData.water || 0,
            sleep: trackerData.sleep || 0,
            steps: trackerData.steps || 0,
            mood: trackerData.mood || null,
          });
        }

        // Load active challenge
        const { data: challengeData } = await supabase
          .from('user_challenges')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (challengeData) {
          setActiveChallenge(challengeData);
        }
      } catch(e) {
        console.error('Error fetching wellness data:', e);
      }
    };
    
    fetchData();
  }, [session]);

  // Save Tracker State to Supabase
  useEffect(() => {
    const saveTracker = async () => {
      if (!session?.user?.id || !trackerState) return;
      
      // Don't save if it's just the initial zero state and we haven't loaded
      if (trackerState.water === 0 && trackerState.sleep === 0 && trackerState.steps === 0 && !trackerState.mood) return;

      const today = new Date().toISOString().split('T')[0];
      try {
        await supabase
          .from('wellness_tracking')
          .upsert({
            user_id: session.user.id,
            date: today,
            water: trackerState.water,
            sleep: trackerState.sleep,
            steps: trackerState.steps,
            mood: trackerState.mood,
          }, { onConflict: 'user_id,date' });
      } catch (e) {
        console.error('Error saving tracker:', e);
      }
    };

    const timer = setTimeout(saveTracker, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [trackerState, session]);

  // Save Active Challenge to Supabase
  useEffect(() => {
    const saveChallenge = async () => {
      if (!session?.user?.id) return;
      
      try {
        if (activeChallenge && activeChallenge.id) {
          await supabase
            .from('user_challenges')
            .upsert({
              user_id: session.user.id,
              challenge_id: activeChallenge.id || activeChallenge.challenge_id,
              title: activeChallenge.title,
              description: activeChallenge.description || activeChallenge.desc,
              progress: activeChallenge.progress || 0,
              days: activeChallenge.days || 30,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } else if (activeChallenge === null) {
          await supabase
            .from('user_challenges')
            .delete()
            .eq('user_id', session.user.id);
        }
      } catch (e) {
        console.error('Error saving challenge:', e);
      }
    };

    saveChallenge();
  }, [activeChallenge, session]);

  const getDynamicChallenges = () => {
    const challenges = [];
    
    const hasLowD = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('d'));
    const hasLowIron = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('iron') || m.marker_name.toLowerCase().includes('ferritin') || m.marker_name.toLowerCase().includes('hemoglobin'));
    const hasHighCholesterol = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('cholesterol') || m.marker_name.toLowerCase().includes('ldl'));
    const hasHighGlucose = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('glucose'));

    if (hasHighGlucose) {
      challenges.push({
        id: 'glucose_challenge',
        title: 'אתגר אפס סוכר מוסף',
        desc: 'בגלל רמות סוכר חורגות בבדיקה, הימנע/י מסוכר מוסף למשך 30 ימים.',
        icon: <Apple className="w-7 h-7" />,
        bgIconColor: 'bg-red-50 text-red-500'
      });
    }

    if (hasHighCholesterol) {
      challenges.push({
        id: 'cholesterol_challenge',
        title: 'אתגר שומנים בריאים',
        desc: 'לאור רמות הכולסטרול, החלף/י מטוגנים בשומן צמחי (אבוקדו, שמן זית) ל-30 ימים.',
        icon: <Activity className="w-7 h-7" />,
        bgIconColor: 'bg-blue-50 text-blue-500'
      });
    }

    if (hasLowIron) {
      challenges.push({
        id: 'iron_challenge',
        title: 'אתגר ברזל עשיר',
        desc: 'כדי לשפר את מדד הברזל, שלב/י מנה עשירה בברזל בארוחה המרכזית כל יום.',
        icon: <Droplets className="w-7 h-7" />,
        bgIconColor: 'bg-amber-50 text-amber-500'
      });
    }

    // Fill up to 3 challenges if we have less
    if (challenges.length < 3) {
      if (!challenges.find(c => c.id === 'steps_challenge')) {
         challenges.push({
           id: 'steps_challenge',
           title: 'אתגר התנועה: 10,000 צעדים',
           desc: 'חיזוק שריר הלב, שיפור מצב הרוח והגברת האנרגיה היומית ב-30 ימים.',
           icon: <Activity className="w-7 h-7" />,
           bgIconColor: 'bg-emerald-50 text-emerald-500'
         });
      }
      if (challenges.length < 3 && !challenges.find(c => c.id === 'fasting_challenge')) {
         challenges.push({
           id: 'fasting_challenge',
           title: 'צום לסירוגין 16:8',
           desc: '16 שעות צום, 8 שעות חלון אכילה. לשיפור רגישות לאינסולין ואנרגיה.',
           icon: <Target className="w-7 h-7" />,
           bgIconColor: 'bg-indigo-50 text-indigo-500'
         });
      }
      if (challenges.length < 3 && !challenges.find(c => c.id === 'water_challenge')) {
         challenges.push({
           id: 'water_challenge',
           title: 'אתגר המים הגדול',
           desc: 'הגעה ליעד של 10 כוסות מים בכל יום למשך חודש שלם.',
           icon: <Droplets className="w-7 h-7" />,
           bgIconColor: 'bg-cyan-50 text-cyan-500'
         });
      }
    }
    
    return challenges.slice(0, 3);
  };

  const getSupplementsRecommendations = () => {
    // Generate some mock smart recommendations based on markers
    const recommendations = [];
    
    const hasLowD = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('d'));
    const hasLowIron = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('iron') || m.marker_name.toLowerCase().includes('ferritin') || m.marker_name.toLowerCase().includes('hemoglobin'));
    const hasHighCholesterol = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('cholesterol') || m.marker_name.toLowerCase().includes('ldl'));
    const hasHighGlucose = abnormalMarkers.some(m => m.marker_name.toLowerCase().includes('glucose'));

    if (hasLowD) {
      recommendations.push({
        id: 'vitD',
        title: 'ויטמין D3 (טיפות)',
        reason: 'מבוסס על חוסר בויטמין D מהבדיקה האחרונה.',
        dosage: '2000 יב"ל',
        timing: 'אחרי ארוחת צהריים (דורש סביבה שומנית לספיגה)',
        icon: <Sun className="w-6 h-6 text-amber-500" />
      });
    }
    
    if (hasLowIron) {
      recommendations.push({
        id: 'iron',
        title: 'ברזל ביסגליצינאט',
        reason: 'מבוסס על רמות ברזל/המוגלובין נמוכות בבדיקה.',
        dosage: '1 כדור (25 מ"ג)',
        timing: 'על קיבה ריקה או עם ויטמין C. לא יחד עם מוצרי חלב.',
        icon: <Droplets className="w-6 h-6 text-red-500" />
      });
    }

    if (hasHighCholesterol) {
      recommendations.push({
        id: 'omega3',
        title: 'אומגה 3 (EPA/DHA)',
        reason: 'מבוסס על רמות כולסטרול חורגות. מסייע בהורדת טריגליצרידים.',
        dosage: '2 קפסולות',
        timing: 'עם ארוחה גדולה',
        icon: <Activity className="w-6 h-6 text-blue-500" />
      });
    }

    if (hasHighGlucose) {
      recommendations.push({
        id: 'berberine',
        title: 'ברברין / חומצה אלפא ליפואית',
        reason: 'מבוסס על סוכר גבוה בדם. תומך באיזון הגלוקוז.',
        dosage: '500 מ"ג',
        timing: 'לפני הארוחות הגדולות',
        icon: <Flame className="w-6 h-6 text-orange-500" />
      });
    }

    // Default general recommendation if no abnormal markers found
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'multi',
        title: 'מולטי ויטמין',
        reason: 'לשמירה על בריאות כללית ותחזוקת המדדים התקינים שלך.',
        dosage: '1 קפסולה',
        timing: 'עם ארוחת הבוקר',
        icon: <Pill className="w-6 h-6 text-secondary" />
      });
      recommendations.push({
        id: 'magnesium',
        title: 'מגנזיום ציטראט',
        reason: 'תמיכה בשרירים, מערכת העצבים ושיפור איכות השינה.',
        dosage: '200-400 מ"ג',
        timing: 'לפני השינה',
        icon: <Moon className="w-6 h-6 text-indigo-500" />
      });
    }

    return recommendations;
  };

  const supplements = getSupplementsRecommendations();

  if (!isPremium) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen bg-background relative overflow-hidden" dir="rtl">
        <div className="p-md w-full max-w-4xl mx-auto text-center relative z-10 mt-6 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-xl custom-shadow border border-outline/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-secondary to-primary" />
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-lg text-secondary">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>
            
            <h2 className="font-heading text-3xl md:text-4xl text-primary font-bold mb-md">
              מרכז בריאות אישי
            </h2>
            <p className="text-on-surface-variant text-lg w-full max-w-2xl mx-auto mb-xl leading-relaxed">
              מרכז הבריאות האישי זמין למסלול מתקדם ומעלה. כאן מנוע ה-AI שלנו יעקוב אחר ההרגלים שלך ויבנה עבורך אתגרים יומיים חכמים והמלצות תוספים אישיות.
            </p>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl text-right">
              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">התאמת ויטמינים אישית</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    המלצות לתוספי תזונה על סמך בדיקות הדם האחרונות שלך.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">אתגרים יומיים</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    מבחר אתגרי בריאות מותאמים כמו אתגר צעדים, צום והפחתת סוכר.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 text-indigo-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">מעקב הרגלים</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    מעקב אינטראקטיבי אחר שתיית מים, שעות שינה ופעילות גופנית.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-lg rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-xs">מקום אחד לבריאות שלך</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    ריכוז כלל נתוני ה-Wellness שלך להשגת אורח חיים בריא יותר.
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

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-slate-50 transition-all font-body">
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="font-heading text-3xl text-primary font-black flex items-center gap-2">
              <span className="p-2 bg-secondary/10 text-secondary rounded-2xl">
                <HeartPulse className="w-7 h-7" />
              </span>
              מרכז בריאות אישי
            </h1>
            <p className="text-on-surface-variant text-sm font-semibold mt-2">
              המרכז האישי שלך לשיפור הבריאות, {firstName}. המלצות חכמות, מעקב יומי ואתגרים.
            </p>
          </div>
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto scrollbar-none">
            <button 
              onClick={() => setActiveTab('supplements')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'supplements' ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Pill className="w-4 h-4" />
              תוספים חכמים
            </button>
            <button 
              onClick={() => setActiveTab('tracker')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'tracker' ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              מעקב יומי
            </button>
            <button 
              onClick={() => setActiveTab('challenges')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'challenges' ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Trophy className="w-4 h-4" />
              אתגרים
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          </div>
        ) : (
          <div className="animate-fadeIn">
            
            {/* SUPPLEMENTS TAB */}
            {activeTab === 'supplements' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-secondary/10 via-primary/5 to-white p-6 rounded-3xl border border-secondary/20 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-secondary to-primary"></div>
                  <h2 className="text-xl font-bold text-primary mb-2">מרכז התוספים והויטמינים שלך</h2>
                  <p className="text-sm text-slate-600 mb-6">
                    ההמלצות הבאות מותאמות אישית לתוצאות בדיקת הדם האחרונה שלך במערכת ({latestTest ? new Date(latestTest.test_date).toLocaleDateString('he-IL') : 'לא נמצאו בדיקות'}).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {supplements.map(sup => (
                      <div key={sup.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          {sup.icon}
                        </div>
                        <h3 className="font-bold text-lg text-primary mb-1">{sup.title}</h3>
                        <p className="text-[11px] font-bold text-secondary bg-secondary/10 inline-block px-2 py-0.5 rounded-md mb-3">{sup.dosage}</p>
                        <p className="text-xs text-slate-600 mb-4 leading-relaxed h-10">{sup.reason}</p>
                        <div className="border-t border-slate-50 pt-3 flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">schedule</span>
                          <span className="text-[11px] text-slate-500 font-semibold">{sup.timing}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-[10px] text-slate-400 font-medium">
                    *ההמלצות לעיל הן לידע כללי בלבד ואינן מהוות מרשם או תחליף לייעוץ רפואי/תזונתי מקצועי. יש להתייעץ עם רופא לפני נטילת תוספים חדשים.
                  </div>
                </div>
              </div>
            )}

            {/* TRACKER TAB */}
            {activeTab === 'tracker' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-primary px-2">מעקב הרגלים יומי - {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Water Tracker */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-48">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-primary flex items-center gap-1.5"><Droplets className="w-5 h-5 text-blue-500" /> שתיית מים</h3>
                        <p className="text-xs text-slate-500 mt-1">יעד: 10 כוסות ביום</p>
                      </div>
                      <span className="text-2xl font-black text-blue-500">{trackerState.water}<span className="text-sm text-slate-400 font-bold">/10</span></span>
                    </div>
                    <div className="flex justify-between gap-2 mt-4">
                      <button onClick={() => setTrackerState(p => ({...p, water: Math.max(0, p.water - 1)}))} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-xl text-slate-400 transition-colors">-</button>
                      <button onClick={() => setTrackerState(p => ({...p, water: Math.min(10, p.water + 1)}))} className="flex-1 bg-blue-50 hover:bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-xl text-blue-600 transition-colors">+</button>
                    </div>
                  </div>

                  {/* Sleep Tracker */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-48">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-primary flex items-center gap-1.5"><Moon className="w-5 h-5 text-indigo-500" /> שעות שינה</h3>
                        <p className="text-xs text-slate-500 mt-1">יעד: 8 שעות</p>
                      </div>
                      <span className="text-2xl font-black text-indigo-500">{trackerState.sleep}<span className="text-sm text-slate-400 font-bold">h</span></span>
                    </div>
                    <div className="flex justify-between gap-2 mt-4">
                      <button onClick={() => setTrackerState(p => ({...p, sleep: Math.max(0, p.sleep - 0.5)}))} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-xl text-slate-400 transition-colors">-</button>
                      <button onClick={() => setTrackerState(p => ({...p, sleep: Math.min(12, p.sleep + 0.5)}))} className="flex-1 bg-indigo-50 hover:bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-600 transition-colors">+</button>
                    </div>
                  </div>

                  {/* Activity Tracker */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-48 md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-primary flex items-center gap-1.5"><Activity className="w-5 h-5 text-emerald-500" /> צעדים</h3>
                        <p className="text-xs text-slate-500 mt-1">עד 30,000 צעדים ביום</p>
                      </div>
                      <span className="text-2xl font-black text-emerald-500">{trackerState.steps.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 flex flex-col justify-end">
                      <input 
                        type="range" 
                        min="0" 
                        max="30000" 
                        step="100"
                        value={trackerState.steps} 
                        onChange={(e) => setTrackerState(p => ({...p, steps: parseInt(e.target.value)}))}
                        className="w-full cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between mt-3 text-xs text-slate-400 font-bold">
                        <span>0</span>
                        <span>30k</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* CHALLENGES TAB */}
            {activeTab === 'challenges' && (
              <div className="space-y-6">
                
                {activeChallenge ? (
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-400/30">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block backdrop-blur-sm">אתגר פעיל - יום {(activeChallenge.progress || 0) + 1} מתוך {activeChallenge.days || 30}</span>
                        <h2 className="text-3xl font-black mb-2">{activeChallenge.title}</h2>
                        <p className="text-indigo-100 text-sm">{activeChallenge.desc}</p>
                        <button onClick={() => setActiveChallenge(null)} className="mt-4 text-xs underline text-indigo-200 hover:text-white transition-colors cursor-pointer bg-transparent border-0">
                          בטל אתגר ובחר אחר
                        </button>
                      </div>
                      <div className="w-full md:w-auto bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/20 text-center shrink-0">
                        <Trophy className="w-10 h-10 mx-auto text-yellow-300 mb-2" />
                        <div className="font-bold">השלמת בהצלחה היום?</div>
                        <button 
                          onClick={() => setActiveChallenge(p => ({...p, progress: Math.min((p.progress || 0) + 1, p.days || 30)}))}
                          className="mt-3 w-full bg-white text-indigo-600 font-black py-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-0"
                        >
                          סמן כבוצע!
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-8 relative z-10">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span>התקדמות</span>
                        <span>{Math.round(((activeChallenge.progress || 0) / (activeChallenge.days || 30)) * 100)}%</span>
                      </div>
                      <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${Math.round(((activeChallenge.progress || 0) / (activeChallenge.days || 30)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-primary px-2">בחר אתגר ל-30 הימים הקרובים</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {getDynamicChallenges().map(challenge => (
                        <div key={challenge.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:border-secondary hover:shadow-md transition-all cursor-pointer" onClick={() => {
                          const { icon, bgIconColor, ...challengeToSave } = challenge;
                          setActiveChallenge({...challengeToSave, progress: 0, days: 30});
                        }}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${challenge.bgIconColor}`}>
                            {challenge.icon}
                          </div>
                          <h3 className="font-bold text-lg text-primary mb-2">{challenge.title}</h3>
                          <p className="text-xs text-slate-500 mb-4 leading-relaxed h-12">{challenge.desc}</p>
                          <button className="w-full py-2.5 bg-slate-50 text-slate-600 font-bold rounded-xl text-sm hover:bg-secondary hover:text-white transition-all cursor-pointer border-0">הצטרף לאתגר</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
