import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: tests, error: testsError } = await supabase.from('medical_tests').select('*').order('created_at', { ascending: false });
  console.log("TESTS:", JSON.stringify(tests, null, 2));
  
  const { data: results, error: resultsError } = await supabase.from('lab_results').select('*');
  console.log("RESULTS:", JSON.stringify(results, null, 2));
}

run();
