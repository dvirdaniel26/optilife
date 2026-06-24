import { useContext, useEffect, useState, useCallback } from 'react';
import { UserContext } from '../App';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, FlaskConical } from 'lucide-react';

const STATUS_LABELS = {
  completed:  { label: 'הושלם',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  processing: { label: 'בעיבוד',  color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  pending:    { label: 'ממתין',   color: 'bg-slate-100 text-slate-500 border-slate-200' },
  failed:     { label: 'נכשל',    color: 'bg-red-500/10 text-red-500 border-red-200' },
};

function getStatusMeta(status) {
  const key = (status || '').toLowerCase();
  return STATUS_LABELS[key] || { label: status || 'לא ידוע', color: 'bg-slate-100 text-slate-500 border-slate-200' };
}

function getStatusIcon(status) {
  const key = (status || '').toLowerCase();
  if (key === 'completed')  return 'check_circle';
  if (key === 'processing') return 'hourglass_top';
  if (key === 'failed')     return 'error';
  return 'radio_button_unchecked';
}

function SortIcon({ active, dir }) {
  if (!active) return (
    <span className="material-symbols-outlined text-[13px] opacity-30">unfold_more</span>
  );
  return (
    <span className="material-symbols-outlined text-[13px] text-secondary">
      {dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  );
}

export default function AllTestsPage() {
  const { session, profile } = useContext(UserContext);
  const navigate = useNavigate();
  const isFemale = profile?.gender === 'female';

  const [tests, setTests]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sortKey, setSortKey]     = useState('created_at');
  const [sortDir, setSortDir]     = useState('desc');
  const [failedTestToView, setFailedTestToView] = useState(null);

  const fetchTests = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('medical_tests')
      .select('id, test_name, test_date, created_at, status')
      .eq('user_id', session.user.id);

    if (!error && data) {
      // Self-heal stuck 'processing' tests (e.g. if user refreshed the page and killed the background promise)
      const now = new Date();
      const healedData = await Promise.all(data.map(async (test) => {
        if (test.status === 'processing') {
          const createdAt = new Date(test.created_at);
          const diffMinutes = (now - createdAt) / 1000 / 60;
          
          if (diffMinutes > 2) {
            // Auto fail stuck tests
            await supabase.from('medical_tests').update({ status: 'failed' }).eq('id', test.id);
            return { ...test, status: 'failed' };
          }
        }
        return test;
      }));
      setTests(healedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTests();
  }, [session]);

  // Set up periodic polling so the 'processing' status updates automatically if it finishes while we are on the page
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTests();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [session]);

  const handleDeleteFailedTest = async (testId) => {
    try {
      if (!testId) {
        alert('מזהה בדיקה חסר.');
        return;
      }
      const { error } = await supabase.from('medical_tests').delete().eq('id', testId);
      if (error) {
        alert('שגיאה ממסד הנתונים: ' + error.message);
        return;
      }
      setFailedTestToView(null);
      await fetchTests();
    } catch (e) {
      alert('שגיאה בתקשורת: ' + e.message);
      console.error('Failed to delete test', e);
    }
  };

  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sorted = [...tests].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'status') {
      valA = getStatusMeta(valA).label;
      valB = getStatusMeta(valB).label;
    }

    if (valA == null) return 1;
    if (valB == null) return -1;

    const cmp = typeof valA === 'string'
      ? valA.localeCompare(valB, 'he')
      : valA < valB ? -1 : valA > valB ? 1 : 0;

    return sortDir === 'asc' ? cmp : -cmp;
  });

  const ColHeader = ({ label, colKey, className = '' }) => (
    <button
      onClick={() => handleSort(colKey)}
      className={`flex items-center gap-1 group cursor-pointer hover:text-primary transition-colors ${className}`}
    >
      {label}
      <SortIcon active={sortKey === colKey} dir={sortDir} />
    </button>
  );

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background transition-all">
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-black text-primary">כל הניתוחים</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold">
              {loading ? 'טוען...' : `${tests.length} בדיקות בסך הכול`}
            </p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 bg-accent-action text-primary font-bold px-5 py-2.5 rounded-full text-sm shadow hover:shadow-md transition-all hover:scale-105 active:scale-95 w-fit cursor-pointer border-0"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>העלאת בדיקה חדשה</span>
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-secondary animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-3xl custom-shadow border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-5">
              <FlaskConical className="w-10 h-10 text-secondary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-primary mb-2">אין בדיקות עדיין</h2>
            <p className="text-on-surface-variant text-sm max-w-xs mb-6">
              {isFemale
                ? 'העלי את בדיקת הדם הראשונה שלך ו-AI שלנו ינתח אותה תוך שניות.'
                : 'העלה את בדיקת הדם הראשונה שלך ו-AI שלנו ינתח אותה תוך שניות.'}
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="bg-accent-action text-primary font-bold px-7 py-3 rounded-full shadow hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer border-0"
            >
              {isFemale ? 'העלי בדיקה ראשונה' : 'העלה בדיקה ראשונה'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl custom-shadow border border-slate-100 overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right select-none">
              <div className="col-span-4">
                <ColHeader label="שם הבדיקה" colKey="test_name" />
              </div>
              <div className="col-span-2">
                <ColHeader label="תאריך ביצוע" colKey="test_date" />
              </div>
              <div className="col-span-3">
                <ColHeader label="תאריך העלאה" colKey="created_at" />
              </div>
              <div className="col-span-2">
                <ColHeader label="סטטוס" colKey="status" />
              </div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {sorted.map((test) => {
                const statusMeta = getStatusMeta(test.status);
                const icon = getStatusIcon(test.status);

                return (
                  <div
                    key={test.id}
                    onClick={() => {
                      if (test.status === 'failed') {
                        setFailedTestToView(test);
                      } else if (test.status === 'processing') {
                        // Wait for it
                      } else {
                        navigate('/analysis', { state: { testId: test.id } });
                      }
                    }}
                    className={`flex sm:grid sm:grid-cols-12 sm:gap-4 items-center px-5 sm:px-6 py-4 transition-all duration-200 text-right ${
                      test.status === 'processing' ? 'opacity-70 cursor-wait' : 'hover:bg-slate-50 cursor-pointer group'
                    }`}
                  >
                    {/* Name & icon */}
                    <div className="col-span-4 flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform bg-secondary/10 text-secondary group-hover:scale-105">
                        <span className="material-symbols-outlined text-xl">science</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate transition-colors text-primary group-hover:text-secondary">
                          {test.test_name}
                        </p>
                        {/* Mobile: show both dates */}
                        <p className="text-xs text-on-surface-variant mt-0.5 sm:hidden">
                          ביצוע: {new Date(test.test_date).toLocaleDateString('he-IL')}
                          {' · '}
                          העלאה: {new Date(test.created_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>

                    {/* Test date — desktop */}
                    <div className="col-span-2 hidden sm:flex items-center gap-1.5 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
                      {new Date(test.test_date).toLocaleDateString('he-IL')}
                    </div>

                    {/* Upload date — desktop */}
                    <div className="col-span-3 hidden sm:flex items-center gap-1.5 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-slate-400">cloud_upload</span>
                      {new Date(test.created_at).toLocaleDateString('he-IL')}
                    </div>

                    {/* Status badge */}
                    <div className="col-span-2 flex items-center justify-end sm:justify-start">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.color}`}>
                        <span className="material-symbols-outlined text-xs" style={{ fontSize: '13px' }}>{icon}</span>
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Action arrow — desktop */}
                    <div className="col-span-1 hidden sm:flex justify-end">
                      <span className="flex items-center gap-1 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {failedTestToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">
              הניתוח נכשל
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              לצערנו הניתוח של בדיקת הדם נכשל. זה קורה לרוב בגלל איכות תמונה ירודה, מסמך לא קריא או עומס רגעי בשרתים. 
              <br/><br/>
              אנא מחק/י את הבדיקה ונסה/י להעלות שוב תמונה ברורה וחדה יותר או קובץ PDF.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleDeleteFailedTest(failedTestToView.id)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-sm"
              >
                מחק בדיקה
              </button>
              <button 
                onClick={() => setFailedTestToView(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
