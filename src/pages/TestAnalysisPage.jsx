export default function TestAnalysisPage() {
  return (
    <main className="md:pr-72 pt-20 min-h-screen transition-all">
      <div className="p-xl max-w-4xl mx-auto">
        <div className="mb-xl flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-heading text-h1 text-primary mb-xs">שלום מאיה, בואי ננתח את הבדיקות שלך</h2>
            <p className="font-body text-body-lg text-on-surface-variant">העלי את תוצאות המעבדה שלך וקבלי תובנות בריאותיות מיידיות.</p>
          </div>
          <div className="flex gap-xs">
            <div className="flex -space-x-2 space-x-reverse">
              <img className="w-10 h-10 rounded-full border-2 border-white custom-shadow" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi9BvlZsb3rayuqmYaiBsjOGcC3Hz-DVwS_BLRQhe2axkHwij9p_f9aRqfqFK5PGSbb_aGqtK6p-FtghcKtDJlPRjzH-q4y6dCZopE1688-NnbOnzW8pLbopg9BSgEJvb_2bF9UESF42LkQHh8imuczlEcKrxc94Be49hUC8p1jn1W5Mv8MJBXImRTtLA0Qy_T7ifBgcS7MWNNVJz9_SFmPVOiKuMwCP1zpCPN7Ol4dxNRUp1boQIn1YK5bf_UAjWYzGfeZS8YAJ0"/>
              <img className="w-10 h-10 rounded-full border-2 border-white custom-shadow" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8fEAWxktOVNMY0Gp4zMj72qYC7k1ZCPM0Fy51vkfxNiuD2HbADDQ6Pv4IAn5o1i5egiUwEdu-c3REGUjmToo4DgU5hZNbB1FvTpWPIsH7h4bvi6JZs2TWTQhnY2QeTgqWcNYxnkThe-O_H1xR-LK7ssP38s3NzSKVw4r5bkyRTMoVZCuSNliu-grKpqU3jaMcsKjmT3n0wS6eDAsZFj4pfZ2gkyLM2bsN98BzioS52PmtZdmnSxz3Nm0O9aQ1UBrq2yKzvcmwFZY"/>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[10px] text-white font-bold custom-shadow">+12</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-md">
          <div className="upload-dashed-border bg-white h-[320px] flex flex-col items-center justify-center p-xl transition-all hover:bg-white/80 custom-shadow">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'wght' 300" }}>upload_file</span>
            </div>
            <h3 className="font-heading text-2xl text-primary mb-xs">גררי לכאן את קובץ התוצאות</h3>
            <p className="font-body text-body-lg text-on-surface-variant mb-md text-center">תומך בפורמטים PDF, JPEG (עד 25MB)</p>
            <button className="px-lg py-sm rounded-full border-2 border-secondary text-secondary font-bold hover:bg-secondary hover:text-white transition-all active:scale-95">
              בחירת קובץ מהמחשב
            </button>
          </div>
          <div className="grid grid-cols-12 gap-md">
            <div className="col-span-12 md:col-span-8">
              <div className="bg-white rounded-xl p-md custom-shadow">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-heading text-lg text-primary">בדיקות אחרונות</h3>
                  <button className="text-secondary text-sm font-bold hover:underline">הכל</button>
                </div>
                <div className="grid grid-cols-1 gap-sm flex flex-col">
                  <div className="group p-md rounded-xl bg-background border border-transparent hover:border-secondary/20 transition-all cursor-pointer w-full">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-primary text-sm">פרופיל מטבולי - 12 באוקט׳</p>
                        <p className="text-xs text-on-surface-variant">הושלם לפני יומיים</p>
                      </div>
                      <span className="px-xs py-1 bg-status-success/10 text-status-success text-[10px] font-bold rounded uppercase">נותח</span>
                    </div>
                  </div>
                  <div className="group p-md rounded-xl bg-background border border-transparent hover:border-secondary/20 transition-all cursor-pointer w-full">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-primary text-sm">פרופיל ליפידים - 28 בספט׳</p>
                        <p className="text-xs text-on-surface-variant">בהמתנה לתוצאות</p>
                      </div>
                      <span className="px-xs py-1 bg-accent-action/20 text-primary text-[10px] font-bold rounded uppercase">בתהליך</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="bg-secondary h-full rounded-xl p-md custom-shadow text-white relative overflow-hidden flex flex-col justify-center">
                <div className="relative z-10">
                  <span className="material-symbols-outlined mb-xs text-accent-action">auto_awesome</span>
                  <h4 className="font-heading text-lg mb-xs">תובנות מבוססות AI</h4>
                  <p className="text-sm opacity-90 leading-relaxed font-body">מנוע הניתוח שלנו מזהה מעל 40 סמני בריאות באופן אוטומטי.</p>
                </div>
                <div className="absolute -left-xs -bottom-xs w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-sm">
            <button className="bg-accent-action hover:scale-105 text-primary font-bold px-xl py-lg rounded-full shadow-xl flex items-center gap-md transition-all active:scale-95 group">
              <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform text-2xl">bolt</span>
              <span className="text-xl">START ANALYSIS</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
