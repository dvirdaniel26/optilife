const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyCCrZjrzxEJW6tPpsJOChQaLOaB2BSoRSM';

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a health coach.'
    });

    const chat = model.startChat({ history: [] });
    
    console.log('Sending query...');
    const result = await chat.sendMessage('שלום');
    console.log('Response:', await result.response.text());
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
test();
