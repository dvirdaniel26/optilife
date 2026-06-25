import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Dump all medical tests
    const { data: tests, error: testsError } = await supabase
      .from('medical_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (testsError) throw testsError;

    // Dump all lab results
    const { data: results, error: resultsError } = await supabase
      .from('lab_results')
      .select('*');

    if (resultsError) throw resultsError;

    return res.status(200).json({ tests, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
