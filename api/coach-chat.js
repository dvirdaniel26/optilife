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
    const { query, profile, abnormalMarkers, history } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter.' });
    }

        const first_name = profile?.first_name || 'אורח/ת';
    const systemInstruction = `
      You are a friendly, encouraging, and highly professional personal health coach and clinical dietitian named "AI Health Coach" for the platform OptiLife.
      The user's name is ${first_name}.
      
      User's key details:
      Gender: ${profile?.gender || 'not specified'}
      Weight: ${profile?.weight || 'not specified'} kg
      Height: ${profile?.height || 'not specified'} cm
      
      Abnormal or out-of-range lab blood test markers identified for this user across all their historical tests (format: marker, value, unit, date):
      ${abnormalMarkers && abnormalMarkers.length > 0 
        ? JSON.stringify(abnormalMarkers.map(m => `${m.marker_name}: ${m.measured_value} ${m.unit || ''} (Date: ${m.test_date})`), null, 2)
        : 'None (All markers are in normal ranges).'}
      
      Your goal is to guide the user in improving their overall health, diet, fitness, and lifestyle. You are not limited to just discussing the latest blood test; you should act as a comprehensive health coach based on their specific health status, trends across time, and out-of-range markers.
      
      CRITICAL GUIDELINES:
      1. Keep your tone supportive, professional, and empathetic.
      2. Respond strictly in HEBREW (עברית).
      3. Use markdown bolding (like **important text**) for readability.
      4. Always include a disclaimer that your advice is for educational purposes only and they should consult a physician.
      5. Keep responses concise and focused (max 150-250 words per message). Do not make them overly long.
    `;

    let responseText;
    let generatedTitle = null;
    let lastError;

    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          systemInstruction: systemInstruction
        });

        const chat = model.startChat({
          history: formattedHistory
        });

        let result;
        try {
          result = await chat.sendMessage(query);
        } catch (error) {
          const errMsg = error.message || '';
          if (error.status === 503 || error.status === 500 || error.status === 504 || errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('504')) {
            console.log('Gemini API overload/error, retrying after 1.5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = await chat.sendMessage(query);
          } else {
            throw error;
          }
        }
        
        const response = await result.response;
        responseText = response.text();

        if (isNewChat) {
           try {
             const titleChat = model.startChat();
             const titleResult = await titleChat.sendMessage(`Generate a very short title (max 3-5 words) in Hebrew summarizing this user query: "${query}". Respond ONLY with the title, no quotes or prefixes. Make it sound like a conversation topic.`);
             generatedTitle = (await titleResult.response).text().trim().replace(/['"]/g, '');
           } catch(e) {
             console.error('Failed to generate title', e);
           }
        }
        
        lastError = null;
        break; // Success! Break the loop
      } catch (err) {
        lastError = err;
        const errMsg = (err.message || '').toLowerCase();
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('403')) {
          console.warn('Quota exceeded on a Gemini API key in coach chat. Trying fallback key if available...');
          continue; // Try next key
        } else {
          break; // Break and throw for other errors
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    return res.status(200).json({ reply: responseText, title: generatedTitle });
  } catch (error) {
    console.error('Vercel Gemini Coach Chat Serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
