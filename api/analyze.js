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
    const { base64Data, mimeType, previousResults } = req.body;

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Data or mimeType parameters.' });
    }


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
      7. DO NOT start the summary with a greeting like "שלום" or "שלום רב". Start directly with the medical analysis.
      8. CRITICAL: DO NOT use double quotes (") anywhere inside the summary text. For Hebrew acronyms like ד"ל, use single quotes (ד'ל) or spell it out (דציליטר). Double quotes will break the JSON parser.

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
            "marker_name": "String (The standard medical acronym or name of the test, usually in English, e.g., 'WBC', 'Hemoglobin', 'Cholesterol', 'Glucose'. IMPORTANT: Translate or normalize any Hebrew or OCR errors to the standard English medical term so it can be recognized).",
            "measured_value": Number,
            "unit": "String",
            "normal_range_min": Number (Parse the lower bound of the reference/normal range. If the range is '4.5 - 10', min is 4.5. If the range is '<10', min is 0 or null. Return null if not found),
            "normal_range_max": Number (Parse the upper bound of the reference/normal range. If the range is '4.5 - 10', max is 10. Return null if not found),
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

    let result;
    let lastError;

    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        try {
          result = await model.generateContent([prompt, ...imageParts]);
        } catch (error) {
          const errMsg = error.message || '';
          if (error.status === 503 || error.status === 500 || error.status === 504 || errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('504')) {
            console.log('Gemini API overload/error, retrying after 1.5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = await model.generateContent([prompt, ...imageParts]);
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
