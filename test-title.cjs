const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyCCrZjrzxEJW6tPpsJOChQaLOaB2BSoRSM';

async function test() {
  try {
    const systemInstruction = `
      You are a friendly, encouraging, and highly professional personal health coach and clinical dietitian named "AI Health Coach" for the platform OptiLife.
      Respond strictly in HEBREW (עברית).
    `;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction
    });
    
    console.log('Generating title...');
    const titleChat = model.startChat();
    const titleResult = await titleChat.sendMessage('Generate a very short title (max 3-5 words) in Hebrew summarizing this user query: "שלום". Respond ONLY with the title, no quotes or prefixes. Make it sound like a conversation topic.');
    const generatedTitle = (await titleResult.response).text().trim().replace(/['"]/g, '');
    console.log('Title generated:', generatedTitle);
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
test();
