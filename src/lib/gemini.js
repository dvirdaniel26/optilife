import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const analyzeMedicalImage = async (base64Data, mimeType, previousResults = '') => {
  if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('חסר מפתח API של Gemini. אנא הוסף אותו לקובץ ה-.env');
  }

  try {
    // For images, we can use the default models
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an expert medical AI assistant reading a lab test results document (usually blood tests).
      Extract the health markers and their results from the image.
      Identify if there is any test date, collection date, or report date listed in the document.
      Provide a short medical summary in HEBREW based on the overall results.
      
      ${previousResults ? `
      CRITICAL: Compare the new results with the following previous blood test results and specify if there is any improvement, worsening, or stable trends for key metrics (like glucose, cholesterol, etc.) in the Hebrew summary:
      ${previousResults}
      ` : ''}
      
      You must return the result EXACTLY as a raw JSON object. Do not include markdown code blocks like \`\`\`json. 
      Ensure the JSON is valid.
      
      Structure:
      {
        "summary": "פסקה בעברית המסכמת את הבריאות הכללית בהתבסס על התוצאות, ומציינת אילו מדדים חריגים אם בכלל.",
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

    // Strip the "data:image/jpeg;base64," prefix if it exists
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

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
    
    // Clean potential markdown blocks
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini output:', text);
      throw new Error('ה-AI החזיר תשובה בפורמט לא תקין. אנא נסה שוב.');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(error.message || 'שגיאה בפנייה למנוע ה-AI');
  }
};

export const generateActionPlan = async (labResults, profile = {}) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('חסר מפתח API של Gemini. אנא הוסף אותו לקובץ ה-.env');
  }

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
      For example:
      - If cholesterol is high, emphasize fiber, oats, olive oil, and cardio/aerobic training.
      - If glucose is high, emphasize low glycemic index food, strength training to improve insulin sensitivity, and timing of meals.
      - If iron is low, suggest iron-rich foods combined with vitamin C, and moderate fitness.

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
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Action Plan JSON:', text);
      throw new Error('ה-AI החזיר תוכנית פעולה בפורמט לא תקין. אנא נסה שוב.');
    }
  } catch (error) {
    console.error('Gemini Action Plan Error:', error);
    throw new Error(error.message || 'שגיאה בפנייה למנוע ה-AI ליצירת תוכנית פעולה');
  }
};
