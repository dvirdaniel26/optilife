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
    const { labResults, profile } = req.body;

    if (!labResults) {
      return res.status(400).json({ error: 'Missing labResults parameter.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are a clinical dietitian and senior fitness trainer.
      Based on the user's blood test results below, generate a highly customized and complete nutrition plan (תפריט תזונה מלא) and a complete workout/fitness plan (תוכנית כושר ואימונים מפורטת).
      
      User's lab results:
      ${JSON.stringify(labResults, null, 2)}
      
      User profile information (if any):
      First Name: ${profile?.first_name || 'אורח/ת'}
      Subscription Tier: ${profile?.subscription_tier || 'free'}

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
      const parsed = JSON.parse(cleanedText);
      return res.status(200).json(parsed);
    } catch (parseError) {
      console.error('Failed to parse Action Plan JSON:', text);
      return res.status(500).json({ error: 'AI returned invalid JSON structure.' });
    }
  } catch (error) {
    console.error('Vercel Action Plan Serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
