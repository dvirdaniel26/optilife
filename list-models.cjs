const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = "AIzaSyCCrZjrzxEJW6tPpsJOChQaLOaB2BSoRSM";

async function test() {
  const fetch = require('node-fetch');
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
  const data = await res.json();
  console.log(data.models.map(m => m.name).join('\n'));
}
test();
