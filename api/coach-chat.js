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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction
    });

    // Format chat history for Gemini API. 
    // Gemini chat API expects format: { role: 'user' | 'model', parts: [{ text: '...' }] }
    // It must start with 'user' and alternate roles.
    const formattedHistory = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = msg.sender === 'user' ? 'user' : 'model';
        
        // Exclude local welcome message explicitly
        if (msg.id === 'welcome') return;

        // Ensure history starts with a user message
        if (formattedHistory.length === 0 && role !== 'user') return;

        // If consecutive messages have the same role, merge them
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
          formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + msg.text;
          return;
        }

        formattedHistory.push({
          role: role,
          parts: [{ text: msg.text }]
        });
      });
    }

    const isNewChat = formattedHistory.length === 0;

    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessage(query);
    const response = await result.response;
    const responseText = response.text();

    let generatedTitle = null;
    if (isNewChat) {
       try {
         const titleChat = model.startChat();
         const titleResult = await titleChat.sendMessage(`Generate a very short title (max 3-5 words) in Hebrew summarizing this user query: "${query}". Respond ONLY with the title, no quotes or prefixes. Make it sound like a conversation topic.`);
         generatedTitle = (await titleResult.response).text().trim().replace(/['"]/g, '');
       } catch(e) {
         console.error('Failed to generate title', e);
       }
    }

    return res.status(200).json({ reply: responseText, title: generatedTitle });
  } catch (error) {
    console.error('Vercel Gemini Coach Chat Serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
