const fs = require('fs');
let c = fs.readFileSync('src/pages/ActionPlanPage.jsx', 'utf8');
const idx = c.lastIndexOf('        {/* ── Disclaimer ── */}');

const template = `
        {/* ── HIDDEN PDF TEMPLATE ── */}
        <div style={{ position: 'absolute', top: 0, right: '-9999px', width: '800px', zIndex: -50, pointerEvents: 'none' }}>
          <div id="pdf-template-container" className="bg-white text-slate-900 font-sans" dir="rtl" style={{ width: '800px', padding: '40px', display: 'none' }}>
            <div style={{ borderBottom: '2px solid #10b981', paddingBottom: '20px', marginBottom: '30px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>OptiLife</h1>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', letterSpacing: '1px', margin: '4px 0 0 0' }}>תוכנית בריאות מותאמת אישית</p>
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '18px', margin: 0 }}>עבור: <strong>{firstName} {profile?.last_name || ''}</strong></p>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>תאריך תוכנית: {selectedPlanMeta?.testDate ? new Date(selectedPlanMeta.testDate).toLocaleDateString('he-IL') : new Date().toLocaleDateString('he-IL')}</p>
              </div>
            </div>
            
            {/* Nutrition Section */}
            <h2 style={{ fontSize: '24px', color: '#10b981', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Salad className="w-6 h-6" /> תזונה
            </h2>
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px 0' }}>דגשים והמלצות</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedPlan?.nutrition_recommendations}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
              {selectedPlan?.diet_plan?.map((item, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px', pageBreakInside: 'avoid' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', margin: '0 0 12px 0' }}>{item.meal}</h4>
                  <ul style={{ padding: 0, margin: '0 0 16px 0', listStyle: 'none' }}>
                    {item.suggestions?.map((s, sIdx) => (
                      <li key={sIdx} style={{ fontSize: '14px', color: '#334155', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#f59e0b' }}>✓</span> <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                  {item.why && (
                    <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#047857' }}>
                      <strong>מדוע זה מומלץ עבורך:</strong><br/>{item.why}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Fitness Section */}
            <h2 style={{ fontSize: '24px', color: '#f59e0b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dumbbell className="w-6 h-6" /> אימונים
            </h2>
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px 0' }}>דגשי כושר והשפעה פיזיולוגית</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedPlan?.fitness_recommendations}</p>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', marginBottom: '40px' }}>
              {selectedPlan?.workout_plan?.map((item, idx) => {
                const hasWorkout = item.duration !== '0 דקות' && item.duration !== '0' && item.intensity !== 'אין';
                return (
                  <div key={idx} style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: hasWorkout ? '#fff' : '#f8fafc', pageBreakInside: 'avoid' }}>
                    <div style={{ width: '120px', flexShrink: 0 }}>
                      <div style={{ fontWeight: 'bold', color: hasWorkout ? '#f59e0b' : '#94a3b8', fontSize: '14px' }}>{item.day}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>{item.activity}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{hasWorkout ? \`\${item.duration} | \${item.intensity}\` : 'מנוחה'}</div>
                      {hasWorkout && item.exercises && item.exercises.length > 0 && (
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                          {item.exercises.map((ex, exIdx) => (
                            <li key={exIdx} style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>• {ex}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
`;

if (idx !== -1) {
  const firstPart = c.slice(0, idx);
  const secondPart = c.slice(idx);
  fs.writeFileSync('src/pages/ActionPlanPage.jsx', firstPart + template + "\\n" + secondPart);
  console.log('Template injected successfully.');
} else {
  console.log('Marker not found.');
}
