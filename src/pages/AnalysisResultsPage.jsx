import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { supabase } from '../lib/supabase';
import { Loader2, FileSearch } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { explainMedicalMarker } from '../lib/gemini';

const MARKER_DICTIONARY = {
  'glucose': { title: 'גלוקוז (Glucose)', description: 'סוכר בדם. המקור העיקרי לאנרגיה של תאי הגוף.', high: 'עלול להעיד על סוכרת או טרום סוכרת, תזונה עתירת פחמימות או סטרס.', low: 'עלול להעיד על תזונה לקויה או עודף אינסולין.', normal: '70-100 mg/dL' },
  'cholesterol': { title: 'כולסטרול (Cholesterol)', description: 'סך הכולסטרול בדם, כולל הטוב והרע.', high: 'מעלה את הסיכון למחלות לב וכלי דם.', low: 'לרוב אינו מהווה בעיה, אך רמות נמוכות מאוד עשויות להעיד על תזונה לקויה.', normal: 'מתחת ל-200 mg/dL' },
  'hdl': { title: 'HDL (הכולסטרול "הטוב")', description: 'מסייע בפינוי עודפי כולסטרול מהדם אל הכבד.', high: 'תקין ומגן על כלי הדם.', low: 'מעלה את הסיכון למחלות לב.', normal: 'מעל 40 mg/dL' },
  'ldl': { title: 'LDL (הכולסטרול "הרע")', description: 'נושא את הכולסטרול לתאים. עודף עלול לשקוע בדפנות כלי הדם.', high: 'גורם סיכון מוביל לטרשת עורקים ומחלות לב.', low: 'תקין ובריא.', normal: 'מתחת ל-130 mg/dL' },
  'triglycerides': { title: 'טריגליצרידים (Triglycerides)', description: 'סוג השומן הנפוץ ביותר בגוף. משמש לאגירת אנרגיה.', high: 'מעלה סיכון למחלות לב, קשור להשמנה, תזונה עתירת סוכרים ואלכוהול.', low: 'מצב תקין ובריא.', normal: 'מתחת ל-150 mg/dL' },
  'iron': { title: 'ברזל (Iron)', description: 'מינרל חיוני ליצירת המוגלובין (המוביל חמצן בדם).', high: 'עלול להיגרם מנטילת יתר של תוספים או מחלות מסוימות.', low: 'מוביל לאנמיה, עייפות, נשירת שיער וחולשה.', normal: '60-170 mcg/dL' },
  'hemoglobin': { title: 'המוגלובין (Hemoglobin)', description: 'חלבון בכדוריות הדם האדומות שמוביל חמצן מהריאות לגוף.', high: 'יכול להעיד על התייבשות או עישון.', low: 'מעיד על אנמיה (לרוב חוסר בברזל או ויטמין B12).', normal: '12-18 g/dL' },
  'wbc': { title: 'WBC (תאי דם לבנים)', description: 'חלק ממערכת החיסון. מגנים על הגוף מפני זיהומים.', high: 'מצביע על זיהום חיידקי, דלקת, או סטרס פיזי.', low: 'יכול להצביע על זיהום ויראלי או פגיעה במערכת החיסון.', normal: '4,500-11,000 /mcL' },
  'rbc': { title: 'RBC (תאי דם אדומים)', description: 'התאים הנושאים חמצן אל רקמות הגוף.', high: 'יכול להעיד על התייבשות או מצבים ריאתיים.', low: 'מעיד על אנמיה או דימום.', normal: '4.2-5.9 M/uL' },
  'platelets': { title: 'טסיות דם (Platelets / PLT)', description: 'רכיבים בדם האחראים על תהליך קרישת הדם ועצירת דימומים.', high: 'עלול להעיד על תגובה לדלקת, חוסר ברזל, או סטרס.', low: 'עלול להגביר נטייה לדימומים. יכול להיגרם מזיהום ויראלי או תרופות.', normal: '150,000-450,000 /mcL' },
  'plt': { title: 'טסיות דם (Platelets / PLT)', description: 'רכיבים בדם האחראים על תהליך קרישת הדם ועצירת דימומים.', high: 'עלול להעיד על תגובה לדלקת, חוסר ברזל, או סטרס.', low: 'עלול להגביר נטייה לדימומים. יכול להיגרם מזיהום ויראלי או תרופות.', normal: '150,000-450,000 /mcL' },
  'neutrophils': { title: 'נויטרופילים (Neutrophils)', description: 'סוג של תאי דם לבנים, הראשונים להגיע לאזור זיהום בגוף (לרוב חיידקי).', high: 'מעיד לרוב על זיהום חיידקי או מצב דלקתי פעיל.', low: 'עלול לחשוף את הגוף לזיהומים.', normal: '40%-75% מכלל ה-WBC' },
  'lymphocytes': { title: 'לימפוציטים (Lymphocytes)', description: 'תאי דם לבנים האחראים לטיפול בזיהומים נגיפיים (וירוסים).', high: 'מעיד לרוב על זיהום ויראלי (כמו שפעת).', low: 'עלול להעיד על פגיעה במערכת החיסון או שימוש בתרופות מסוימות.', normal: '20%-45% מכלל ה-WBC' },
  'monocytes': { title: 'מונוציטים (Monocytes)', description: 'תאי דם לבנים שבולעים חיידקים ותאים מתים. מסייעים בהחלמה מזיהומים.', high: 'יכול להעיד על התאוששות מזיהום ויראלי או חיידקי.', low: 'לרוב אינו בעל משמעות קלינית משמעותית.', normal: '2%-10% מכלל ה-WBC' },
  'eosinophils': { title: 'אאוזינופילים (Eosinophils)', description: 'תאי דם לבנים שפעילים בזמן אלרגיות או זיהומי טפילים.', high: 'מצביע בדרך כלל על נטייה לאלרגיה או אסתמה.', low: 'לרוב אינו בעל משמעות קלינית.', normal: '1%-6% מכלל ה-WBC' },
  'creatinine': { title: 'קריאטינין (Creatinine)', description: 'תוצר פירוק של פעילות השרירים, המופרש דרך הכליות. מהווה מדד עיקרי לתפקודי כליות.', high: 'עלול להעיד על ירידה בתפקוד הכלייתי או התייבשות.', low: 'לרוב מעיד על מסת שריר נמוכה מאוד, לא נחשב למצב מסוכן.', normal: '0.6-1.2 mg/dL' },
  'urea': { title: 'אוריאה (Urea / BUN)', description: 'תוצר פירוק חלבונים בכבד המופרש בשתן. מדד לתפקודי כליות.', high: 'יכול להעיד על התייבשות, תזונה עתירת חלבונים או בעיה כלייתית.', low: 'עלול להעיד על תזונה דלה בחלבון או מחלת כבד.', normal: '10-45 mg/dL' },
  'ast': { title: 'AST (GOT)', description: 'אנזים המצוי בעיקר בכבד, בשריר הלב ובשרירי השלד. מדד לתפקודי כבד.', high: 'מעיד על נזק לתאי הכבד, דלקת, או מאמץ שרירי קיצוני.', low: 'תקין.', normal: '10-40 U/L' },
  'alt': { title: 'ALT (GPT)', description: 'אנזים ספציפי המצוי בכבד. עלייתו מהווה מדד רגיש לפגיעה כבדית.', high: 'מעיד לרוב על מחלת כבד, כבד שומני או נזק תרופתי/אלכוהול.', low: 'תקין.', normal: '10-40 U/L' },
  'bilirubin': { title: 'בילירובין (Bilirubin)', description: 'תוצר פירוק של כדוריות דם אדומות מבוגרות. מעובד על ידי הכבד.', high: 'גורם לצהבת. יכול להעיד על בעיה כבדית או חסימה בדרכי המרה.', low: 'תקין.', normal: 'עד 1.2 mg/dL' },
  'ferritin': { title: 'פריטין (Ferritin)', description: 'חלבון המאגר ברזל בתאי הגוף. מדד המראה את רזרבות הברזל בגוף.', high: 'יכול להעיד על דלקת פעילה או עודף ברזל.', low: 'הסימן הראשון והמדויק ביותר לאנמיה מחוסר ברזל.', normal: '12-300 ng/mL' },
  'b12': { title: 'ויטמין B12', description: 'חיוני למערכת העצבים ויצירת כדוריות דם אדומות.', high: 'לרוב תקין (עודפים מופרשים בשתן).', low: 'גורם לאנמיה ולפגיעה נוירולוגית (חולשה, נימול, בלבול). נפוץ בקרב טבעונים.', normal: '200-900 pg/mL' },
  'folic acid': { title: 'חומצה פולית (Folic Acid)', description: 'ויטמין B9. חיוני לייצור כדוריות דם אדומות ותאים חדשים בגוף.', high: 'לרוב תקין (עודפים מופרשים בשתן).', low: 'מוביל לאנמיה ועלול לגרום למומים בעובר (בזמן היריון).', normal: 'מעל 4 ng/mL' },
  'tsh': { title: 'TSH', description: 'הורמון המגרה את בלוטת התריס, האחראית על קצב חילוף החומרים.', high: 'מצביע על תת-פעילות של בלוטת התריס (עייפות, השמנה).', low: 'מצביע על פעילות יתר של הבלוטה (ירידה במשקל, דופק מהיר).', normal: '0.4-4.0 mIU/L' },
  'vitamin d': { title: 'ויטמין D', description: 'חיוני לספיגת סידן, בריאות העצם ומערכת החיסון.', high: 'נדיר, נגרם מצריכת יתר של תוספים.', low: 'נפוץ מאוד. גורם לחולשת עצם ועייפות. נדרשת חשיפה לשמש או תוסף.', normal: '20-50 ng/mL' },
  'crp': { title: 'CRP', description: 'חלבון המיוצר בכבד בתגובה לדלקת. מדד כללי לתהליכים דלקתיים בגוף.', high: 'מעיד על זיהום (לרוב חיידקי), דלקת פעילה או נזק לרקמה.', low: 'תקין.', normal: 'עד 5 mg/L' },
  'hba1c': { title: 'המוגלובין מסוכרר (HbA1c)', description: 'מדד ממוצע לרמות הסוכר בדם בשלושת החודשים האחרונים.', high: 'מעיד על מחלת סוכרת או מצב טרום סוכרת שלא מאוזנים היטב.', low: 'תקין (אך יכול להיות נמוך כתוצאה מהיפוגליקמיה מרובה).', normal: 'מתחת ל-5.7%' },
  'sodium': { title: 'נתרן (Sodium / Na)', description: 'מלח חיוני לשמירת מאזן הנוזלים בגוף ולתפקוד העצבים והשרירים.', high: 'מעיד בדרך כלל על התייבשות או צריכת מלח גבוהה במיוחד.', low: 'יכול להיגרם משתיית יתר, הקאות, שלשולים או שימוש בתרופות משתנות.', normal: '135-145 mEq/L' },
  'potassium': { title: 'אשלגן (Potassium / K)', description: 'מינרל חשוב לתפקוד מערכת העצבים, השרירים ובעיקר שריר הלב.', high: 'יכול להעיד על בעיה כלייתית. מסוכן לפעילות הלב.', low: 'נגרם מהקאות, שלשולים או תרופות. גורם לחולשת שרירים והפרעות קצב.', normal: '3.5-5.1 mEq/L' },
  'calcium': { title: 'סידן (Calcium / Ca)', description: 'המינרל העיקרי לבניין העצמות והשיניים. חשוב לכיווץ שרירים ולהעברת עצבוב.', high: 'עלול להעיד על פעילות יתר של בלוטת יותרת התריס.', low: 'יכול לגרום להתכווצויות שרירים. עלול להעיד על חוסר בוויטמין D.', normal: '8.5-10.5 mg/dL' },
};

