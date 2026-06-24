import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, Zap, TrendingUp, Activity,
  ChevronDown, Sparkles, CheckCircle, HelpCircle,
  Brain, Salad, Dumbbell, Heart, Lock, Star, BarChart2
} from 'lucide-react';

export default function LandingPage() {
  const [selectedMetric, setSelectedMetric] = useState('glucose');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const metricsData = {
    glucose: {
      name: 'Glucose (גלוקוז)',
      value: '108',
      unit: 'mg/dL',
      status: 'high',
      statusText: 'מעל הנורמה',
      colorClass: 'bg-status-error/10 text-status-error',
      insight: 'רמת הגלוקוז בדם מעט גבוהה מהטווח התקין. מומלץ להפחית פחמימות פשוטות ולשלב דגנים מלאים וסיבים תזונתיים בתפריט היומי, ולבצע פעילות אירובית קלה לאחר הארוחות לשיפור הרגישות לאינסולין.'
    },
    cholesterol: {
      name: 'Cholesterol (כולסטרול LDL)',
      value: '142',
      unit: 'mg/dL',
      status: 'high',
      statusText: 'מעל הנורמה',
      colorClass: 'bg-status-error/10 text-status-error',
      insight: 'רמת ה-LDL גבוהה מהרצוי. כדאי להגביל שומן רווי ולהעשיר את התפריט בשומנים חד-בלתי-רוויים כמו שמן זית, אבוקדו ואגוזי מלך התומכים בבריאות הלב.'
    },
    iron: {
      name: 'Iron (ברזל)',
      value: '52',
      unit: 'mcg/dL',
      status: 'low',
      statusText: 'נמוך מהנורמה',
      colorClass: 'bg-amber-100 text-amber-700',
      insight: 'רמת הברזל נמוכה מהסף התקין. מומלץ להגדיל צריכת בשר רזה, קטניות ועלים ירוקים, בשילוב ויטמין C לשיפור הספיגה.'
    },
    vitaminD: {
      name: 'Vitamin D (ויטמין D)',
      value: '34',
      unit: 'ng/mL',
      status: 'normal',
      statusText: 'תקין ✅',
      colorClass: 'bg-status-success/10 text-status-success',
      insight: 'רמת ויטמין D תקינה ובטווח הרצוי. המשך/י לשמור על תזונה מאוזנת וחשיפה מבוקרת לשמש.'
    }
  };

  const faqs = [
    {
      q: 'כיצד מנוע ה-AI מנתח את בדיקות הדם שלי?',
      a: 'אנו משתמשים במודל Gemini 2.5 Flash של Google. המערכת קוראת את הערכים ותחומי הייחוס ישירות מהצילום שהעלית, משווה אותם לטווחי הנורמה ומפיקה ניתוח בעברית פשוטה וברורה.'
    },
    {
      q: 'האם המידע הרפואי שלי מאובטח?',
      a: 'חד משמעית כן. כל הנתונים ובדיקות הדם שלך נשמרים מוצפנים בבסיס הנתונים של Supabase תחת Row-Level Security. רק לך יש הרשאת גישה וצפייה בהם.'
    },
    {
      q: 'האם המלצות התזונה מחליפות ייעוץ רפואי?',
      a: 'לא. המערכת מיועדת להעשרה, הכוונה ומעקב אישי בלבד. אנו ממליצים תמיד לשתף את הדוחות עם הרופא המטפל.'
    },
    {
      q: 'אילו מסלולי מנויים קיימים?',
      a: 'ישנם 4 מסלולים: בסיסי (חינמי), מתקדם (₪19/חודש), מקצועי (₪29/חודש) ואולטימטיבי (₪49/חודש) הכולל מאמן AI אינטראקטיבי 24/7.'
    }
  ];

  const currentMetric = metricsData[selectedMetric];

  return (
    <div className="min-h-screen bg-background font-body text-on-surface" dir="rtl">

      {/* ══ Navigation ══ */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-12 py-4 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/20">
            <span className="material-symbols-outlined font-bold text-lg">favorite</span>
          </div>
          <span className="text-2xl font-black font-heading text-primary tracking-tight">OptiLife</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-on-surface-variant hover:text-primary font-bold transition-colors text-sm hidden sm:block">
            התחברות
          </Link>
          <Link to="/auth" className="bg-secondary text-white px-5 py-2.5 rounded-full font-bold hover:bg-secondary/90 transition-all hover:scale-105 shadow-md shadow-secondary/20 text-xs">
            להתחיל בחינם
          </Link>
        </div>
      </nav>

      {/* ══ Hero Section ══ */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36">
        {/* Ambient background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Right: text */}
          <div className="lg:col-span-6 text-right space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-extrabold text-xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
              מפענח בדיקות דם ומנטר בריאות מבוסס AI
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-[56px] font-black font-heading text-primary leading-[1.15]">
              הבריאות שלך,{' '}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-secondary to-primary">
                חכמה מאי פעם.
              </span>
            </h1>
            <p className="text-base text-on-surface-variant leading-relaxed font-semibold max-w-lg">
              אל תישאר בערפל לגבי תוצאות המעבדה שלך. OptiLife מתרגמת את בדיקות הדם לתובנות מותאמות אישית, מנגישה גרפים ומגמות, ובונה תוכנית תזונה וכושר קלינית לשיפור המדדים.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                to="/auth"
                className="w-full sm:w-auto bg-accent-action text-primary px-8 py-4 rounded-full font-bold text-sm hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                הרשמה בחינם
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto text-center border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface px-8 py-4 rounded-full font-bold text-sm transition-all"
              >
                למד עוד
              </a>
            </div>
          </div>

          {/* Left: Interactive Demo Card */}
          <div className="lg:col-span-6 w-full">
            <div className="bg-surface rounded-3xl p-6 md:p-8 custom-shadow border border-outline/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-secondary to-primary" />

              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4 mb-6">
                <div>
                  <h3 className="font-heading font-extrabold text-primary text-sm">תיק בריאות ממוחשב (דמו אינטראקטיבי)</h3>
                  <p className="text-on-surface-variant text-xs mt-0.5">לחץ על המדדים לבדיקת פעולת ה-AI 🧠</p>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  מעודכן
                </span>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(metricsData).map(([key, m]) => {
                  const isSelected = selectedMetric === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none text-right flex flex-col justify-between ${
                        isSelected
                          ? 'border-secondary bg-secondary/5 shadow-md shadow-secondary/10 ring-2 ring-secondary/15'
                          : 'border-outline-variant/40 bg-background hover:bg-surface-variant'
                      }`}
                    >
                      <span className="text-on-surface-variant text-xs font-bold truncate">{m.name.split(' ')[0]}</span>
                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-2xl font-black text-primary">{m.value}</span>
                        <span className="text-on-surface-variant text-[10px]">{m.unit}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full w-fit ${m.colorClass}`}>
                        {m.statusText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* AI Analysis Panel */}
              <div className="bg-primary text-white rounded-2xl p-5 relative overflow-hidden min-h-[150px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-28 h-28 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center gap-2 mb-2 text-accent-action font-bold text-xs">
                    <Sparkles className="w-4 h-4 animate-bounce" />
                    <span>פענוח מנוע בינה מלאכותית (OptiAI)</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mb-1.5">{currentMetric.name}</h4>
                  <p className="text-white/80 text-xs leading-relaxed">{currentMetric.insight}</p>
                </div>
                <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center text-[10px] text-white/50">
                  <span>לחץ על מדד אחר לשינוי</span>
                  <span className="font-mono text-accent-action bg-white/5 px-2 py-0.5 rounded">👆 אינטראקטיבי</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Stats Bar ══ */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: '10,000+', label: 'בדיקות דם שפוענחו', color: 'text-secondary' },
              { num: '98%', label: 'מדד שביעות רצון', color: 'text-secondary' },
              { num: '14%', label: 'שיפור ממוצע במדדים', color: 'text-secondary' },
              { num: '24/7', label: 'ליווי מאמן AI', color: 'text-secondary' },
            ].map(({ num, label, color }) => (
              <div key={label} className="bg-surface rounded-3xl p-6 border border-outline/10 custom-shadow text-center">
                <span className={`text-3xl font-black block mb-1 ${color}`}>{num}</span>
                <span className="text-on-surface-variant text-[11px] font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ How It Works ══ */}
      <section className="bg-surface border-y border-outline-variant/30 py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full text-xs font-extrabold text-secondary mb-4">
              <Activity className="w-3.5 h-3.5" />
              3 צעדים פשוטים
            </span>
            <h2 className="text-3xl md:text-4xl font-black font-heading text-primary mb-4">איך זה עובד?</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">מהעלאת הבדיקה ועד לתוכנית בריאות מפורטת — הכל בכמה דקות</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '1', icon: 'add_photo_alternate', title: 'צלמו והעלו תמונה', desc: 'העלו צילום ברור של דף תוצאות בדיקת הדם שלכם מהנייד או מהמחשב.', color: 'bg-secondary/10 text-secondary' },
              { step: '2', icon: 'psychology', title: 'ה-AI מנתח ומזהה', desc: 'מנוע ה-AI מפענח את סמני הבדיקה, מזהה חריגות ומשווה אותן להיסטוריה שלכם באופן מיידי.', color: 'bg-primary/10 text-primary' },
              { step: '3', icon: 'nutrition', title: 'בניית תוכנית בריאות', desc: 'קבלו תפריט תזונה קליני ותוכנית אימונים שבועית מותאמת מדדים להחזרת האיזון לגוף.', color: 'bg-accent-action/30 text-primary' },
            ].map(({ step, icon, title, desc, color }) => (
              <div key={step} className="flex flex-col items-center text-center space-y-4 group">
                <div className={`w-20 h-20 rounded-3xl ${color} border border-outline/10 flex items-center justify-center custom-shadow group-hover:scale-110 transition-transform relative`}>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-secondary text-white rounded-full flex items-center justify-center text-xs font-bold shadow">{step}</span>
                  <span className="material-symbols-outlined text-4xl">{icon}</span>
                </div>
                <h3 className="text-lg font-bold text-primary pt-2">{title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Features Section ══ */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-primary mb-4">למה לבחור ב-OptiLife?</h2>
            <p className="text-on-surface-variant text-sm">הטכנולוגיות המתקדמות ביותר בשירות האופטימיזציה של הגוף שלך</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <BarChart2 className="w-7 h-7 text-secondary" />, title: 'מעקב מדדים מתקדם', desc: 'גרפים ברורים שמראים עליות וירידות לאורך השנים כדי לזהות מגמות לפני שהן הופכות לבעיה.', color: 'bg-secondary/10' },
              { icon: <Brain className="w-7 h-7 text-primary" />, title: 'פענוח AI קליני מהיר', desc: 'המערכת מנתחת את בדיקות הדם בשניות ספורות ומספקת הסברים בעברית פשוטה על כל סמן.', color: 'bg-primary/10' },
              { icon: <Shield className="w-7 h-7 text-status-success" />, title: 'אבטחה ופרטיות מלאה', desc: 'מידע רפואי הוא הרגיש ביותר. הנתונים שלך מוצפנים בשרתים מוגנים — רק לך יש שליטה.', color: 'bg-status-success/10' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="bg-surface p-8 rounded-3xl border border-outline/10 custom-shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-right">
                <div className={`w-14 h-14 rounded-2xl ${color} border border-outline/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <h3 className="text-lg font-extrabold text-primary mb-3 font-heading">{title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Supported Markers ══ */}
      <section className="bg-surface border-t border-outline-variant/30 py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-primary mb-4">מה אנחנו מנתחים?</h2>
            <p className="text-on-surface-variant text-sm">OptiLife תומכת ומפענחת מעל 50 מדדים ביולוגיים מרכזיים</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji: '🩺', title: 'סוכרת ומטבוליזם', desc: 'סמני מפתח להערכת רמות הסוכר והרגישות לאינסולין.', tags: ['גלוקוז (Glucose)', 'המוגלובין מסוכרר (HbA1c)', 'אינסולין (Insulin)'] },
              { emoji: '🍔', title: 'פרופיל שומנים', desc: 'הערכה רחבה של בריאות הלב וכלי הדם.', tags: ['כולסטרול LDL', 'כולסטרול HDL', 'כולסטרול כללי', 'טריגליצרידים'] },
              { emoji: '🥦', title: 'ויטמינים ומינרלים', desc: 'מעקב אחר רמות החיוניות למניעת חוסרים ועייפות.', tags: ['ויטמין D', 'ויטמין B12', 'ברזל (Iron)', 'פריטין (Ferritin)'] },
              { emoji: '🧪', title: 'תפקודי כבד וכליות', desc: 'סינון רעלים ופעילות אנזימטית של האיברים המנקים.', tags: ['ALT & AST', 'קריאטינין (Creatinine)', 'אוריאה (Urea)'] },
              { emoji: '🩸', title: 'ספירת דם מלאה (CBC)', desc: 'מצב מערכת החיסון, הובלת חמצן ותהליכי קרישה.', tags: ['המוגלובין', 'כדוריות דם אדומות', 'כדוריות דם לבנות'] },
              { emoji: '⚡', title: 'אלקטרוליטים וחלבונים', desc: 'איזון נוזלים ומלחים בגוף התומכים בפעילות הלב.', tags: ['נתרן (Sodium)', 'אשלגן (Potassium)', 'סידן (Calcium)'] },
            ].map(({ emoji, title, desc, tags }) => (
              <div key={title} className="bg-background rounded-3xl p-6 border border-outline/10 custom-shadow text-right flex flex-col justify-between hover:border-secondary/30 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-5 text-xl">{emoji}</div>
                  <h4 className="font-heading font-extrabold text-primary text-base mb-2">{title}</h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed mb-4">{desc}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <span key={t} className="bg-surface text-on-surface-variant text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-outline-variant/40">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Testimonials ══ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-secondary/80" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black font-heading text-white mb-4">מה אומרים עלינו?</h2>
            <p className="text-white/70 text-sm leading-relaxed">משתמשים ורופאים משתפים את חוויותיהם מהשימוש היומיומי בפלטפורמת OptiLife</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: 'בזכות המערכת, הצלחתי להוריד את רמת כולסטרול ה-LDL שלי ב-15% תוך 3 חודשים. היכולת להבין מה המשמעות של כל סמן בעברית פשוטה נותנת המון כוח.', name: 'יוסי כהן', role: 'מנוי במסלול מקצועי', initials: 'יכ', color: 'bg-secondary/30 text-secondary' },
              { quote: 'כרופאה, אני מוצאת את OptiLife כלי עזר מדהים למטופלים. המעקב אחרי מגמות בדיקות הדם עוזר להם להבין את המצב שלהם בצורה אינטואיטיבית.', name: 'ד"ר מיכל לוי', role: 'קרדיולוגית מומחית', initials: 'דל', color: 'bg-accent-action/30 text-primary' },
              { quote: 'המאמן האישי מלווה אותי 24/7. הדיוק של ההמלצות על בסיס הבדיקות שלי מדהים. זה פשוט רופא בכיס.', name: 'ליאת ששון', role: 'מנויה במסלול אולטימטיבי', initials: 'לש', color: 'bg-white/10 text-white' },
            ].map(({ quote, name, role, initials, color }) => (
              <div key={name} className="bg-white/8 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col justify-between custom-shadow relative text-right">
                <div className="absolute top-6 left-6 text-white/8">
                  <span className="material-symbols-outlined text-5xl">format_quote</span>
                </div>
                <p className="text-white/85 text-sm leading-relaxed mb-8 relative z-10">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-bold text-sm`}>{initials}</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{name}</h4>
                    <p className="text-white/50 text-[10px]">{role} ⭐⭐⭐⭐⭐</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ Section ══ */}
      <section className="bg-surface border-y border-outline-variant/30 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <HelpCircle className="w-10 h-10 text-secondary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black font-heading text-primary mb-4">שאלות נפוצות</h2>
            <p className="text-on-surface-variant text-sm">כל מה שרציתם לדעת על הפלטפורמה ותהליכי הניתוח</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="bg-background border border-outline/10 rounded-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-right flex justify-between items-center font-bold text-primary hover:bg-surface transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-on-surface-variant shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-secondary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-6 pt-0 text-on-surface-variant text-sm leading-relaxed border-t border-outline-variant/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ CTA Section ══ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/15 via-primary/5 to-background" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-secondary/10 rounded-full text-xs font-extrabold text-secondary mb-6">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            הצטרף לאלפי משתמשים
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-heading text-primary mb-6">מוכן לקחת שליטה על הבריאות שלך?</h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto mb-10 leading-relaxed font-semibold">
            הצטרף לאלפי משתמשים שכבר מבינים את בדיקות הדם שלהם, משפרים את המדדים ונהנים מאיכות חיים אופטימלית בעזרת AI.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-accent-action text-primary font-bold px-10 py-4 rounded-full hover:scale-105 active:scale-95 shadow-xl transition-all text-base cursor-pointer"
          >
            התחל עכשיו בחינם
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer className="bg-surface border-t border-outline-variant/30 py-10 text-center">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-sm font-bold">favorite</span>
            </div>
            <span className="text-lg font-bold font-heading text-primary tracking-tight">OptiLife</span>
          </div>
          <p className="text-on-surface-variant text-xs" dir="ltr">© 2026 OptiLife Wellness Hub. All rights reserved</p>
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <Link to="/auth" className="hover:text-primary transition-colors">התחברות</Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">מחירים</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
