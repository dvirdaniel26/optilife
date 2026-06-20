import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on Vercel.' });
  }

  try {
    const { markerName } = req.body;

    if (!markerName) {
      return res.status(400).json({ error: 'Missing markerName parameter.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are a medical lab expert. Explain the blood test marker "${markerName}" in simple, accessible Hebrew for a general audience.
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

    const result = await model.generateContent([prompt]);
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
