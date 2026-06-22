const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = "AIzaSyCCrZjrzxEJW6tPpsJOChQaLOaB2BSoRSM";

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a health coach.'
    });

    const history = [{ id: 'welcome', sender: 'ai', text: 'Welcome' }];
    const formattedHistory = [];
    history.forEach(msg => {
      const role = msg.sender === 'user' ? 'user' : 'model';
      if (msg.id === 'welcome') return;
      if (formattedHistory.length === 0 && role !== 'user') return;
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
        formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + msg.text;
        return;
      }
      formattedHistory.push({ role: role, parts: [{ text: msg.text }] });
    });

    console.log('Formatted history:', formattedHistory);
    const chat = model.startChat({ history: formattedHistory });
    
    let generatedTitle = null;
    if (formattedHistory.length === 0) {
      console.log("Generating title...");
      const titleChat = model.startChat();
      const titleResult = await titleChat.sendMessage(`Generate a very short title...`);
      generatedTitle = (await titleResult.response).text().trim().replace(/['"]/g, '');
      console.log("Title generated:", generatedTitle);
    }

    console.log("Sending query...");
    const result = await chat.sendMessage('שלום');
    console.log("Response:", await result.response.text());
  } catch(e) {
    console.error("ERROR:", e);
  }
}
test();