function getMarkerInfo(rawName) {
  const name = rawName.toLowerCase();
  for (const [key, info] of Object.entries(MARKER_DICTIONARY)) {
    if (name.includes(key)) return info;
  }
  return null;
}

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
  const [hasPlan, setHasPlan] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [markerInfoState, setMarkerInfoState] = useState({ loading: false, info: null, error: null });

  const handleMarkerClick = async (result) => {
    setSelectedMarker(result);
    const localInfo = getMarkerInfo(result.marker_name);
    
    if (localInfo) {
      setMarkerInfoState({ loading: false, info: localInfo, error: null });
    } else {
      setMarkerInfoState({ loading: true, info: null, error: null });
      try {
        const aiInfo = await explainMedicalMarker(result.marker_name);
        setMarkerInfoState({ loading: false, info: aiInfo, error: null });
      } catch (err) {
        setMarkerInfoState({ loading: false, info: null, error: err.message });
      }
    }
  };

  const closeMarkerModal = () => {
    setSelectedMarker(null);
    setMarkerInfoState({ loading: false, info: null, error: null });
  };

  const renderStyledText = (rawText) => {
    const parts = rawText.split('**');
    return parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return <strong key={partIdx} className="font-semibold text-primary">{part}</strong>;
      }
      return part;
    });
  };

  const renderFormattedSummary = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(p => p.trim());
    const elements = lines.map((line, idx) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      if (isBullet) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
            <span className="mt-2 w-2 h-2 rounded-full bg-secondary shrink-0" />
            <p className="leading-7 text-sm text-on-surface-variant font-body flex-1">
              {renderStyledText(content)}
            </p>
          </div>
        );
      }
      return (
        <p key={idx} className="leading-8 text-sm text-on-surface-variant font-body">
          {renderStyledText(trimmed)}
        </p>
      );
    });
    return <div className="space-y-3">{elements}</div>;
  };


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
            .maybeSingle();
          
          if (testError) throw testError;
          activeTest = specificTest;
        } else {
          // 1. Fetch latest test
          const { data: latestTest, error: testError } = await supabase
            .from('medical_tests')
            .select('*')
            .eq('user_id', session.user.id)
            .in('status', ['completed', 'נותח'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (testError) {
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
            .maybeSingle();
            
          if (insightsError) throw insightsError;
          if (insights) setInsight(insights);

          // 4. Check if an action plan already exists for this specific test
          const { data: existingPlan } = await supabase
            .from('ai_insights')
            .select('id')
            .eq('test_id', activeTest.id)
            .like('summary_text', 'ACTION_PLAN:%')
            .limit(1)
            .maybeSingle();
          setHasPlan(!!existingPlan);
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
    <main className="md:pr-72 pt-24 min-h-screen transition-all bg-background">
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl text-primary font-black">תוצאות הניתוח</h1>
            <p className="text-on-surface-variant text-xs md:text-sm font-semibold flex flex-wrap gap-x-2 gap-y-1">
              <span>סוג: <span className="text-primary">{testData.test_name}</span></span>
              <span className="opacity-40">|</span>
              <span>תאריך ביצוע: <span className="text-primary">{new Date(testData.test_date).toLocaleDateString('he-IL')}</span></span>
              <span className="opacity-40">|</span>
              <span>תאריך העלאה: <span className="text-primary">{new Date(testData.created_at).toLocaleDateString('he-IL')}</span></span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={async () => {
                if(window.confirm('האם אתה בטוח שברצונך למחוק בדיקה זו?')) {
                  const { data: { session: currentSession } } = await supabase.auth.getSession();
                  if (!currentSession) return;
                  await fetch('/api/delete-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` },
                    body: JSON.stringify({ testId: testData.id })
                  });
                  navigate('/tests');
                }
              }}
              className="bg-red-50 text-red-500 hover:bg-red-100 font-bold px-4 py-2 rounded-xl text-sm transition-all border-0 cursor-pointer"
            >
              מחק בדיקה
            </button>
            <button 
              onClick={() => navigate('/tests')}
              className="flex items-center gap-1.5 text-slate-600 hover:text-primary font-bold text-sm bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-all cursor-pointer w-fit border border-slate-200 hover:border-slate-300 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">list_alt</span>
              <span>כל הבדיקות</span>
            </button>
            <button 
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 text-secondary hover:text-secondary/80 font-bold text-sm bg-secondary/5 hover:bg-secondary/10 px-4 py-2.5 rounded-xl transition-all cursor-pointer w-fit border border-secondary/10 hover:border-secondary/20 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>העלאת בדיקה נוספת</span>
            </button>
          </div>
        </div>

        {insight && (
          <div className="bg-gradient-to-br from-secondary/5 via-white to-primary/5 p-5 md:p-8 rounded-2xl custom-shadow border border-secondary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-secondary to-primary"></div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <span className="p-2 bg-secondary/15 text-secondary rounded-xl">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'wght' 500" }}>psychology</span>
              </span>
              <div>
                <h2 className="font-heading text-xl text-primary font-bold leading-tight">ניתוח AI מקצועי</h2>
                <p className="text-[11px] text-on-surface-variant font-semibold mt-0.5">פירוש הממצאים וחיבור בין המדדים</p>
              </div>
            </div>
            <div className="text-right pr-2" dir="rtl">
              {renderFormattedSummary(insight.summary_text)}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl custom-shadow border border-slate-100 overflow-hidden mt-8">
          <div className="p-5 md:p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary font-heading flex items-center gap-2">
              <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">science</span>
              </span>
              <span>מדדים שזוהו בתמונה</span>
            </h3>
            <span className="text-[10px] font-extrabold bg-primary/5 text-primary px-2.5 py-1 rounded-full uppercase">
              {labResults.length} מדדים
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">מדד</th>
                  <th className="px-6 py-4 border-b border-slate-100">תוצאה</th>
                  <th className="px-6 py-4 border-b border-slate-100">טווח נורמה</th>
                  <th className="px-6 py-4 border-b border-slate-100">סטטוס</th>
                </tr>
              </thead>
              <tbody className="text-on-surface font-body text-sm">
                {labResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-on-surface-variant font-semibold">לא זוהו מדדים ספציפיים בבדיקה זו.</td>
                  </tr>
                ) : (
                  labResults.map((result) => (
                    <tr 
                      key={result.id} 
                      className="hover:bg-slate-50/30 transition-colors cursor-pointer group"
                      onClick={() => handleMarkerClick(result)}
                    >
                      <td className="px-6 py-4 border-b border-slate-50 font-bold text-primary group-hover:text-secondary" dir="ltr">{result.marker_name}</td>
                      <td className="px-6 py-4 border-b border-slate-50 font-black text-primary" dir="ltr">
                        {result.measured_value} <span className="text-xs font-semibold text-on-surface-variant">{result.unit}</span>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50 text-on-surface-variant font-semibold" dir="ltr">
                        {result.normal_range_min !== null && result.normal_range_max !== null 
                          ? `${result.normal_range_min} - ${result.normal_range_max}`
                          : 'לא זמין'}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50">
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

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            {labResults.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant font-semibold">לא זוהו מדדים ספציפיים בבדיקה זו.</div>
            ) : (
              labResults.map((result) => (
                <div 
                  key={result.id} 
                  onClick={() => handleMarkerClick(result)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden p-4 pr-5 transition-all hover:shadow-md cursor-pointer"
                >
                  {/* Status Indicator Bar */}
                  <div 
                    className={`absolute right-0 top-0 bottom-0 w-1.5 ${
                      result.is_abnormal ? 'bg-status-error' : 'bg-status-success'
                    }`}
                  />
                  
                  {/* Card Header: Marker Name & Status Badge */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-black text-primary" dir="ltr">
                      {result.marker_name}
                    </span>
                    {result.is_abnormal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-status-error/10 text-status-error border border-status-error/20">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        <span>חורג מהנורמה</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-status-success/10 text-status-success border border-status-success/20">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>תקין</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Card Content: Result vs Range */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block mb-0.5">תוצאה נמדדת</span>
                      <div className="flex items-baseline gap-1" dir="ltr">
                        <span className={`text-lg font-black ${result.is_abnormal ? 'text-status-error' : 'text-primary'}`}>
                          {result.measured_value}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {result.unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block mb-0.5">טווח תקין</span>
                      <div className="flex items-baseline gap-1 text-primary font-semibold text-sm" dir="ltr">
                        <span>
                          {result.normal_range_min !== null && result.normal_range_max !== null 
                            ? `${result.normal_range_min} - ${result.normal_range_max}`
                            : 'לא זמין'}
                        </span>
                        <span className="text-xs font-medium text-on-surface-variant">
                          {result.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button 
            onClick={() => navigate(`/plan?testId=${testData.id}`)}
            className="w-full sm:w-auto bg-accent-action hover:shadow-lg transition-all rounded-full py-3.5 px-8 flex items-center justify-center gap-2 text-primary font-bold active:scale-95 text-base min-w-[280px] border-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">{hasPlan ? 'favorite' : 'bolt'}</span>
            <span>{hasPlan
              ? 'צפה בתוכנית הבריאות'
              : isFemale ? 'צרי תוכנית פעולה אישית' : 'צור תוכנית פעולה אישית'}</span>
          </button>
        </div>

        {/* Medical Disclaimer Banner */}
        <div className="mt-8 bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3 text-right" dir="rtl">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1">הבהרה רפואית חשובה:</h4>
            <p className="text-amber-800 text-[10px] leading-relaxed font-semibold">
              הניתוח וההמלצות לעיל הופקו באופן אוטומטי על ידי מודל בינה מלאכותית (Gemini AI). מידע זה נועד להעשרה בלבד ואינו מחליף חוות דעת רפואית מקצועית, אבחון או טיפול רפואי. אין להשתמש במידע זה לצורך קביעת טיפול רפואי או תזונתי ללא התייעצות עם רופא מוסמך.
            </p>
          </div>
        </div>
      </div>

      {/* Marker Info Modal */}
      {selectedMarker && (() => {
        const { loading: infoLoading, info, error } = markerInfoState;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" dir="rtl" onClick={closeMarkerModal}>
            <div 
              className="bg-white w-full max-w-lg rounded-3xl custom-shadow overflow-hidden transform transition-all border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">science</span>
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-primary" dir="ltr">{info ? info.title : selectedMarker.marker_name}</h3>
                    <p className="text-xs text-on-surface-variant font-semibold mt-0.5">מדריך למדדי הדם</p>
                  </div>
                </div>
                <button 
                  onClick={closeMarkerModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {infoLoading ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <Loader2 className="w-12 h-12 animate-spin text-secondary mb-4" />
                  <p className="text-primary font-bold">Gemini AI מנתח את המדד...</p>
                  <p className="text-xs text-slate-500 mt-1">מייצר הסבר מותאם אישית</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
                  <p className="text-red-600 font-bold">לא ניתן היה לטעון מידע עבור מדד זה.</p>
                  <button onClick={closeMarkerModal} className="mt-4 text-slate-500 underline text-sm">סגור</button>
                </div>
              ) : info ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-1.5 text-sm">
                      <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                      מה זה אומר?
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {info.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl">
                      <h4 className="font-bold text-red-700 mb-2 flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_up</span>
                        רמה גבוהה
                      </h4>
                      <p className="text-xs text-red-900/80 leading-relaxed">{info.high}</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                      <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_down</span>
                        רמה נמוכה
                      </h4>
                      <p className="text-xs text-blue-900/80 leading-relaxed">{info.low}</p>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                    <div>
                      <h4 className="font-bold text-emerald-800 text-sm mb-1">טווח נורמה רגיל</h4>
                      <p className="text-xs text-emerald-900/80" dir="ltr">{info.normal}</p>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2">
                    <button 
                      onClick={closeMarkerModal}
                      className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold px-6 py-2.5 rounded-full transition-all text-sm border-0 cursor-pointer"
                    >
                      הבנתי, תודה
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })()}

    </main>
  );
}
