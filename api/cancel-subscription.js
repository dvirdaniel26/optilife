import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization token' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Server Configuration Error: Missing environmental variables.');
    return res.status(500).json({ error: 'Missing configuration on the server.' });
  }

  // Initialize Supabase admin client to fetch profile and bypass RLS for updates
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Authenticate user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('Authentication failed for cancel request:', authError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const userId = user.id;

    // 2. Fetch user's profile to retrieve the Stripe subscription ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error(`Database Error: Profile not found for user ${userId}:`, profileError);
      return res.status(404).json({ error: 'Profile not found' });
    }

    const subscriptionId = profile.stripe_subscription_id;
    if (!subscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription ID found for this user.' });
    }

    // 3. Initialize Stripe and update the subscription to cancel at the end of the current period
    const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log(`Stripe Success: Scheduled subscription ${subscriptionId} for cancellation at period end.`);

    // 4. Calculate period end date (either trial_end or current_period_end)
    const endTimestamp = subscription.trial_end || subscription.current_period_end;
    const endDate = new Date(endTimestamp * 1000);
    const yyyy = endDate.getFullYear();
    const mm = String(endDate.getMonth() + 1).padStart(2, '0');
    const dd = String(endDate.getDate()).padStart(2, '0');
    const endDateStr = `${yyyy}-${mm}-${dd}`;

    // 5. Update profiles table to set the tier as cancelled
    const currentTier = profile.subscription_tier;
    let cancelledTier;
    if (currentTier === 'ai_ultimate') {
      cancelledTier = `ai_ultimate_cancelled:${endDateStr}`;
    } else if (currentTier === 'standard') {
      cancelledTier = `standard_cancelled:${endDateStr}`;
    } else {
      cancelledTier = `premium_cancelled:${endDateStr}`;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_tier: cancelledTier })
      .eq('id', userId);

    if (updateError) {
      console.error(`Database Error: Failed to update profile tier for user ${userId}:`, updateError);
      throw updateError;
    }

    console.log(`Database Success: Updated profiles.subscription_tier to '${cancelledTier}' for user ${userId}`);

    // Return success response along with exact cancellation end date
    return res.status(200).json({ 
      success: true, 
      cancelledTier,
      endDate: endDateStr
    });

  } catch (err) {
    console.error('Cancellation API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
  }
}
