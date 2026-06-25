export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const primary = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const fallback = process.env.VITE_GEMINI_API_KEY_FALLBACK || process.env.GEMINI_API_KEY_FALLBACK || '';
  const apiKey = [primary, fallback].filter(Boolean).join(',');

  if (!apiKey) {
    return res.status(404).json({ error: 'Gemini API key not found on server.' });
  }

  // Return all keys to the client so it can try them one by one if one gets exhausted
  const keys = apiKey.split(',').map(k => k.trim()).filter(k => k);
  // Remove duplicates
  const uniqueKeys = [...new Set(keys)];

  return res.status(200).json({ keys: uniqueKeys });
}
