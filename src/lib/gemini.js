// Secure frontend wrapper for AI functions.
// Calls are proxied to Vercel Serverless Functions (/api/*) to hide API keys from the client-side bundle.

export const analyzeMedicalImage = async (base64Data, mimeType, previousResults = '') => {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType, previousResults })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'אירעה שגיאה בניתוח המסמך על ידי השרת.');
    }
    
    return await res.json();
  } catch (err) {
    console.error('Secure analysis API fetch error:', err);
    throw new Error(err.message || 'אירעה שגיאה בניתוח המסמך.');
  }
};

export const generateActionPlan = async (labResults, profile = {}) => {
  try {
    const res = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labResults, profile })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'אירעה שגיאה בהפקת התוכנית מהשרת.');
    }
    
    return await res.json();
  } catch (err) {
    console.error('Secure generate plan API fetch error:', err);
    throw err;
  }
};

export const explainMedicalMarker = async (markerName) => {
  try {
    const res = await fetch('/api/explain-marker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markerName })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'אירעה שגיאה בטעינת ההסבר משרת ה-AI.');
    }
    
    return await res.json();
  } catch (err) {
    console.error('API fetch error:', err);
    throw err;
  }
};

