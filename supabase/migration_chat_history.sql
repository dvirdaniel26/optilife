-- OptiLife AI Coach Chat History & Consent Migration
-- Execute this script in the Supabase SQL Editor

-- 1. Add consent column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_consented_to_ai_coach BOOLEAN DEFAULT false;

-- 2. Create coach_chats table (for threads)
CREATE TABLE IF NOT EXISTS public.coach_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'שיחה חדשה',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for coach_chats
ALTER TABLE public.coach_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policy for coach_chats
DROP POLICY IF EXISTS "Users can manage their own coach chats" ON public.coach_chats;
CREATE POLICY "Users can manage their own coach chats" 
ON public.coach_chats 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. Create coach_messages table (for actual messages)
CREATE TABLE IF NOT EXISTS public.coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.coach_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for coach_messages
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy for coach_messages
DROP POLICY IF EXISTS "Users can manage their own coach messages" ON public.coach_messages;
CREATE POLICY "Users can manage their own coach messages" 
ON public.coach_messages 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.coach_chats IS 'Stores conversation threads for the AI Health Coach';
COMMENT ON TABLE public.coach_messages IS 'Stores individual message history for each AI Health Coach chat thread';
