export default function AnalysisResultsPage() {
  return (
    <main className="pr-72 pt-24 min-h-screen">
      <div className="p-xl max-w-6xl mx-auto space-y-lg">
        <div className="bg-white p-xl rounded-xl custom-shadow border border-white">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-secondary">psychology</span>
            <h2 className="font-heading text-2xl text-primary font-bold">סיכום תובנות AI</h2>
          </div>
          <div className="space-y-md text-on-surface-variant font-body leading-relaxed text-lg">
            <p>
              שלום מאיה, מניתוח תוצאות הבדיקות האחרונות שלך עולה כי המצב הבריאותי הכללי שלך טוב מאוד. רמות הגלוקוז והשינה מאוזנות להפליא, מה שמעיד על אורח חיים יציב.
            </p>
            <p>
              עם זאת, זיהינו חוסר מסוים בויטמין D ורמות ברזל בגבול התחתון. מומלץ לשקול תוספת תזונתית מבוקרת והגברת החשיפה לשמש בשעות הבוקר כדי לשפר את רמות האנרגיה והחוסן החיסוני שלך.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl custom-shadow border border-white overflow-hidden">
          <div className="p-lg border-b border-slate-50">
            <h3 className="text-xl font-bold text-primary font-heading">תוצאות מעבדה מפורטות</h3>
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
                <tr className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-xl py-md border-b border-slate-50 font-medium">Vitamin D</td>
                  <td className="px-xl py-md border-b border-slate-50">18 ng/mL</td>
                  <td className="px-xl py-md border-b border-slate-50 text-on-surface-variant">30 - 100</td>
                  <td className="px-xl py-md border-b border-slate-50">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-status-error/10 text-status-error">מחוץ לטווח</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-xl py-md border-b border-slate-50 font-medium">Iron (ברזל)</td>
                  <td className="px-xl py-md border-b border-slate-50">65 mcg/dL</td>
                  <td className="px-xl py-md border-b border-slate-50 text-on-surface-variant">60 - 170</td>
                  <td className="px-xl py-md border-b border-slate-50">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary">תקין</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-xl py-md border-b border-slate-50 font-medium">Vitamin B12</td>
                  <td className="px-xl py-md border-b border-slate-50">450 pg/mL</td>
                  <td className="px-xl py-md border-b border-slate-50 text-on-surface-variant">200 - 900</td>
                  <td className="px-xl py-md border-b border-slate-50">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary">תקין</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-xl py-md border-b border-slate-50 font-medium">Magnesium</td>
                  <td className="px-xl py-md border-b border-slate-50">2.1 mg/dL</td>
                  <td className="px-xl py-md border-b border-slate-50 text-on-surface-variant">1.7 - 2.2</td>
                  <td className="px-xl py-md border-b border-slate-50">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary">תקין</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-md pt-md">
          <button className="bg-accent-action hover:shadow-lg transition-all rounded-full py-4 px-xl flex items-center justify-center gap-2 text-primary font-bold active:scale-95 text-lg uppercase min-w-[280px]">
            <span className="material-symbols-outlined">bolt</span>
            צור תוכנית פעולה
          </button>
          <button className="border-2 border-secondary text-secondary hover:bg-secondary/5 transition-all rounded-full py-4 px-xl flex items-center justify-center gap-2 font-bold active:scale-95 text-lg uppercase min-w-[200px]">
            <span className="material-symbols-outlined">download</span>
            הורד PDF
          </button>
        </div>
      </div>
    </main>
  );
}
