import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { analyzeMedicalImage } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles, CheckCircle2, Calendar, FileText, ShieldCheck, ShieldAlert } from 'lucide-react';

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

  // One-time professional data sharing consent state
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (profile && session?.user?.id) {
      const choiceMade = localStorage.getItem(`optilife_consent_sharing_choice_${session.user.id}`) === 'true';
      const hasConsentedDb = profile.consent_sharing === true;
      if (!choiceMade && !hasConsentedDb) {
        setShowConsentModal(true);
      }
    }
  }, [profile, session]);

  const handleSaveConsent = async (consented) => {
    if (!session?.user?.id) return;
    
    // Update local React user state
    if (setProfile) {
      setProfile(prev => ({ ...prev, consent_sharing: consented }));
    }

    try {
      // 1. Try to update Supabase database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ consent_sharing: consented })
        .eq('id', session.user.id);
        
      if (dbError) throw dbError;
    } catch (err) {
      console.warn("Could not save consent to database (profiles table schema might need update), falling back to LocalStorage:", err);
    }

    // 2. Persist choice and consent in LocalStorage
    localStorage.setItem(`optilife_consent_sharing_choice_${session.user.id}`, 'true');
    localStorage.setItem(`optilife_consent_sharing_${session.user.id}`, consented ? 'true' : 'false');
    setShowConsentModal(false);
  };

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
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setPendingResult(null);
    } else {
      setError('יש לבחור קובץ תמונה (JPEG, PNG). תמיכה ב-PDF תתווסף בהמשך.');
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
          test_name: 'ניתוח תמונה (AI)',
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

  // Determine if user has access to AI analysis (Premium OR first-time free user)
  const isAllowedToAnalyze = isPremium || totalTests === 0;

  return (
    <main className="md:pr-72 pt-20 min-h-screen transition-all" dir="rtl">
      <div className="p-xl max-w-4xl mx-auto">
        <div className="mb-xl flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-heading text-h1 text-primary mb-xs">
              שלום {firstName}, {isFemale ? 'בואי ננתח' : 'בוא ננתח'} את הבדיקות שלך
            </h2>
            <p className="font-body text-body-lg text-on-surface-variant">
              {isFemale 
                ? 'העלי צילום של תוצאות המעבדה שלך וקבלי תובנות בריאותיות מיידיות מבוססות AI.' 
                : 'העלה צילום של תוצאות המעבדה שלך וקבל תובנות בריאותיות מיידיות מבוססות AI.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-3 text-status-error text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-md">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />

          {!profile?.consent_sharing && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-md px-lg flex items-center justify-between gap-sm text-right w-full max-w-2xl mx-auto mb-2 text-xs">
              <div className="flex items-center gap-xs text-amber-800">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="font-medium">
                  <strong>שים לב:</strong> המידע שלך אינו משותף כעת עם צוות המנהלים המקצועי באתר.
                </span>
              </div>
              <button 
                onClick={() => setShowConsentModal(true)}
                className="text-xs text-primary font-bold hover:underline cursor-pointer select-none"
              >
                אשר שיתוף כעת 🤝
              </button>
            </div>
          )}

          {pendingResult ? (
            /* 🧬 STEP 2: AI completed successfully but Date was NOT detected. Show Date picker! */
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-12 h-12 bg-status-success/10 rounded-2xl flex items-center justify-center text-status-success">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-bold text-primary">הניתוח הושלם בהצלחה! 🧬</h3>
                  <p className="text-on-surface-variant text-xs">כל המדדים והתובנות חולצו בהצלחה על ידי ה-AI.</p>
                </div>
              </div>

              <div className="bg-secondary/5 rounded-2xl p-5 border border-secondary/10 space-y-4">
                <div className="flex items-start gap-3 text-right">
                  <Calendar className="w-6 h-6 text-secondary shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="font-bold text-primary text-sm mb-1">עדכון תאריך בדיקה</h4>
                    <p className="text-on-surface-variant text-xs leading-relaxed">
                      לא הצלחנו לזהות את תאריך ביצוע הבדיקה מתוך התמונה באופן אוטומטי. {isFemale ? 'אנא בחרי' : 'אנא בחר'} את תאריך ביצוע הבדיקה כדי שנוכל לשמור את המגמות וההיסטוריה שלך בצורה מדויקת:
                    </p>
                  </div>
                </div>

                {/* Date Picker Input */}
                <div className="w-full max-w-md mx-auto pt-2">
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
                  className="bg-accent-action hover:shadow-lg text-primary font-bold px-10 py-4 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 text-base cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>שומר תוצאות...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
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
                  className="text-status-error font-bold text-sm hover:underline"
                >
                  התחל מחדש (החלפת תמונה)
                </button>
              </div>
            </div>
          ) : (
            /* 📥 STEP 1: standard File Uploaddashed border (NO pre-analysis date picker) */
            <div
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              className={`upload-dashed-border bg-white min-h-[320px] flex flex-col items-center justify-center p-xl transition-all ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/80 cursor-pointer'} custom-shadow relative overflow-hidden`}
            >
              {previewUrl ? (
                <div
                  className="flex flex-col items-center w-full align-stretch"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={previewUrl} alt="Preview" className="max-h-[220px] object-contain mb-6 rounded-2xl shadow-md border border-slate-100" />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setTestDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="text-status-error text-sm font-bold hover:underline mb-2"
                    disabled={isAnalyzing}
                  >
                    הסר תמונה
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-md">
                    <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'wght' 300" }}>add_photo_alternate</span>
                  </div>
                  <h3 className="font-heading text-2xl text-primary mb-xs">
                    {isFemale ? 'לחצי לבחירת תמונה של הבדיקות' : 'לחץ לבחירת תמונה של הבדיקות'}
                  </h3>
                  <p className="font-body text-body-lg text-on-surface-variant mb-md text-center">תומך בפורמטים JPEG, PNG</p>
                  <button className="px-lg py-sm rounded-full border-2 border-secondary text-secondary font-bold hover:bg-secondary hover:text-white transition-all active:scale-95">
                    בחירת תמונה
                  </button>
                </>
              )}
            </div>
          )}

          {/* Medical Disclaimer Banner */}
          <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3 max-w-2xl mx-auto w-full text-right my-sm" dir="rtl">
            <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
            <div>
              <h4 className="font-bold text-amber-900 text-xs mb-1">הבהרה רפואית חשובה:</h4>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                מערכת זו מבוססת על בינה מלאכותית (AI) ומיועדת למטרות מידע והעשרה בלבד. הניתוח וההמלצות אינם מהווים ייעוץ רפואי, אבחנה או תוכנית טיפול חלופית. חובה להתייעץ עם רופא או תזונאי מוסמך לפני ביצוע שינויים תזונתיים או רפואיים כלשהם.
              </p>
            </div>
          </div>

          {!pendingResult && (
            <div className="flex justify-center mt-sm">
              {isAllowedToAnalyze ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedFile || isAnalyzing}
                    className={`bg-accent-action text-primary font-bold px-xl py-lg rounded-full shadow-xl flex items-center gap-md transition-all active:scale-95 group ${(!selectedFile || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xl">ה-AI מנתח את התוצאות...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform text-2xl">bolt</span>
                        <span className="text-xl">התחל ניתוח AI</span>
                      </>
                    )}
                  </button>
                  
                  {!isPremium && totalTests === 0 && (
                    <p className="text-xs text-secondary font-bold animate-pulse flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent-action fill-accent-action" />
                      <span>מתנה: יש לך ניתוח AI ראשון בחינם! 🎁</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button disabled className="bg-surface border-2 border-outline/20 text-on-surface-variant font-bold px-xl py-lg rounded-full flex items-center gap-md cursor-not-allowed opacity-70">
                    <span className="material-symbols-outlined text-2xl">lock</span>
                    <span className="text-xl">התחל ניתוח AI</span>
                  </button>
                  <p className="text-xs text-secondary font-bold text-center max-w-md leading-relaxed mt-2 w-full" style={{ minWidth: '320px' }}>
                    ניצלת את ניתוח ה-AI החינמי החד-פעמי שלך. 🌟 {isFemale ? 'שדרגי' : 'שדרג'} לפרימיום כדי ליהנות מניתוח ללא הגבלה ותובנות מתקדמות!
                  </p>
                  <a href="/pricing" className="text-xs text-primary font-bold hover:underline underline-offset-4 mt-1">
                    לצפייה במסלולי שדרוג
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Tests and AI Insights Section */}
        <div className="grid grid-cols-12 gap-md mt-xl">
          <div className="col-span-12 md:col-span-8">
            <div className="bg-white rounded-xl p-md custom-shadow border border-outline/5 h-full">
              <div className="flex justify-between items-center mb-md pb-2 border-b border-slate-50">
                <h3 className="font-heading text-lg font-bold text-primary">בדיקות אחרונות שהועלו</h3>
                <button onClick={() => navigate('/analysis')} className="text-secondary text-xs font-bold hover:underline">לכל התוצאות</button>
              </div>

              {loadingTests ? (
                <div className="py-8 text-center text-on-surface-variant text-sm">טוען בדיקות אחרונות...</div>
              ) : recentTests.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-sm flex flex-col items-center justify-center h-[120px]">
                  <span className="material-symbols-outlined text-3xl opacity-30 mb-2">description</span>
                  <p className="w-full max-w-sm text-center">
                    {isFemale ? 'טרם הועלו בדיקות. העלי את הבדיקה הראשונה שלך למעלה!' : 'טרם הועלו בדיקות. העלה את הבדיקה הראשונה שלך למעלה!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-sm">
                  {recentTests.map((test) => (
                    <div
                      key={test.id}
                      onClick={() => navigate('/analysis', { state: { testId: test.id } })}
                      className="group p-md rounded-xl bg-background border border-transparent hover:border-secondary/20 transition-all cursor-pointer w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                          <span className="material-symbols-outlined">science</span>
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{test.test_name}</p>
                          <p className="text-xs text-on-surface-variant">{new Date(test.test_date).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-full">{test.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="bg-secondary h-full rounded-xl p-md custom-shadow text-white relative overflow-hidden flex flex-col justify-center min-h-[180px]">
              <div className="relative z-10">
                <span className="material-symbols-outlined mb-xs text-accent-action text-3xl">auto_awesome</span>
                <h4 className="font-heading text-lg font-bold mb-xs">תובנות מבוססות AI</h4>
                <p className="text-xs opacity-90 leading-relaxed font-body">מנוע הניתוח המקצועי שלנו מזהה סמני בריאות, משווה אותם לטווחי הייחוס הרשמיים ומספק סיכום מקיף בעברית.</p>
              </div>
              <div className="absolute -left-xs -bottom-xs w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* 🛡️ Stunning Professional Sharing Consent Modal */}
        {showConsentModal && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'rgba(15, 23, 42, 0.65)', 
              backdropFilter: 'blur(12px)', 
              WebkitBackdropFilter: 'blur(12px)', 
              zIndex: 99999, 
              padding: '16px', 
              boxSizing: 'border-box' 
            }} 
            dir="rtl"
          >
            <div 
              style={{ 
                width: '94%', 
                maxWidth: '520px', 
                minWidth: '280px', 
                backgroundColor: '#ffffff', 
                borderRadius: '24px', 
                border: '1px solid rgba(0, 0, 0, 0.05)', 
                padding: '32px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', 
                boxSizing: 'border-box',
                flexShrink: 0,
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div className="flex items-center gap-sm pb-sm border-b border-slate-100">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-primary">אישור שיתוף נתונים לצוות המקצועי</h3>
                  <p className="text-on-surface-variant text-[11px]">חשוב לנו לעדכן אותך לפני העלאת קבצים למערכת 🛡️</p>
                </div>
              </div>

              <div className="space-y-sm py-xs">
                <p className="text-xs text-slate-600 leading-relaxed">
                  מנהלי המערכת והתזונאים המוסמכים של <strong>OptiLife</strong> יכולים ללוות אותך באופן אישי, לעקוב אחר מדדי הבריאות שלך, ולפנות אליך עם המלצות תזונה ושיפור בריאות מותאמות אישית.
                </p>

                <div className="bg-slate-50 rounded-2xl p-sm border border-slate-100 flex flex-col gap-sm">
                  <div className="flex gap-sm">
                    <span className="material-symbols-outlined text-secondary text-lg shrink-0 mt-0.5">auto_awesome</span>
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-[2px]">ליווי אישי מותאם</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">צוות הליווי יוכל לבנות ולהתאים לך תוכניות תזונה ובריאות מדויקות המבוססות על תוצאות בדיקת הדם.</p>
                    </div>
                  </div>

                  <div className="flex gap-sm">
                    <span className="material-symbols-outlined text-secondary text-lg shrink-0 mt-0.5">lock</span>
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-[2px]">אבטחה ופרטיות</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">המידע הרפואי שלך מוצפן ומאובטח, ויהיה חשוף אך ורק לאנשי מקצוע מורשים באתר.</p>
                    </div>
                  </div>

                  <div className="flex gap-sm">
                    <span className="material-symbols-outlined text-secondary text-lg shrink-0 mt-0.5">sports_kabaddi</span>
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-[2px]">שליטה מלאה</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">הבחירה היא שלך לחלוטין! {isFemale ? 'תוכלי' : 'תוכל'} לבחור להמשיך להשתמש באפליקציה באופן עצמאי ללא שיתוף.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-sm pt-sm">
                <button
                  onClick={() => handleSaveConsent(true)}
                  className="w-full bg-secondary text-white font-bold py-3.5 px-md rounded-xl transition-all duration-200 flex items-center justify-center gap-xs hover:shadow-lg active:scale-98 hover:bg-secondary/90 shadow-md text-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  אני מאשר/ת שיתוף נתונים וקבלת ליווי אישי 🤝
                </button>
                
                <button
                  onClick={() => handleSaveConsent(false)}
                  className="w-full text-slate-500 hover:text-slate-700 font-bold py-sm text-center text-xs transition-colors cursor-pointer"
                >
                  המשך ללא שיתוף (שימוש עצמאי בלבד) 👤
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
