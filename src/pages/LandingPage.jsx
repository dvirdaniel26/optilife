import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, TrendingUp, Activity, ChevronDown, Sparkles, Star, CheckCircle, HelpCircle } from 'lucide-react';

export default function LandingPage() {
  const [selectedMetric, setSelectedMetric] = useState('glucose');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const metricsData = {
    glucose: {
      name: 'Glucose (גלוקוז)',
      value: '108',
      unit: 'mg/dL',
      status: 'high',
      statusText: 'מעל הנורמה ⚠️',
      range: '70 - 100 mg/dL',
      colorClass: 'text-amber-600 bg-amber-50 border-amber-200',
      insight: 'רמת הגלוקוז בדם מעט גבוהה מהטווח התקין בצום. מומלץ להפחית פחמימות פשוטות וסוכרים מעובדים, לשלב דגנים מלאים וסיבים תזונתיים בתפריט היומי, ולבצע פעילות אירובית קלה לאחר הארוחות לשיפור הרגישות לאינסולין.'
    },
    cholesterol: {
      name: 'Cholesterol (כולסטרול LDL)',
      value: '142',
      unit: 'mg/dL',
      status: 'high',
      statusText: 'מעל הנורמה ⚠️',
      range: '0 - 100 mg/dL',
      colorClass: 'text-rose-600 bg-rose-50 border-rose-200',
      insight: 'רמת ה-LDL (הכולסטרול "הרע") גבוהה מהרצוי. כדאי להגביל צריכת שומן רווי (מרגרינה, בשר שמן, גבינות קשות) ולהעשיר את התפריט בשומנים חד-בלתי-רוויים כמו שמן זית, אבוקדו, ואגוזי מלך התומכים בבריאות הלב.'
    },
    iron: {
      name: 'Iron (ברזל)',
      value: '52',
      unit: 'mcg/dL',
      status: 'low',
      statusText: 'נמוך מהנורמה ⚠️',
      range: '60 - 160 mcg/dL',
      colorClass: 'text-blue-600 bg-blue-50 border-blue-200',
      insight: 'רמת הברזל נמוכה מהסף התקין. דבר זה עלול להוביל לעייפות וחוסר אנרגיה. מומלץ להגדיל צריכת בשר רזה, קטניות (עדשים, חומוס) ועלים ירוקים, ולצרוך אותם בשילוב ויטמין C (כמו לימון או פלפל אדום) לשיפור הספיגה.'
    },
    vitaminD: {
      name: 'Vitamin D (ויטמין D)',
      value: '34',
      unit: 'ng/mL',
      status: 'normal',
      statusText: 'תקין מעולה ✅',
      range: '30 - 100 ng/mL',
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      insight: 'רמת ויטמין D תקינה ובטווח הרצוי לשמירה על בריאות השלד, השיניים וספיגת סידן תקינה בגוף. המשך/י לשמור על תזונה מאוזנת וחשיפה מבוקרת לשמש.'
    }
  };

  const faqs = [
    {
      q: 'כיצד מנוע ה-AI מנתח את בדיקות הדם שלי?',
      a: 'אנו משתמשים במודל ה-AI המתקדם ביותר של Google (Gemini) המאומן על זיהוי סמנים רפואיים. המערכת קוראת את הערכים ותחומי הייחוס של המעבדה ישירות מהצילום שהעלית, משווה אותם לטווחי הייחוס ומפיקה ניתוח בעברית פשוטה וברורה.'
    },
    {
      q: 'האם המידע הרפואי והאישי שלי מאובטח?',
      a: 'חד משמעית כן. אנו מיישמים את תקני האבטחה המחמירים ביותר. כל הנתונים ובדיקות הדם שלך נשמרים מוצפנים בבסיס הנתונים של Supabase, ורק לך יש הרשאת גישה וצפייה בהם. המידע שלך לעולם לא ישותף עם גורם שלישי ללא אישורך.'
    },
    {
      q: 'האם המלצות התזונה והכושר מחליפות ייעוץ רפואי?',
      a: 'לא, המערכת מיועדת להעשרה, הכוונה ומעקב אישי בלבד. התובנות מבוססות על מחקרים ונתונים קליניים כלליים, אך אינן מהוות תחליף לאבחנה של רופא משפחה, רופא מומחה או תזונאי קליני מוסמך. אנו ממליצים לשתף את הדוחות המופקים עם הרופא המטפל.'
    },
    {
      q: 'אילו מסלולי מנויים קיימים ובמה הם נבדלים?',
      a: 'אנו מציעים 4 מסלולים: מסלול בסיסי (חינמי, להעלאת בדיקה 1), מסלול מתקדם (ב-₪19 המאפשר עד 3 בדיקות ותוכנית בריאות אחת), מסלול מקצועי (ב-₪29 המאפשר בדיקות ותוכניות ללא הגבלה, וגישה למרכז בריאות אישי מתקדם), ומסלול אולטימטיבי (ב-₪49 הכולל מאמן בריאות AI אינטראקטיבי 24/7, מחולל תפריטים, ואינטגרציה מלאה למרכז הבריאות).'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-800" dir="rtl">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-full h-[120vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-blue-400/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 blur-[130px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 bg-white/70 backdrop-blur-md border-b border-slate-200/50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined font-bold text-lg">favorite</span>
          </div>
          <span className="text-2xl font-black font-heading text-slate-900 tracking-tight">OptiLife</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-slate-600 hover:text-blue-600 font-bold transition-colors text-sm">
            התחברות
          </Link>
          <Link to="/auth" className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all hover:scale-105 shadow-md shadow-slate-900/10 text-xs">
            להתחיל בחינם
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Text */}
          <div className="lg:col-span-6 text-right space-y-6">
            <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
              מפענח בדיקות דם ומנטר בריאות מבוסס AI
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading text-slate-900 leading-[1.15]">
              הבריאות שלך, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500">חכמה מאי פעם.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed font-body">
              אל תישאר בערפל לגבי תוצאות המעבדה שלך. OptiLife מתרגמת את בדיקות הדם שלך לתובנות בריאותיות מותאמות אישית, מנגישה גרפים ומגמות, ובונה עבורך תוכנית תזונה וכושר קלינית לשיפור המדדים.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Link to="/auth" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-teal-500 text-white px-8 py-4 rounded-full font-bold text-md hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2">
                הרשמה בחינם
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <a href="#features" className="w-full sm:w-auto text-center border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-full font-bold text-md transition-all">
                למד עוד
              </a>
            </div>
          </div>

          {/* Right Interactive Dashboard Mockup */}
          <div className="lg:col-span-6 w-full animate-in fade-in zoom-in duration-700">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-blue-600 to-teal-500"></div>

              {/* Mock Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-heading font-extrabold text-slate-900 text-md">תיק בריאות ממוחשב (דמו אינטראקטיבי)</h3>
                  <p className="text-slate-400 text-xs mt-0.5">לחץ על המדדים לבדיקת פעולת ה-AI 🧠</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>מעודכן</span>
                </div>
              </div>

              {/* Grid of Metric Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.keys(metricsData).map((key) => {
                  const m = metricsData[key];
                  const isSelected = selectedMetric === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none text-right flex flex-col justify-between ${isSelected
                          ? 'border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5 ring-2 ring-blue-500/10'
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                        }`}
                    >
                      <span className="text-slate-500 text-xs font-bold truncate">{m.name.split(' ')[0]}</span>
                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-2xl font-black text-slate-900">{m.value}</span>
                        <span className="text-slate-400 text-[10px]">{m.unit}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold border px-2 py-0.5 rounded-full w-fit ${m.colorClass}`}>
                        {m.statusText.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* AI Analysis Panel */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 relative overflow-hidden transition-all duration-300 min-h-[160px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center gap-2 mb-2 text-teal-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4 animate-bounce" />
                    <span>פענוח מנוע בינה מלאכותית (OptiAI)</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mb-1.5">{metricsData[selectedMetric].name}</h4>
                  <p className="text-slate-300 text-xs leading-relaxed transition-all duration-300">
                    {metricsData[selectedMetric].insight}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center text-[10px] text-slate-400">
                  <span>טווח תקין מומלץ: {metricsData[selectedMetric].range}</span>
                  <span className="font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">קליק לשינוי 👆</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 pb-16">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
              <span className="text-4xl font-black text-blue-600 block mb-1">10,000+</span>
              <span className="text-slate-500 text-[10px] font-bold">בדיקות דם שפוענחו בהצלחה</span>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center animate-in fade-in slide-in-from-bottom-8 duration-350">
              <span className="text-4xl font-black text-teal-505 text-teal-500 block mb-1">98%</span>
              <span className="text-slate-500 text-[10px] font-bold">מדד שביעות רצון משתמשים</span>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center animate-in fade-in slide-in-from-bottom-10 duration-400">
              <span className="text-4xl font-black text-emerald-500 block mb-1">14%</span>
              <span className="text-slate-500 text-[10px] font-bold">שיפור במדדים תוך 90 יום</span>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center animate-in fade-in slide-in-from-bottom-12 duration-450">
              <span className="text-4xl font-black text-indigo-600 block mb-1">24/7</span>
              <span className="text-slate-500 text-[10px] font-bold">ליווי ותמיכה רפואית AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white border-y border-slate-200/60 py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-slate-900 mb-4">איך זה עובד?</h2>
            <p className="text-slate-600 text-md leading-relaxed">שלושה צעדים פשוטים להשגת שליטה מלאה על הבריאות, התזונה ואורח החיים שלך</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4 group">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-lg shadow-blue-500/5 group-hover:scale-110 transition-transform relative">
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 pt-2">צלמו והעלו תמונה</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                העלו צילום ברור או צילום מסך של דף תוצאות בדיקת הדם שלכם מהנייד.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4 group">
              <div className="w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shadow-lg shadow-teal-500/5 group-hover:scale-110 transition-transform relative">
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span className="material-symbols-outlined text-4xl">psychology</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 pt-2">ה-AI מנתח ומזהה</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                מנוע ה-AI מפענח את סמני הבדיקה, מזהה חריגות ומשווה אותן להיסטוריה שלכם באופן מיידי.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4 group">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-500/5 group-hover:scale-110 transition-transform relative">
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span className="material-symbols-outlined text-4xl">nutrition</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 pt-2">בניית תוכנית בריאות</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                קבלו תפריט תזונה קליני ותוכנית אימונים שבועית מותאמת מדדים להחזרת האיזון לגוף.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Features Detail Section */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-slate-900 mb-4">למה לבחור ב-OptiLife?</h2>
            <p className="text-slate-600 text-md">הטכנולוגיות המתקדמות ביותר בשירות האופטימיזציה של הגוף שלך</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Activity className="w-8 h-8 text-blue-600" />}
              title="מעקב מדדים מתקדם"
              description="הצגה ויזואלית של כל מדדי בדיקות הדם במקום אחד. גרפים ברורים שמראים עליות וירידות לאורך השנים כדי לזהות מגמות לפני שהן הופכות לבעיה."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-teal-500" />}
              title="פענוח AI קליני מהיר"
              description="המערכת מנתחת את בדיקות הדם בשניות ספורות ומספקת הסברים בעברית פשוטה על כל סמן, מה הוא אומר, ואיזה השפעות פיזיולוגיות יש לו עליך."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-emerald-500" />}
              title="אבטחה ופרטיות מלאה"
              description="מידע רפואי הוא הרגיש ביותר. אנו מאבטחים ומצפינים את הנתונים שלך בשרתים מוגנים. רק לך יש שליטה על המידע והיסטוריית הבדיקות שלך."
            />
          </div>
        </div>
      </section>

      {/* Supported Markers Section */}
      <section className="bg-slate-100/70 py-24 border-t border-slate-200/40 relative z-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-slate-900 mb-4">מה אנחנו מנתחים?</h2>
            <p className="text-slate-600 text-md">OptiLife תומכת ומפענחת מעל 50 מדדים ביולוגיים מרכזיים המחולקים לקטגוריות קליניות</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-bold text-xl">🩺</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">סוכרת ומטבוליזם</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">סמני מפתח להערכת רמות הסוכר, הרגישות לאינסולין ומניעת סיכונים מטבוליים בצורה מדויקת.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">גלוקוז (Glucose)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">המוגלובין מסוכרר (HbA1c)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">אינסולין (Insulin)</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-650 flex items-center justify-center mb-5 font-bold text-xl">🍔</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">פרופיל שומנים (ליפידים)</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">הערכה רחבה של בריאות הלב וכלי הדם באמצעות מעקב שוטף אחר כולסטרול ושומני הדם.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">כולסטרול LDL</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">כולסטרול HDL</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">כולסטרול כללי</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">טריגליצרידים</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 font-bold text-xl">🥦</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">ויטמינים ומינרלים</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">מעקב אחר רמות החיוניות בגוף למניעת חוסרים, תשישות ושיפור רמות האנרגיה היומיות.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">ויטמין D</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">ויטמין B12</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">ברזל (Iron)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">פריטין (Ferritin)</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 font-bold text-xl">🧪</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">תפקודי כבד וכליות</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">סינון רעלים ופעילות אנזימטית להבטחת עבודה תקינה של האיברים המנקים בגוף.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">ALT & AST</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">קריאטינין (Creatinine)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">אוריאה (Urea)</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center mb-5 font-bold text-xl">🩸</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">ספירת דם מלאה (CBC)</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">מצב מערכת החיסון, הובלת חמצן בגוף ותהליכי קרישה טבעיים לאורך זמן.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">המוגלובין (Hemoglobin)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">כדוריות דם אדומות</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">כדוריות דם לבנות</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm text-right flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5 font-bold text-xl">⚡</div>
                <h4 className="font-heading font-extrabold text-slate-950 text-lg mb-2">אלקטרוליטים וחלבונים</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">איזון נוזלים ומלחים בגוף התומכים בפעילות הלב והשרירים באופן סדיר.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">נתרן (Sodium)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">אשלגן (Potassium)</span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">סידן (Calcium)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials (Glassmorphism design) */}
      <section className="bg-slate-900 text-white py-24 relative overflow-hidden z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-white mb-4">מה אומרים עלינו?</h2>
            <p className="text-slate-400 text-md leading-relaxed">משתמשים ורופאים משתפים את חוויותיהם מהשימוש היומיומי בפלטפורמת OptiLife</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute top-6 left-6 text-white/10">
                <span className="material-symbols-outlined text-5xl">format_quote</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8 relative z-10">
                "בזכות המערכת והמלצות התזונה, הצלחתי להוריד את רמת כולסטרול ה-LDL שלי ב-15% תוך 3 חודשים בלבד. היכולת להבין מה המשמעות של כל סמן בעברית פשוטה נותנת המון כוח ושקט נפשי."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  יכ
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">יוסי כהן</h4>
                  <p className="text-slate-500 text-[10px]">מנוי במסלול Premium ⭐⭐⭐⭐⭐</p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute top-6 left-6 text-white/10">
                <span className="material-symbols-outlined text-5xl">format_quote</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8 relative z-10">
                "כרופאה, אני מוצאת את OptiLife כלי עזר מדהים למטופלים שלי. המעקב אחרי מגמות בדיקות הדם עוזר להם להבין את המצב הפיזיולוגי שלהם בצורה אינטואיטיבית ומקצר את זמני ההסבר בקליניקה."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  דל
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">ד״ר מיכל לוי</h4>
                  <p className="text-slate-500 text-[10px]">קרדיולוגית מומחית ⭐⭐⭐⭐⭐</p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute top-6 left-6 text-white/10">
                <span className="material-symbols-outlined text-5xl">format_quote</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8 relative z-10">
                "המאמן האישי מלווה אותי 24/7. הדיוק של ההמלצות על בסיס הבדיקות שלי פשוט מטורף. דף חיפוש התרופות החדש עוזר לי להבין תופעות לוואי ואינטראקציות בשניות. זה פשוט רופא בכיס."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  לש
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">ליאת ששון</h4>
                  <p className="text-slate-500 text-[10px]">מנויה במסלול אולטימטיבי ⭐⭐⭐⭐⭐</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="bg-white py-24 border-b border-slate-200/60 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <HelpCircle className="w-10 h-10 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black font-heading text-slate-900 mb-4">שאלות נפוצות</h2>
            <p className="text-slate-600 text-md">כל מה שרציתם לדעת על הפלטפורמה ותהליכי הניתוח</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-right flex justify-between items-center font-bold text-slate-950 hover:bg-slate-100/50 transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="p-6 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-200/20 bg-white/50 animate-in slide-in-from-top-2 duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-tr from-blue-600 to-teal-500 text-white text-center relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_100%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-5xl font-black font-heading mb-6">מוכן לקחת שליטה על הבריאות שלך?</h2>
          <p className="text-lg text-white/90 max-w-xl mx-auto mb-10 leading-relaxed font-body">
            הצטרף לאלפי משתמשים שכבר מבינים את בדיקות הדם שלהם, משפרים את המדדים ונהנים מאיכות חיים אופטימלית בעזרת AI.
          </p>
          <Link to="/auth" className="inline-flex items-center gap-2 bg-slate-950 text-white font-bold px-10 py-4.5 rounded-full hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 shadow-xl text-lg border-0 cursor-pointer">
            התחל עכשיו בחינם
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-16 text-center border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-sm font-bold">favorite</span>
            </div>
            <span className="text-xl font-bold font-heading text-white tracking-tight">OptiLife</span>
          </div>
          <p className="text-xs" dir="ltr">© 2026 OptiLife Wellness Hub. All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 custom-shadow hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group text-right flex flex-col justify-between">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-3 font-heading">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed font-body">{description}</p>
      </div>
    </div>
  );
}
