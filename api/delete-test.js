import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { testId } = req.body;
  if (!testId) {
    return res.status(400).json({ error: 'Missing testId' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization token' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing server configuration' });
  }

  // Initialize Supabase admin client to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user to ensure they can only delete THEIR OWN test
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Verify the test belongs to the user
    const { data: test, error: fetchError } = await supabase
      .from('medical_tests')
      .select('user_id')
      .eq('id', testId)
      .single();

    if (fetchError || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own tests' });
    }

    // Bypass RLS to delete
    const { error: deleteError } = await supabase
      .from('medical_tests')
      .delete()
      .eq('id', testId);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete test' });
  }
}
