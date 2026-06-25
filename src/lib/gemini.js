import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to convert raw API/Server errors into user-friendly Hebrew messages
const getFriendlyErrorMessage = (errorMsg) => {
  if (!errorMsg) return 'אירעה שגיאה כללית במערכת. אנא נסה שוב.';
  const msg = errorMsg.toString().toLowerCase();
  
  if (msg.includes('429') || msg.includes('quota') || msg.includes('too many requests') || msg.includes('limit')) {
    return 'המערכת כרגע תחת עומס רב או שמכסת השימוש הסתיימה. אנא נסה/י שוב בעוד מספר דקות.';
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return 'שגיאת חיבור (404). שירות ה-AI אינו זמין כרגע. אנא פנה לתמיכה.';
  }
  if (msg.includes('500') || msg.includes('503') || msg.includes('server error')) {
    return 'שגיאת שרת פנימית. אנו פועלים לתיקון הבעיה, אנא נסה/י שוב בהמשך.';
  }
  if (msg.includes('api key') || msg.includes('forbidden') || msg.includes('403')) {
    return 'שגיאת אימות. יש לבדוק את מפתח ה-API מול המערכת.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network error')) {
    return 'בעיית חיבור לאינטרנט או שהשרת לא מגיב. בדוק את החיבור שלך ונסה שוב.';
  }
  
  // If it's a known non-scary message, we can let it pass, otherwise return generic
  // But let's return a clean generic error for anything else we don't recognize
  return 'אירעה שגיאה בעיבוד הבקשה מול שרתי ה-AI. אנא נסה/י שוב.';
};

let allApiKeys = [];
let currentKeyIndex = 0;

const loadApiKeys = async () => {
  if (allApiKeys.length > 0) return true;
  
  const localKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (localKey && localKey !== 'your_gemini_api_key_here') {
    allApiKeys = localKey.split(',').map(k => k.trim()).filter(k => k);
  }

  try {
    const res = await fetch('/api/get-gemini-key', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.keys && data.keys.length > 0) {
        allApiKeys = data.keys;
      } else if (data.key) {
        allApiKeys = data.key.split(',').map(k => k.trim()).filter(k => k);
      }
    }
  } catch (e) {
    console.error('Failed to fetch dynamic API keys', e);
  }
  
  return allApiKeys.length > 0;
};

// Helper to run Gemini with built-in Key Rotation, Model Rotation and Exponential Retry
const MODELS = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

