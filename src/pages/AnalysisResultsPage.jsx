import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { supabase } from '../lib/supabase';
import { Loader2, FileSearch } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AnalysisResultsPage() {
  const { profile, session } = useContext(UserContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const navigate = useNavigate();
  const location = useLocation();
  const isFemale = profile?.gender === 'female';
  const passedTestId = location.state?.testId;

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [labResults, setLabResults] = useState([]);
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [passedTestId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;
      
      try {
        let activeTest = null;
        if (passedTestId) {
          const { data: specificTest, error: testError } = await supabase
            .from('medical_tests')
            .select('*')
            .eq('id', passedTestId)
            .single();
          
          if (testError) throw testError;
          activeTest = specificTest;
        } else {
          // 1. Fetch latest test
          const { data: latestTest, error: testError } = await supabase
            .from('medical_tests')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (testError && testError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            throw testError;
          }
          activeTest = latestTest;
        }

        if (activeTest) {
          setTestData(activeTest);
          
          // 2. Fetch lab results for this test
          const { data: results, error: resultsError } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', activeTest.id);
            
          if (resultsError) throw resultsError;
          setLabResults(results || []);

          // 3. Fetch insights for this test
          const { data: insights, error: insightsError } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('test_id', activeTest.id)
            .limit(1)
            .single();
            
          if (insightsError && insightsError.code !== 'PGRST116') throw insightsError;
          if (insights) setInsight(insights);
        }
      } catch (error) {
        console.error('Error fetching analysis data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, passedTestId]);

  if (loading) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-secondary animate-spin" />
      </main>
    );
  }

  if (!testData) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen transition-all">
        <div 
          style={{ width: '100%', minWidth: '280px' }}
          className="p-xl max-w-6xl mx-auto flex flex-col items-center justify-center h-[60vh] text-center"
        >
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
            <FileSearch className="w-12 h-12 text-primary/40" />
          </div>
          <h2 className="font-heading text-3xl text-primary font-bold mb-4">טרם נותחו בדיקות</h2>
          <p 
            style={{ width: '100%', maxWidth: '480px', display: 'block', margin: '0 auto 32px' }}
            className="text-on-surface-variant text-lg"
          >
            לא מצאנו תוצאות מעבדה המקושרות לחשבון שלך. {isFemale ? 'העלי' : 'העלה'} את תוצאות בדיקת הדם שלך כדי שמנוע ה-AI שלנו יוכל לנתח אותן.
          </p>
          <button 
            onClick={() => navigate('/upload')}
            className="bg-accent-action text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            {isFemale ? 'העלי בדיקה ראשונה' : 'העלה בדיקה ראשונה'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all">
      <div className="p-xl max-w-6xl mx-auto space-y-lg">
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="font-heading text-3xl text-primary font-bold mb-2">תוצאות הניתוח</h1>
            <p className="text-on-surface-variant text-sm">
              סוג: {testData.test_name} | 
              תאריך ביצוע: {new Date(testData.test_date).toLocaleDateString('he-IL')} | 
              תאריך העלאה: {new Date(testData.created_at).toLocaleDateString('he-IL')}
            </p>
          </div>
        </div>

        {insight && (
          <div className="bg-white p-xl rounded-xl custom-shadow border border-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-secondary"></div>
            <div className="flex items-center gap-sm mb-md">
              <span className="material-symbols-outlined text-secondary text-3xl">psychology</span>
              <h2 className="font-heading text-2xl text-primary font-bold">סיכום תובנות AI</h2>
            </div>
            <div className="text-on-surface-variant font-body leading-relaxed text-lg whitespace-pre-wrap pr-4">
              {insight.summary_text}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl custom-shadow border border-white overflow-hidden mt-8">
          <div className="p-lg border-b border-slate-50">
            <h3 className="text-xl font-bold text-primary font-heading flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">science</span>
              מדדים שזוהו בתמונה
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-on-surface-variant text-sm font-bold uppercase tracking-wider">
                  <th className="px-xl py-md border-b border-slate-100">מדד</th>
                  <th className="px-xl py-md border-b border-slate-100">תוצאה</th>
                  <th className="px-xl py-md border-b border-slate-100">טווח נורמה</th>
                  <th className="px-xl py-md border-b border-slate-100">סטטוס</th>
                </tr>
              </thead>
              <tbody className="text-on-surface font-body">
                {labResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-on-surface-variant">לא זוהו מדדים ספציפיים בבדיקה זו.</td>
                  </tr>
                ) : (
                  labResults.map((result) => (
                    <tr key={result.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-xl py-md border-b border-slate-50 font-medium" dir="ltr">{result.marker_name}</td>
                      <td className="px-xl py-md border-b border-slate-50 font-bold" dir="ltr">
                        {result.measured_value} <span className="text-sm font-normal text-on-surface-variant">{result.unit}</span>
                      </td>
                      <td className="px-xl py-md border-b border-slate-50 text-on-surface-variant" dir="ltr">
                        {result.normal_range_min !== null && result.normal_range_max !== null 
                          ? `${result.normal_range_min} - ${result.normal_range_max}`
                          : 'לא זמין'}
                      </td>
                      <td className="px-xl py-md border-b border-slate-50">
                        {result.is_abnormal ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-status-error/10 text-status-error">
                            מחוץ לטווח
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-status-success/10 text-status-success">
                            תקין
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-md pt-md">
          <button 
            onClick={() => navigate('/plan')}
            className="bg-accent-action hover:shadow-lg transition-all rounded-full py-4 px-xl flex items-center justify-center gap-2 text-primary font-bold active:scale-95 text-lg uppercase min-w-[280px]"
          >
            <span className="material-symbols-outlined">bolt</span>
            {isFemale ? 'צרי תוכנית פעולה אישית' : 'צור תוכנית פעולה אישית'}
          </button>
        </div>

        {/* Medical Disclaimer Banner */}
        <div className="mt-8 bg-amber-50/70 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3 text-right" dir="rtl">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1">הבהרה רפואית חשובה:</h4>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              הניתוח וההמלצות לעיל הופקו באופן אוטומטי על ידי מודל בינה מלאכותית (Gemini AI). מידע זה נועד להעשרה בלבד ואינו מחליף חוות דעת רפואית מקצועית, אבחון או טיפול רפואי. אין להשתמש במידע זה לצורך קביעת טיפול רפואי או תזונתי ללא התייעצות עם רופא מוסמך.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
