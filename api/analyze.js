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
    const { base64Data, mimeType, previousResults } = req.body;

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Data or mimeType parameters.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an expert medical AI assistant reading a lab test results document (usually blood tests).
      Extract the health markers and their results from the image.
      Identify if there is any test date, collection date, or report date listed in the document.
      Provide a structured, beautifully formatted medical summary in HEBREW based on the overall results.
      
      CRITICAL FORMATTING RULES FOR THE HEBREW SUMMARY:
      1. Divide the summary into multiple clean paragraphs separated by TWO newlines (\\n\\n).
      2. Use bullet points starting with a dash (e.g. "- **שם המדד**") to list abnormal markers, key findings, and general wellness recommendations.
      3. Bold important health markers and their values/status using double asterisks (e.g., **גלוקוז** (112), **ויטמין D**).
      4. DO NOT return a single solid block of text. Make it easy to read, inviting, and professional.

      ${previousResults ? `
      CRITICAL COMPARISON: Compare the new results with the following previous blood test results and specify if there is any improvement, worsening, or stable trends for key metrics (like glucose, cholesterol, etc.) in the Hebrew summary:
      ${previousResults}
      ` : ''}
      
      You must return the result EXACTLY as a raw JSON object. Do not include markdown code blocks like \`\`\`json. 
      Ensure the JSON is valid.
      
      Structure:
      {
        "summary": "סיכום מובנה ומפורט בעברית המשלב פסקאות קצרות (מופרדות ב-\\n\\n) ובוליטים לתובנות מרכזיות לפי הכללים לעיל.",
        "test_date": "String in YYYY-MM-DD format if a test execution, collection, or document date is found in the document, otherwise null",
        "results": [
          {
            "marker_name": "String (e.g., Vitamin D, Glucose, Iron)",
            "measured_value": Number,
            "unit": "String",
            "normal_range_min": Number (or null if not provided),
            "normal_range_max": Number (or null if not provided),
            "is_abnormal": Boolean
          }
        ]
      }
    `;

    const cleanBase64 = base64Data.replace(/^data:(image\/(png|jpeg|jpg|webp)|application\/pdf);base64,/, '');

    const imageParts = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
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
