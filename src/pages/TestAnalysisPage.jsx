import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { analyzeMedicalImage } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles, CheckCircle2, Calendar, FileText } from 'lucide-react';

export default function TestAnalysisPage() {
  const { profile, session, isPremium, setProfile } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const isFemale = profile?.gender === 'female';

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [recentTests, setRecentTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [totalTests, setTotalTests] = useState(0);

  // AI Pending Result state when date is NOT detected
  const [pendingResult, setPendingResult] = useState(null);



  const yearVal = testDate.split('-')[0] || new Date().getFullYear().toString();
  const monthVal = testDate.split('-')[1] || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const dayVal = testDate.split('-')[2] || new Date().getDate().toString().padStart(2, '0');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => (currentYear - i).toString());
  const hebrewMonths = [
    { value: '01', label: 'ינואר (01)' },
    { value: '02', label: 'פברואר (02)' },
    { value: '03', label: 'מרץ (03)' },
    { value: '04', label: 'אפריל (04)' },
    { value: '05', label: 'מאי (05)' },
    { value: '06', label: 'יוני (06)' },
    { value: '07', label: 'יולי (07)' },
    { value: '08', label: 'אוגוסט (08)' },
    { value: '09', label: 'ספטמבר (09)' },
    { value: '10', label: 'אוקטובר (10)' },
    { value: '11', label: 'נובמבר (11)' },
    { value: '12', label: 'דצמבר (12)' },
  ];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleDateChange = (type, value) => {
    let y = yearVal;
    let m = monthVal;
    let d = dayVal;
    if (type === 'year') y = value;
    if (type === 'month') m = value;
    if (type === 'day') d = value;
    setTestDate(`${y}-${m}-${d}`);
  };

  useEffect(() => {
    const fetchTestsData = async () => {
      if (!session?.user?.id) return;
      try {
        // 1. Fetch recent tests
        const { data, error } = await supabase
          .from('medical_tests')
          .select('*')
          .eq('user_id', session.user.id)
          .order('test_date', { ascending: false })
          .limit(3);

        if (error) throw error;
        setRecentTests(data || []);

        // 2. Fetch total tests count
        const { count, error: countError } = await supabase
          .from('medical_tests')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);

        if (!countError) {
          setTotalTests(count || 0);
        }
      } catch (err) {
        console.error('Error fetching tests count:', err);
      } finally {
        setLoadingTests(false);
      }
    };

    fetchTestsData();
  }, [session, isAnalyzing]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setPendingResult(null);
    } else {
      setError('יש לבחור קובץ תמונה (JPEG, PNG) או מסמך PDF.');
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const saveAnalysisResults = async (aiResult, chosenDate) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      // 1. Create a Medical Test record
      const { data: testData, error: testError } = await supabase
        .from('medical_tests')
        .insert([{
          user_id: session.user.id,
          test_name: selectedFile ? selectedFile.name : 'ניתוח בדיקה (AI)',
          test_date: chosenDate,
          status: 'נותח',
        }])
        .select()
        .single();

      if (testError) throw testError;

      // 2. Insert Lab Results
      const labResultsData = aiResult.results.map(r => ({
        test_id: testData.id,
        marker_name: r.marker_name || 'Unknown',
        measured_value: r.measured_value || 0,
        unit: r.unit || '',
        normal_range_min: r.normal_range_min,
        normal_range_max: r.normal_range_max,
        is_abnormal: r.is_abnormal || false
      }));

      const { error: resultsError } = await supabase
        .from('lab_results')
        .insert(labResultsData);

      if (resultsError) throw resultsError;

      // 3. Insert AI Insight
      if (aiResult.summary) {
        const { error: insightError } = await supabase
          .from('ai_insights')
          .insert([{
            test_id: testData.id,
            user_id: session.user.id,
            summary_text: aiResult.summary
          }]);

        if (insightError) throw insightError;
      }

      // Add notification
      const hasAbnormal = labResultsData.some(r => r.is_abnormal);
      if (hasAbnormal) {
        addNotification({
          type: 'warning',
          title: 'תוצאות בדיקת הדם מוכנות! ⚠️',
          message: 'בדיקת הדם שלך נותחה בהצלחה. זוהו מספר מדדים מחוץ לנורמה הדורשים תשומת לב.',
          link: '/analysis'
        });
      } else {
        addNotification({
          type: 'success',
          title: 'תוצאות בדיקת הדם מוכנות! 🎉',
          message: 'בדיקת הדם שלך נותחה בהצלחה. כל המדדים שנבדקו נמצאים בטווח התקין!',
          link: '/analysis'
        });
      }

      navigate('/analysis');
    } catch (err) {
      console.error(err);
      setError(err.message || (isFemale ? 'אירעה שגיאה בשמירת התוצאות במערכת. נסי שוב.' : 'אירעה שגיאה בשמירת התוצאות במערכת. נסה שוב.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return;

    if (!selectedFile) {
      setError('יש לבחור קובץ לפני התחלת הניתוח.');
      return;
    }

    if (!session?.user?.id) {
      setError('יש להתחבר כדי לבצע ניתוח.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setPendingResult(null);

    try {
      // 1. Convert file to Base64
      const base64Data = await convertToBase64(selectedFile);

      // 2. Fetch the user's previous test and its markers for comparison
      let prevResultsText = '';
      try {
        const { data: prevTests, error: prevTestsError } = await supabase
          .from('medical_tests')
          .select('*')
          .eq('user_id', session.user.id)
          .order('test_date', { ascending: false })
          .limit(1);

        if (prevTests && prevTests.length > 0) {
          const prevTest = prevTests[0];
          const { data: prevResults, error: prevResultsError } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', prevTest.id);

          if (prevResults && prevResults.length > 0) {
            prevResultsText = `
              הבדיקה הקודמת של המשתמש בוצעה בתאריך ${prevTest.test_date}.
              להלן תוצאות המדדים בבדיקה הקודמת:
              ${prevResults.map(r => `- ${r.marker_name}: ${r.measured_value} ${r.unit}`).join('\n')}
            `;
          }
        }
      } catch (dbErr) {
        console.error('שגיאה בשליפת בדיקות קודמות לצורך השוואה:', dbErr);
      }

      // 3. Call Gemini AI (passing the comparison context)
      const aiResult = await analyzeMedicalImage(base64Data, selectedFile.type, prevResultsText);

      if (!aiResult.results || aiResult.results.length === 0) {
        throw new Error(isFemale ? 'לא זוהו מדדים בתמונה. ודאי שזוהי תמונה ברורה של תוצאות מעבדה.' : 'לא זוהו מדדים בתמונה. ודא שזוהי תמונה ברורה של תוצאות מעבדה.');
      }

      // 4. Check if the AI successfully detected a date
      // A valid date should match YYYY-MM-DD
      const detectedDate = aiResult.test_date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (detectedDate && dateRegex.test(detectedDate)) {
        // AI successfully detected the date! Automatically save and redirect
        await saveAnalysisResults(aiResult, detectedDate);
      } else {
        // AI failed to detect the date. Stop and ask the user to specify it!
        setPendingResult(aiResult);
        setIsAnalyzing(false); // Stop loading so they can choose the date
      }

    } catch (err) {
      console.error(err);
      setError(err.message || (isFemale ? 'אירעה שגיאה במהלך הניתוח. נסי שוב.' : 'אירעה שגיאה במהלך הניתוח. נסה שוב.'));
      setIsAnalyzing(false);
    }
  };

  const handleSavePendingWithCustomDate = async () => {
    if (!pendingResult) return;
    await saveAnalysisResults(pendingResult, testDate);
  };

  // Determine subscription tier status
  const currentTier = profile?.subscription_tier || 'free';
  const isCurrentlyAiUltimate = currentTier === 'ai_ultimate' || currentTier.startsWith('ai_ultimate_cancelled:');
  const isCurrentlyPremium = currentTier === 'premium' || currentTier.startsWith('premium_cancelled:');
  const isCurrentlyStandard = currentTier === 'standard' || currentTier.startsWith('standard_cancelled:');

  // Enforce tier upload limits dynamically
  let isAllowedToAnalyze = false;
  if (isCurrentlyPremium || isCurrentlyAiUltimate) {
    isAllowedToAnalyze = true;
  } else if (isCurrentlyStandard) {
    isAllowedToAnalyze = totalTests < 3;
  } else {
    // free tier
    isAllowedToAnalyze = totalTests < 1;
  }


  const getQuotaDisplay = () => {
    if (isCurrentlyPremium || isCurrentlyAiUltimate) {
      return {
        label: 'מנוי אולטימטיבי 👑',
        used: totalTests,
        limit: 'ללא הגבלה',
        percent: 100,
        colorClass: 'bg-gradient-to-l from-yellow-400 to-amber-500 bg-amber-400',
        bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
        badge: 'פעיל - ללא הגבלה ⚡'
      };
    }
    if (isCurrentlyStandard) {
      const pct = Math.min((totalTests / 3) * 100, 100);
      return {
        label: 'מנוי מתקדם 🌟',
        used: totalTests,
        limit: 3,
        percent: pct,
        colorClass: 'bg-secondary',
        bgClass: 'bg-secondary/10 border-secondary/20 text-secondary',
        badge: `${totalTests} מתוך 3 בדיקות`
      };
    }
    // Free tier
    const pct = Math.min((totalTests / 1) * 100, 100);
    return {
      label: 'מסלול בסיסי (חינם)',
      used: totalTests,
      limit: 1,
      percent: pct,
      colorClass: 'bg-primary',
      bgClass: 'bg-primary/10 border-primary/20 text-primary',
      badge: `${totalTests} מתוך 1 בדיקה`
    };
  };

  const quota = getQuotaDisplay();

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all bg-background" dir="rtl">
      <div className="p-xl max-w-4xl mx-auto">
        {/* Header Dashboard Banner */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline/10 custom-shadow mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-right w-full md:w-auto">
            <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full mb-3 inline-block">ניתוח בדיקות AI 📊</span>
            <h2 className="font-heading text-2xl md:text-3xl text-primary font-bold mb-2">
              שלום {firstName}, {isFemale ? 'בואי ננתח' : 'בוא ננתח'} את הבדיקות שלך
            </h2>
            <p className="font-body text-sm text-on-surface-variant max-w-xl leading-relaxed">
              {isFemale 
                ? 'העלי צילום ברור של תוצאות המעבדה שלך וקבלי תוך שניות תובנות בריאותיות מבוססות בינה מלאכותית, השוואה למדדים קודמים ופירוט מקיף בעברית.' 
                : 'העלה צילום ברור של תוצאות המעבדה שלך וקבל תוך שניות תובנות בריאותיות מבוססות בינה מלאכותית, השוואה למדדים קודמים ופירוט מקיף בעברית.'}
            </p>
          </div>
          
          {/* Quota Display */}
          <div className="w-full md:w-80 bg-slate-50 border border-slate-100 rounded-2xl p-5 shrink-0 text-right">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500">ניצול מכסת בדיקות:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${quota.bgClass}`}>
                {quota.badge}
              </span>
            </div>
            <div className="text-md font-bold text-primary mb-2 flex items-center justify-between">
              <span>{quota.label}</span>
              <span dir="ltr" className="text-xs text-on-surface-variant font-bold">{quota.used} / {quota.limit}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${quota.colorClass}`}
                style={{ width: `${quota.percent}%` }}
              />
            </div>
            
            {!isPremium && (
              <a href="/pricing" className="text-xs text-secondary font-bold hover:underline block text-center mt-2">
                {isFemale ? 'שדרגי להעלאה ללא הגבלה 👑' : 'שדרג להעלאה ללא הגבלה 👑'}
              </a>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm text-right">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-md">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg, image/png, image/webp, application/pdf"
            className="hidden"
          />

          {pendingResult ? (
            /* 🧬 STEP 2: AI completed successfully but Date was NOT detected. Show Date picker! */
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-200 text-right">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-primary">הניתוח הושלם בהצלחה! 🎉</h3>
                  <p className="text-on-surface-variant text-xs">כל המדדים והתובנות חולצו בהצלחה על ידי ה-AI.</p>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/40 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">calendar_month</span>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1">אישור תאריך בדיקה</h4>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      לא הצלחנו לזהות את תאריך ביצוע הבדיקה מתוך התמונה באופן אוטומטי. {isFemale ? 'אנא בחרי' : 'אנא בחר'} את התאריך שבו בוצעה הבדיקה בפועל כדי שנוכל לשמור אותה נכון בציר הזמן שלך:
                    </p>
                  </div>
                </div>

                {/* Date Picker Input */}
                <div className="w-full max-w-md mx-auto pt-2" style={{ direction: 'rtl' }}>
                  <div className="flex gap-3 justify-between">
                    {/* Day selector */}
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">יום</span>
                      <select
                        value={dayVal}
                        onChange={(e) => handleDateChange('day', e.target.value)}
                        disabled={isAnalyzing}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-primary font-semibold text-center focus:outline-none focus:border-secondary transition-colors"
                      >
                        {days.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Month selector */}
                    <div className="flex-[1.5]">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">חודש</span>
                      <select
                        value={monthVal}
                        onChange={(e) => handleDateChange('month', e.target.value)}
                        disabled={isAnalyzing}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-primary font-semibold text-center focus:outline-none focus:border-secondary transition-colors"
                      >
                        {hebrewMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year selector */}
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">שנה</span>
                      <select
                        value={yearVal}
                        onChange={(e) => handleDateChange('year', e.target.value)}
                        disabled={isAnalyzing}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-primary font-semibold text-center focus:outline-none focus:border-secondary transition-colors"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center items-center">
                <button
                  onClick={handleSavePendingWithCustomDate}
                  disabled={isAnalyzing}
                  className="bg-secondary hover:bg-secondary/90 text-white font-bold px-10 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 text-base cursor-pointer shadow-md"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>שומר תוצאות...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">save</span>
                      <span>שמור והצג תוצאות</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setPendingResult(null);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isAnalyzing}
                  className="text-status-error font-bold text-sm hover:underline cursor-pointer"
                >
                  החלפת תמונה
                </button>
              </div>
            </div>
          ) : (
            /* 📥 STEP 1: standard File Upload dashed border or Premium Upgrade Promo Card */
            <>
              {isAllowedToAnalyze ? (
                previewUrl ? (
                  /* Image Preview Card */
                  <div className="bg-white rounded-3xl p-8 border border-outline/10 custom-shadow flex flex-col md:flex-row items-center gap-8 animate-in fade-in duration-300">
                    <div className="relative shrink-0 w-full md:w-56 h-56 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner flex-col">
                      {selectedFile?.type === 'application/pdf' ? (
                        <>
                          <FileText className="w-16 h-16 text-rose-500 mb-2" />
                          <span className="font-bold text-sm text-rose-600">קובץ PDF</span>
                        </>
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setTestDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-md flex items-center justify-center cursor-pointer"
                        title="הסר תמונה"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    
                    <div className="flex-1 text-right w-full">
                      <div className="mb-6">
                        <span className="px-2.5 py-0.5 bg-secondary/10 text-secondary text-xs font-bold rounded-full mb-2 inline-block">קובץ מוכן לניתוח 📂</span>
                        <h4 className="text-lg font-bold text-primary mb-1">{selectedFile?.name}</h4>
                        <p className="text-xs text-on-surface-variant">גודל: {Math.round(selectedFile?.size / 1024)} KB</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-amber-500 hover:shadow-lg text-primary font-extrabold px-8 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 text-base cursor-pointer"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>מנתח כעת (ממתינים ל-AI)...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-lg">bolt</span>
                              <span>התחל ניתוח AI ⚡</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setTestDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="text-slate-400 text-sm font-semibold hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          החלפת תמונה
                        </button>
                      </div>
                      
                      {!isPremium && totalTests === 0 && (
                        <p className="text-xs text-secondary font-bold animate-pulse flex items-center gap-1 mt-4">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>הניתוח הראשון שלך במתנה! 🎁</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Drag/Click upload dashed zone */
                  <div
                    onClick={() => !isAnalyzing && isAllowedToAnalyze && fileInputRef.current?.click()}
                    className="relative min-h-[280px] bg-white rounded-3xl border-2 border-dashed border-secondary/30 hover:border-secondary flex flex-col items-center justify-center p-8 transition-all hover:bg-slate-50/55 cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                    </div>
                    <h3 className="font-heading text-xl text-primary font-bold mb-2">
                      {isFemale ? 'לחצי לבחירת תמונה של הבדיקות' : 'לחץ לבחירת תמונה של הבדיקות'}
                    </h3>
                    <p className="font-body text-sm text-on-surface-variant mb-6 text-center max-w-sm">
                      גררי לכאן או לחצי לבחירת קובץ. תומך בפורמטים תמונה (JPEG, PNG) ומסמכי PDF
                    </p>
                    <span className="px-5 py-2 rounded-xl bg-secondary text-white font-bold text-sm hover:bg-secondary/90 transition-colors shadow-sm">
                      בחירת קובץ
                    </span>
                  </div>
                )
              ) : (
                /* Locked State: Premium Upgrade Promo Card */
                <div className="bg-primary text-white rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                  {/* Decorative glowing background gradients */}
                  <div className="absolute -top-16 -left-16 w-48 h-48 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                    <span className="material-symbols-outlined text-5xl">workspace_premium</span>
                  </div>
                  
                  <div className="relative z-10 flex-1 text-right w-full">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full mb-3 inline-block">שדרוג מנוי נדרש 👑</span>
                    <h3 className="text-2xl font-bold mb-2">הגעת למגבלת העלאת הבדיקות שלך</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-xl">
                      {currentTier === 'free'
                        ? 'המסלול החינמי מאפשר העלאה וניתוח של בדיקת מעבדה אחת בלבד. כדי להעלות בדיקות נוספות ולעקוב אחר מגמות הבריאות שלך, שדרגי למסלול מתקדם או מקצועי.'
                        : `הגעת למגבלת העלאת בדיקות במסלול המתקדם שלך (עד 3 בדיקות). שדרגי למסלול מקצועי או אולטימטיבי כדי ליהנות מהעלאה וניתוח ללא הגבלה!`}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                        <span>העלאת בדיקות ללא הגבלה 📊</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                        <span>מעקב והשוואת מגמות לאורך זמן 📈</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                        <span>צ\'אט מאמן בריאות 24/7 עם בינה מלאכותית 💬</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                        <span>המלצות תזונה ואימונים מותאמות אישית 🥗</span>
                      </div>
                    </div>
                    
                    <a
                      href="/pricing"
                      className="inline-flex justify-center items-center bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-primary font-extrabold px-10 py-3.5 rounded-full hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all text-base cursor-pointer"
                    >
                      לצפייה במסלולי שדרוג 🚀
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Medical Disclaimer Banner */}
          <div className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-5 text-right mt-4 max-w-3xl mx-auto w-full" dir="rtl">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-amber-500 text-2xl shrink-0">info</span>
              <div>
                <h4 className="font-bold text-primary text-xs mb-1">הבהרה רפואית חשובה:</h4>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  מערכת זו מבוססת על בינה מלאכותית (AI) ומיועדת למטרות מידע והעשרה בלבד. הניתוח וההמלצות אינם מהווים ייעוץ רפואי, אבחנה או תוכנית טיפול חלופית. חובה להתייעץ עם רופא או תזונאי מוסמך לפני ביצוע שינויים תזונתיים או רפואיים כלשהם.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tests and AI Insights Section */}
        <div className="grid grid-cols-12 gap-6 mt-12">
          <div className="col-span-12 md:col-span-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 custom-shadow border border-outline/5 h-full text-right">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                <h3 className="font-heading text-lg font-bold text-primary">בדיקות אחרונות שהועלו</h3>
                <button onClick={() => navigate('/tests')} className="text-secondary text-sm font-bold hover:underline cursor-pointer">לכל התוצאות ←</button>
              </div>

              {loadingTests ? (
                <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                  <span>טוען בדיקות אחרונות...</span>
                </div>
              ) : recentTests.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant text-sm flex flex-col items-center justify-center min-h-[160px]">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-400">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <p className="max-w-sm text-center text-xs">
                    {isFemale ? 'טרם הועלו בדיקות. העלי את הבדיקה הראשונה שלך למעלה!' : 'טרם הועלו בדיקות. העלה את הבדיקה הראשונה שלך למעלה!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTests.map((test) => (
                    <div
                      key={test.id}
                      onClick={() => navigate('/analysis', { state: { testId: test.id } })}
                      className="group p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-secondary/20 transition-all duration-200 cursor-pointer w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform flex-shrink-0">
                          <span className="material-symbols-outlined">science</span>
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">{test.test_name}</p>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                            {new Date(test.test_date).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-bold rounded-full">{test.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="bg-gradient-to-br from-secondary to-teal-600 h-full rounded-3xl p-6 md:p-8 custom-shadow text-white relative overflow-hidden flex flex-col justify-center min-h-[220px] text-right">
              {/* Decorative blurry circle */}
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-accent-action mb-4 shadow-sm">
                  <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <h4 className="font-heading text-lg font-bold mb-2">תובנות מבוססות AI ✨</h4>
                <p className="text-xs opacity-90 leading-relaxed font-body">
                  מנוע הניתוח המקצועי שלנו מזהה סמני בריאות, משווה אותם לטווחי הייחוס הרשמיים, ומספק סיכום מקיף, השוואה היסטורית והנחיות ממוקדות בעברית פשוטה וברורה.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
