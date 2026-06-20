import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable Vercel's automatic body parser to read raw request body for Stripe signature validation
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw request body stream
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Stripe Webhook Error: Missing configuration variables on the server.');
    return res.status(500).json({ error: 'Stripe or Supabase service variables are not set.' });
  }

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('Stripe Webhook Error: Failed to read raw body:', err);
    return res.status(400).json({ error: 'Failed to read request body.' });
  }

  // Initialize Stripe client
  const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });
  let event;

  try {
    // Validate that the request actually came from Stripe
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(`Stripe Webhook Verification Failed: ${err.message}`);
    return res.status(400).json({ error: `Signature verification failed: ${err.message}` });
  }

  console.log(`Verified Stripe Webhook Event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const clientReferenceId = session.client_reference_id;

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      console.log(`Stripe Webhook Info: Ignoring checkout.session.completed because payment_status is '${session.payment_status}'`);
      return res.status(200).json({ received: true, ignored: 'unpaid checkout session' });
    }

    if (!clientReferenceId) {
      console.warn('Stripe Webhook Warning: checkout.session.completed has no client_reference_id.');
      return res.status(200).json({ received: true, warning: 'Missing client_reference_id' });
    }

    const separator = clientReferenceId.includes('_') ? '_' : ':';
    const parts = clientReferenceId.split(separator);
    const userId = parts[0];
    const planType = parts.slice(1).join(separator);
    if (!userId || !planType) {
      console.error(`Stripe Webhook Error: Invalid client_reference_id format: ${clientReferenceId}`);
      return res.status(400).json({ error: 'Invalid client_reference_id format. Expected userId_planType or userId:planType' });
    }

    // Initialize Supabase admin client to bypass Row Level Security (RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Fetch subscription trial info from Stripe
      let trialEnd = null;
      try {
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (subscription && subscription.trial_end) {
            trialEnd = new Date(subscription.trial_end * 1000).toISOString();
          }
        }
      } catch (err) {
        console.error('Stripe Webhook Warning: Failed to retrieve subscription details:', err);
      }

      // 1. Update profiles table subscription_tier and trial info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: planType,
          trial_end: trialEnd,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('id', userId);

      if (profileError) throw profileError;
      console.log(`Stripe Webhook Success: Updated profiles.subscription_tier to '${planType}' for user ${userId}`);

      // 2. Update auth.users metadata for premium_since (allows anniversary cancellation calculation)
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { premium_since: new Date().toISOString() }
      });

      if (authError) {
        // Log auth warning, but don't fail the entire webhook since the profile tier updated successfully
        console.warn(`Stripe Webhook Warning: Failed to update user_metadata for ${userId}:`, authError);
      } else {
        console.log(`Stripe Webhook Success: Updated auth user_metadata.premium_since for user ${userId}`);
      }

    } catch (dbError) {
      console.error(`Stripe Webhook Database Error: Failed to update database for user ${userId}:`, dbError);
      return res.status(500).json({ error: 'Database update failed' });
    }
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;

    console.log(`Stripe Webhook Info: Handling customer.subscription.updated for customer ${customerId}, sub ${subscriptionId}`);

    // Determine plan type from the price unit_amount
    const priceItem = subscription.items?.data?.[0]?.price;
    if (!priceItem) {
      console.warn(`Stripe Webhook Warning: customer.subscription.updated has no items.`);
      return res.status(200).json({ received: true, warning: 'Missing price item' });
    }

    const amount = priceItem.unit_amount;
    const status = subscription.status;
    const isSubscriptionActive = status === 'active' || status === 'trialing';

    let targetTier = 'free';
    if (isSubscriptionActive) {
      let planType = 'free';
      if (amount === 1900) {
        planType = 'standard';
      } else if (amount === 2900) {
        planType = 'premium';
      } else if (amount === 4900) {
        planType = 'ai_ultimate';
      } else {
        console.warn(`Stripe Webhook Warning: Unknown price amount: ${amount}`);
        return res.status(200).json({ received: true, warning: `Unknown price amount: ${amount}` });
      }

      // Now check if the subscription is cancelled (cancel_at_period_end === true)
      const cancelAtPeriodEnd = subscription.cancel_at_period_end;
      targetTier = planType;
      if (cancelAtPeriodEnd) {
        const endTimestamp = subscription.trial_end || subscription.current_period_end;
        const endDate = new Date(endTimestamp * 1000);
        const yyyy = endDate.getFullYear();
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        const dd = String(endDate.getDate()).padStart(2, '0');
        const endDateStr = `${yyyy}-${mm}-${dd}`;
        targetTier = `${planType}_cancelled:${endDateStr}`;
      }
    }

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Find the user by their Stripe customer ID or subscription ID
      let { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id, subscription_tier, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (findError) throw findError;

      // Fallback: search by customer email if customer ID not found in profile
      if (!profile) {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          const email = customer.email;
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) throw listError;
          const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (targetUser) {
            const { data: prof, error: profErr } = await supabase
              .from('profiles')
              .select('id, subscription_tier, stripe_subscription_id')
              .eq('id', targetUser.id)
              .maybeSingle();
            if (!profErr && prof) {
              profile = prof;
            }
          }
        }
      }

      if (!profile) {
        console.warn(`Stripe Webhook Warning: No user found for customer ID ${customerId}`);
        return res.status(200).json({ received: true, warning: 'User not found' });
      }

      const userId = profile.id;

      // Verify that the updated subscription ID matches the user's active subscription ID stored in Supabase
      if (profile.stripe_subscription_id && profile.stripe_subscription_id !== subscriptionId) {
        console.log(`Stripe Webhook Info: Ignoring customer.subscription.updated for subscription ${subscriptionId} because user ${userId} has another active subscription ${profile.stripe_subscription_id}`);
        return res.status(200).json({ received: true, ignored: 'Older subscription update ignored' });
      }

      // Update the user profile with the new tier and customer/subscription IDs
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: targetTier,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId
        })
        .eq('id', userId);

      if (profileError) throw profileError;
      console.log(`Stripe Webhook Success: Updated profiles.subscription_tier to '${targetTier}' for user ${userId}`);

    } catch (err) {
      console.error(`Stripe Webhook Error: Failed to process subscription update for customer ${customerId}:`, err);
      return res.status(500).json({ error: 'Failed to process subscription update' });
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log(`Stripe Webhook Info: Handling customer.subscription.deleted for customer ${customerId}`);

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 1. Retrieve the customer details from Stripe to get their email
      const customer = await stripe.customers.retrieve(customerId);
      const email = customer.email;

      if (!email) {
        console.warn(`Stripe Webhook Warning: Customer ${customerId} has no email address associated.`);
        return res.status(200).json({ received: true, warning: 'Missing customer email' });
      }

      // 2. Fetch the user list from Supabase Auth to find the matching email
      const { data: { users }, error: findError } = await supabase.auth.admin.listUsers();
      if (findError) throw findError;

      const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!targetUser) {
        console.warn(`Stripe Webhook Warning: No Supabase user found with email ${email}`);
        return res.status(200).json({ received: true, warning: 'User not found' });
      }

      const userId = targetUser.id;

      // Fetch the current profile to check the subscription ID
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      // Check if the subscription ID matches the current active subscription ID stored in Supabase
      if (profile && profile.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
        console.log(`Stripe Webhook Info: Ignoring customer.subscription.deleted for subscription ${subscription.id} because user ${userId} has another active subscription ${profile.stripe_subscription_id}`);
        return res.status(200).json({ received: true, ignored: 'Older subscription deletion ignored' });
      }

      // 3. Update the profiles table to set the subscription tier back to 'free' and clear stripe fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          trial_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null
        })
        .eq('id', userId);

      if (profileError) throw profileError;
      console.log(`Stripe Webhook Success: Downgraded profiles.subscription_tier to 'free' for user ${userId} (${email})`);

      // 4. Clear user metadata premium_since
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { premium_since: null }
      });

      if (authError) {
        console.warn(`Stripe Webhook Warning: Failed to clear user_metadata.premium_since for user ${userId}:`, authError);
      } else {
        console.log(`Stripe Webhook Success: Cleared auth user_metadata.premium_since for user ${userId}`);
      }

    } catch (err) {
      console.error(`Stripe Webhook Error: Failed to process cancellation for customer ${customerId}:`, err);
      return res.status(500).json({ error: 'Failed to process cancellation' });
    }
  }

  return res.status(200).json({ received: true });
}
