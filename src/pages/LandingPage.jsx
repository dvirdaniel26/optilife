import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, TrendingUp, Activity } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-body text-on-surface" dir="rtl">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-screen overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-action/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 bg-background/50 backdrop-blur-md border-b border-outline/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <span className="text-2xl font-bold font-heading text-primary tracking-tight">OptiLife</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-on-surface-variant hover:text-primary font-medium transition-colors">
            התחברות
          </Link>
          <Link to="/auth" className="bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-all hover:scale-105 shadow-md shadow-primary/20">
            להתחיל בחינם
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary font-bold text-sm mb-8 animate-in fade-in slide-in-from-bottom-4">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            מערכת חדשה מבוססת בינה מלאכותית
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-heading text-primary mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6">
            הבריאות שלך, <br className="hidden md:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">חכמה מאי פעם.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8">
            פלטפורמה מתקדמת לניתוח בדיקות דם ומעקב אחר מדדי בריאות. קבלת תובנות מותאמות אישית, מבוססות AI, שיעזרו לשפר את איכות החיים.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10">
            <Link to="/auth" className="w-full sm:w-auto bg-accent-action text-primary px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
              הרשמה בחינם
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-all">
              גלה עוד
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="bg-surface/50 border-t border-outline/5 py-24">
          <div className="max-w-6xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-primary mb-4">למה לבחור ב-OptiLife?</h2>
              <p className="text-on-surface-variant text-lg">כל הכלים הדרושים לך כדי לקחת שליטה על הבריאות שלך</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Activity className="w-8 h-8 text-secondary" />}
                title="מעקב צמוד"
                description="מעקב אחר כל מדדי הבריאות שלך במקום אחד, עם גרפים מתקדמים וסטטיסטיקות ברורות."
              />
              <FeatureCard 
                icon={<Zap className="w-8 h-8 text-accent-action" />}
                title="ניתוח AI מתקדם"
                description="המערכת שלנו מנתחת את בדיקות המעבדה שלך ומתריעה על חריגות או מגמות בעייתיות בזמן אמת."
              />
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-primary" />}
                title="פרטיות ואבטחה"
                description="המידע הרפואי שלך מוצפן ומאובטח ברמה הגבוהה ביותר. רק לך יש גישה לנתונים שלך."
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white/60 py-12 text-center border-t border-white/10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">favorite</span>
          </div>
          <span className="text-xl font-bold font-heading text-white tracking-tight">OptiLife</span>
        </div>
        <p>© 2026 כל הזכויות שמורות לפרויקט פיתוח אתרים.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-background p-8 rounded-[24px] border border-outline/10 custom-shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-primary mb-3">{title}</h3>
      <p className="text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}
