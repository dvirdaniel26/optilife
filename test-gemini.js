import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `You are a test coach.`;
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction
    });

    const formattedHistory = [
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] }
    ];

    const chat = model.startChat({
      history: formattedHistory
    });

    console.log("Sending message...");
    const result = await chat.sendMessage("how are you?");
    const response = await result.response;
    console.log(response.text());
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
