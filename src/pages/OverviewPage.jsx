export default function OverviewPage() {
  return (
    <main className="pr-72 pt-24 min-h-screen">
      <div className="p-xl max-w-6xl mx-auto">
        <div className="mb-xl">
          <h2 className="font-heading text-3xl text-primary mb-xs">המדדים שלך, מאיה</h2>
          <p className="font-body text-lg text-on-surface-variant">סקירה כללית של מדדי הבריאות המרכזיים שלך בתוך מרחב הבריאות האישי</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
          {/* Glucose */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all">
            <div className="flex justify-between items-start mb-md">
              <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">opacity</span></div>
              <span className="text-[10px] font-bold text-secondary bg-secondary/5 px-2 py-1 rounded-full">מאוזן</span>
            </div>
            <p className="text-on-surface-variant text-xs mb-1">רמת גלוקוז</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">92</span>
              <span className="text-on-surface-variant text-sm">mg/dL</span>
            </div>
            <div className="mt-md flex items-center gap-2 text-xs text-status-success font-medium">
              <span className="material-symbols-outlined text-xs">trending_down</span>
              <span>ירידה חיובית של 4% מאתמול</span>
            </div>
          </div>
          {/* Heart Rate */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all">
            <div className="flex justify-between items-start mb-md">
              <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">favorite</span></div>
              <span className="text-[10px] font-bold text-secondary bg-secondary/5 px-2 py-1 rounded-full">רגוע</span>
            </div>
            <p className="text-on-surface-variant text-xs mb-1">קצב לב (מנוחה)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">68</span>
              <span className="text-on-surface-variant text-sm">BPM</span>
            </div>
            <div className="mt-md flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-xs">horizontal_rule</span>
              <span>ללא שינוי משמעותי</span>
            </div>
          </div>
          {/* Sleep */}
          <div className="bg-white p-lg rounded-xl custom-shadow border border-white hover:border-secondary/20 transition-all">
            <div className="flex justify-between items-start mb-md">
              <div className="p-xs bg-secondary/5 text-secondary rounded-lg"><span className="material-symbols-outlined">bedtime</span></div>
              <span className="text-[10px] font-bold text-secondary bg-secondary/5 px-2 py-1 rounded-full">איכותי</span>
            </div>
            <p className="text-on-surface-variant text-xs mb-1">שעות שינה</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">8.5</span>
              <span className="text-on-surface-variant text-sm">שעות</span>
            </div>
            <div className="mt-md flex items-center gap-2 text-xs text-status-success font-medium">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>שיפור של 1.2 שעות מהממוצע</span>
            </div>
          </div>
        </div>
        {/* Large Graph Card */}
        <div className="bg-white rounded-xl custom-shadow border border-white overflow-hidden">
          <div className="p-lg border-b border-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-primary">מגמות בריאות לאורך זמן</h3>
              <p className="text-on-surface-variant text-sm">ניתוח משולב של גלוקוז ופעילות גופנית</p>
            </div>
            <div className="flex gap-md">
              <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase"><span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> גלוקוז</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase"><span className="w-2.5 h-2.5 rounded-full bg-accent-action"></span> פעילות</div>
            </div>
          </div>
          <div className="p-xl relative h-[400px] w-full flex items-end justify-between gap-4">
            <div className="absolute inset-0 p-xl flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-slate-200 w-full h-0"></div>
              <div className="border-b border-slate-200 w-full h-0"></div>
              <div className="border-b border-slate-200 w-full h-0"></div>
            </div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-32"></div><span className="mt-2 text-[10px] text-on-surface-variant">א'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-48"></div><span className="mt-2 text-[10px] text-on-surface-variant">ב'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-40"></div><span className="mt-2 text-[10px] text-on-surface-variant">ג'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-56"></div><span className="mt-2 text-[10px] text-on-surface-variant">ד'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-36"></div><span className="mt-2 text-[10px] text-on-surface-variant">ה'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-44"></div><span className="mt-2 text-[10px] text-on-surface-variant">ו'</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-10 bg-secondary/10 rounded-t-lg h-32"></div><span className="mt-2 text-[10px] text-on-surface-variant">ש'</span></div>
            <svg className="absolute inset-x-0 bottom-24 h-40 w-full z-20 pointer-events-none px-xl" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,80 C15,70 25,20 40,30 C55,40 70,10 85,35 C95,50 100,45 100,45" fill="none" stroke="#00A8B5" strokeLinecap="round" strokeWidth="3"></path>
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
