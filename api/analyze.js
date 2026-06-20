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
      
      CRITICAL FORMATTING RULES FOR THE HEBREW SUMMARY — READ CAREFULLY:
      1. Write a HOLISTIC NARRATIVE ANALYSIS in Hebrew — like a doctor explaining results in a consultation. DO NOT list each marker one by one.
      2. The table of individual markers is shown separately. The summary should ADD VALUE by connecting the dots: explain what the overall picture means, how markers relate to each other, what patterns you see.
      3. Structure the summary as 2-4 readable paragraphs (separated by \\n\\n). Each paragraph covers a theme:
         - Paragraph 1: Overall impression and key findings (e.g., "Most results look healthy, but there are a few areas worth attention...")
         - Paragraph 2: Connect the abnormal markers — what do they suggest together? (e.g., low Vitamin D + elevated ALT may suggest...)
         - Paragraph 3 (optional): Practical lifestyle recommendations based on the pattern
         - Paragraph 4 (optional): If comparison data exists, describe trends over time
      4. Bold key medical terms and values using double asterisks (e.g., **ויטמין D**, **ALT**).
      5. DO NOT repeat each marker's value — that is shown in the table. Focus on meaning, patterns, and clinical significance.
      6. Write warmly and professionally, as if addressing the patient directly.

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