const executeWithGemini = async (prompt, imageParts = []) => {
  const hasKeys = await loadApiKeys();
  if (!hasKeys) throw new Error('Gemini API key is missing.');

  // Allow enough retries to both rotate through keys AND wait out 503 server overloads
  let retries = Math.max(6, allApiKeys.length * 3);
  let lastError = null;
  let modelIndex = 0;
  let delay = 2000;

  while (retries >= 0) {
    const currentKey = allApiKeys[currentKeyIndex];
    const currentModelName = MODELS[modelIndex];
    const genAI = new GoogleGenerativeAI(currentKey);
    const model = genAI.getGenerativeModel({ model: currentModelName });
    
    try {
      const result = await model.generateContent(imageParts.length > 0 ? [prompt, ...imageParts] : [prompt]);
      const response = await result.response;
      const text = response.text();
      let jsonText = text;
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonText = text.substring(startIndex, endIndex + 1);
      }
      
      let cleanedText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      cleanedText = cleanedText.replace(/[\n\r\t]/g, ' '); 
      return JSON.parse(cleanedText);
    } catch (error) {
      lastError = error;
      const errMsg = (error.message || '').toLowerCase();
      
      // If model not found (404), rotate model immediately
      if (error.status === 404 || errMsg.includes('404') || errMsg.includes('not found')) {
        console.warn(`[Gemini] Model ${currentModelName} not found (404). Switching model...`);
        modelIndex = (modelIndex + 1) % MODELS.length;
        retries--;
        continue;
      }
      
      // If quota exceeded (429), ROTATE key and try immediately
      if (error.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('too many')) {
        console.warn(`[Gemini] Key #${currentKeyIndex + 1} exhausted (429) on model ${currentModelName}.`);
        if (allApiKeys.length > 1) {
          currentKeyIndex = (currentKeyIndex + 1) % allApiKeys.length;
          console.log(`[Gemini] Switched to Key #${currentKeyIndex + 1}. Retrying seamlessly...`);
        } else {
          console.warn(`[Gemini] No backup keys available. Waiting ${delay}ms before retry.`);
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 1.5, 8000);
        }
        retries--;
        continue;
      }
      
      // If server overload (503/500/504), wait with exponential backoff and try switching model
      if (error.status === 503 || error.status === 500 || error.status === 504 || errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('504')) {
        console.warn(`[Gemini] Server overload (503) on model ${currentModelName}. Waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 8000);
        
        // Every other 503 failure, switch the model to bypass cluster outages
        if (retries % 2 === 0) {
           modelIndex = (modelIndex + 1) % MODELS.length;
           console.log(`[Gemini] Switching to model ${MODELS[modelIndex]} to avoid 503 outage...`);
        }
        
        retries--;
        continue;
      }
      
      // Other errors, throw immediately
      throw error;
    }
  }
  
  let finalMsg = lastError?.message || 'שגיאה בפנייה למנוע ה-AI';
  if (finalMsg.includes('429') || finalMsg.toLowerCase().includes('quota') || finalMsg.includes('503')) {
    finalMsg = 'כל שרתי ה-AI כרגע תחת עומס עולמי חריג. אנא המתן דקה ונסה שוב, או בדוק מול מודל אחר.';
  }
  throw new Error(finalMsg);
};

export const analyzeMedicalImage = async (base64Data, mimeType, previousResults = '') => {
  try {
    const prompt = `
      You are an expert medical AI assistant reading a lab test results document (usually blood tests).
      Extract the health markers and their results from the image.
      Identify if there is any test date, collection date, or report date listed in the document.
      Provide a structured, beautifully formatted medical summary in HEBREW based on the overall results.
      
      CRITICAL RULES FOR THE HEBREW SUMMARY — READ CAREFULLY:
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
      9. CRITICAL JSON COMPLIANCE: DO NOT output actual physical line breaks (newlines) inside the string values. To separate paragraphs, you MUST type the literal escape sequence "\\n\\n" (backslash n). All text for a JSON value MUST be on one continuous line.

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
    const imageParts = [{ inlineData: { data: cleanBase64, mimeType } }];

    return await executeWithGemini(prompt, imageParts);
  } catch (err) {
    console.error('Secure analysis API fetch error:', err);
    throw new Error(err.message || 'אירעה שגיאה בניתוח המסמך.');
  }
};

export const generateActionPlan = async (labResults, profile = {}) => {
  try {
    const prompt = `
      You are a clinical dietitian and senior fitness trainer.
      Based on the user's blood test results below, generate a highly customized and complete nutrition plan (תפריט תזונה מלא) and a complete workout/fitness plan (תוכנית כושר ואימונים מפורטת).
      
      User's lab results:
      ${JSON.stringify(labResults, null, 2)}
      
      User profile information (if any):
      First Name: ${profile.first_name || 'אורח/ת'}
      Subscription Tier: ${profile.subscription_tier || 'free'}

      CRITICAL: You must focus on any abnormal or borderline markers (e.g. high cholesterol, low iron, low vitamin D, high glucose, low B12, etc.) and customize BOTH the nutrition suggestions and the fitness activities to directly help improve these markers.

      Return the response EXACTLY as a valid JSON object. Do not include markdown code blocks like \`\`\`json.
      Ensure all keys and text values are strictly in HEBREW.
      
      Structure:
      {
        "nutrition_recommendations": "הסבר כללי ומקצועי על דגשי התזונה החשובים להם ביותר לאור בדיקות הדם שלהם.",
        "diet_plan": [
          {
            "meal": "ארוחת בוקר",
            "suggestions": ["הצעה מפורטת ראשונה כולל רכיבים וכמויות", "הצעה מפורטת שנייה"],
            "why": "הסבר מדוע ארוחה זו והרכיבים שבה מסייעים לשיפור המדדים שזוהו בבדיקה."
          },
          {
            "meal": "ארוחת ביניים",
            "suggestions": ["הצעה מפורטת 1", "הצעה מפורטת 2"],
            "why": "הסבר מדוע רכיבים אלו עוזרם למדדים."
          },
          {
            "meal": "ארוחת צהריים",
            "suggestions": ["הצעה מפורטת 1", "הצעה מפורטת 2"],
            "why": "הסבר מדוע רכיבים אלו עוזרים למדדים."
          },
          {
            "meal": "ארוחת ערב",
            "suggestions": ["הצעה מפורטת 1", "הצעה מפורטת 2"],
            "why": "הסבר מדוע רכיבים אלו עוזרים למדדים."
          }
        ],
        "fitness_recommendations": "הסבר כללי על החשיבות של סוגי האימון שנבחרו והקשר הישיר שלהם לשיפור בדיקות הדם ומדדי המעבדה.",
        "workout_plan": [
          {
            "day": "יום א'",
            "activity": "סוג האימון (למשל: אימון אירובי מתון / אימון כוח פלג גוף עליון)",
            "exercises": ["תרגיל 1 עם חזרות וסטים", "תרגיל 2", "תרגיל 3"],
            "duration": "משך זמן (למשל: 45 דקות)",
            "intensity": "עצימות (למשל: בינונית)"
          },
          {
            "day": "יום ב'",
            "activity": "מנוחה פעילה או הליכה קלה",
            "exercises": ["הליכה בקצב מתון", "מתיחות שחרור"],
            "duration": "30 דקות",
            "intensity": "קלה"
          },
          {
            "day": "יום ג'",
            "activity": "אימון התנגדות וכוח פלג גוף תחתון (לשיפור רגישות לאינסולין)",
            "exercises": ["תרגיל 1", "תרגיל 2"],
            "duration": "50 דקות",
            "intensity": "בינונית-גבוהה"
          }
        ]
      }
    `;

    return await executeWithGemini(prompt);
  } catch (err) {
    console.error('Secure generate plan API fetch error:', err);
    throw err;
  }
};

export const explainMedicalMarker = async (markerName) => {
  try {
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
    return await executeWithGemini(prompt);
  } catch (err) {
    console.error('API fetch error:', err);
    throw err;
  }
};
