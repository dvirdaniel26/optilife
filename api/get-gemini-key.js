export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the primary or fallback key from Vercel's backend environment
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY_FALLBACK || process.env.GEMINI_API_KEY_FALLBACK;

  if (!apiKey) {
    return res.status(404).json({ error: 'Gemini API key not found on server.' });
  }

  // If there are multiple keys (comma-separated), pick a random one to distribute load
  const keys = apiKey.split(',').map(k => k.trim()).filter(k => k);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];

  return res.status(200).json({ key: randomKey });
}
