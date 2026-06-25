import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKeys = [
    process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY_FALLBACK || process.env.GEMINI_API_KEY_FALLBACK
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Gemini API key is not configured on Vercel.' });
  }

  try {
    const { markerName } = req.body;

    if (!markerName) {
      return res.status(400).json({ error: 'Missing markerName parameter.' });
    }


    const prompt = `
      You are a medical lab expert. Explain the blood test marker "${markerName}" in simple, accessible Hebrew for a general audience.
      If the marker name appears to be gibberish, OCR error, or misspelled, try to infer the closest standard medical acronym (e.g. 'GLU' -> 'Glucose', 'CL' -> 'Chlorine').
      If you absolutely cannot identify it, provide a general explanation that the marker could not be uniquely identified due to text errors, but DO NOT leave the description empty.
      
      Return EXACTLY a raw JSON object. Do not use markdown like \`\`\`json.
      
      Structure MUST be:
      {
        "title": "שם המדד בעברית (אנגלית)",
        "description": "הסבר קצר על המדד בשפה פשוטה - 1-2 משפטים",
        "high": "מה זה אומר כשזה גבוה (או מתי זה קורה)",
        "low": "מה זה אומר כשזה נמוך (או מתי זה קורה)",
        "normal": "הטווח התקין הכללי (מספרים עם יחידות)"
      }
    `;

    let result;
    let lastError;

    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        try {
          result = await model.generateContent([prompt]);
        } catch (error) {
          const errMsg = error.message || '';
          if (error.status === 503 || error.status === 500 || error.status === 504 || errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('504')) {
            console.log('Gemini API overload/error, retrying after 1.5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = await model.generateContent([prompt]);
          } else {
            throw error;
          }
        }
        
        lastError = null;
        break; // Success! Break the API keys loop
      } catch (err) {
        lastError = err;
        const errMsg = (err.message || '').toLowerCase();
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('403')) {
          console.warn('Quota exceeded on a Gemini API key. Trying fallback key if available...');
          continue; // Try next key
        } else {
          break; // Break and throw for other errors
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      return res.status(200).json(parsed);
    } catch (parseError) {
      console.error('Failed to parse Gemini output:', text);
      return res.status(500).json({ 
        error: 'AI returned invalid JSON structure.',
        rawOutput: text
      });
    }
  } catch (error) {
    console.error('Vercel Gemini Serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
