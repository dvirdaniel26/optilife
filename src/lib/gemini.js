import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to determine if we should fall back to local direct API call
const shouldUseLocalDirect = () => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const hasLocalKey = import.meta.env.VITE_GEMINI_API_KEY && 
    import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here';
  return isLocalhost && hasLocalKey;
};

export const analyzeMedicalImage = async (base64Data, mimeType, previousResults = '') => {
  // Check if we can run directly (localhost fallback for easy local dev)
  if (shouldUseLocalDirect()) {
    console.log('Running analyzeMedicalImage via direct client-side Gemini fallback...');
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      const imageParts = [{ inlineData: { data: cleanBase64, mimeType } }];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Local direct Gemini error:', error);
      throw new Error(error.message || 'שגיאה בפנייה למנוע ה-AI');
    }
  }

  // --- Production: Secure server-side call ---
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Data, mimeType, previousResults }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Secure analysis API fetch error:', err);
    throw new Error(err.message || 'שגיאה בחיבור לשרת הניתוח המאובטח');
  }
};

export const generateActionPlan = async (labResults, profile = {}) => {
  // Check if we can run directly (localhost fallback for easy local dev)
  if (shouldUseLocalDirect()) {
    console.log('Running generateActionPlan via direct client-side Gemini fallback...');
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
            },
            {
              "day": "יום ד'",
              "activity": "מנוחה",
              "exercises": ["יום התאוששות ללא אימון"],
              "duration": "0 דקות",
              "intensity": "אין"
            },
            {
              "day": "יום ה'",
              "activity": "אימון אינטרוולים אירובי (לשיפור מדדי לב וכלי דם)",
              "exercises": ["תרגיל 1", "תרגיל 2"],
              "duration": "40 דקות",
              "intensity": "גבוהה"
            },
            {
              "day": "יום ו'",
              "activity": "אימון כוח פונקציונלי לכל הגוף",
              "exercises": ["תרגיל 1", "תרגיל 2"],
              "duration": "45 דקות",
              "intensity": "בינונית"
            },
            {
              "day": "יום ש'",
              "activity": "מנוחה",
              "exercises": ["יום התאוששות ללא אימון"],
              "duration": "0 דקות",
              "intensity": "אין"
            }
          ]
        }
      `;

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Local direct Gemini error:', error);
      throw new Error(error.message || 'שגיאה בפנייה למנוע ה-AI');
    }
  }

  // --- Production: Secure server-side call ---
  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labResults, profile }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Secure generate plan API fetch error:', err);
    throw new Error(err.message || 'שגיאה בחיבור לשרת יצירת התוכנית');
  }
};

export const explainMedicalMarker = async (markerName) => {
  if (shouldUseLocalDirect()) {
    console.log(`Running explainMedicalMarker for ${markerName} via direct client-side Gemini fallback...`);
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    try {
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
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Local direct Gemini error:', error);
      throw new Error(error.message || 'שגיאה בפנייה למנוע ה-AI');
    }
  }

  // Production fallback if API route exists
  try {
    const response = await fetch('/api/explain-marker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markerName }),
    });

    if (!response.ok) {
      throw new Error('Server error');
    }
    return await response.json();
  } catch (err) {
    console.error('API fetch error:', err);
    throw new Error('שגיאה בחיבור לשרת ההסברים');
  }
};
