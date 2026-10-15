-- ============================================================================
-- The Mutual — Supabase Database Schema: Corporations & Profiles
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/emmrksahudinowrgbjnw/sql/new
-- ============================================================================

-- 1. Create corporations table
CREATE TABLE IF NOT EXISTS public.corporations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_code TEXT UNIQUE NOT NULL,
  domain TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  settings JSONB DEFAULT '{"clarity_threshold": 85, "enforce_contracts": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- Index for instant lookup by company_code
CREATE INDEX IF NOT EXISTS idx_corporations_company_code ON public.corporations(company_code);

-- 2. Create profiles table (with corporation connection)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  account_type TEXT DEFAULT 'personal', -- 'personal', 'corporate', 'corp_admin'
  corporation_id UUID REFERENCES public.corporations(id) ON DELETE SET NULL,
  company_code TEXT,
  perspective TEXT DEFAULT 'employee',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- Index for searching employees by company code
CREATE INDEX IF NOT EXISTS idx_profiles_company_code ON public.profiles(company_code);
CREATE INDEX IF NOT EXISTS idx_profiles_corporation_id ON public.profiles(corporation_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Corporations RLS Policies:
-- Read policy: Anyone authenticated or anonymous can verify corporations by company_code during signup
DROP POLICY IF EXISTS "Allow read of corporations" ON public.corporations;
CREATE POLICY "Allow read of corporations"
  ON public.corporations FOR SELECT
  USING (true);

-- Insert policy: Authenticated or anonymous registration allowed
DROP POLICY IF EXISTS "Allow insert of corporation" ON public.corporations;
CREATE POLICY "Allow insert of corporation"
  ON public.corporations FOR INSERT
  WITH CHECK (true);

-- Update policy: Corporation admin can update their company details
DROP POLICY IF EXISTS "Allow admin update corporation" ON public.corporations;
CREATE POLICY "Allow admin update corporation"
  ON public.corporations FOR UPDATE
  USING (auth.uid() = admin_id OR auth.uid() IS NULL);

-- 5. Profiles RLS Policies:
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
CREATE POLICY "Allow read profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
CREATE POLICY "Allow insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
CREATE POLICY "Allow update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() IS NULL);

-- 6. Trigger to sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    company,
    role,
    account_type,
    company_code,
    perspective,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'personal'),
    NEW.raw_user_meta_data->>'company_code',
    COALESCE(NEW.raw_user_meta_data->>'perspective', 'employee'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company = EXCLUDED.company,
    role = EXCLUDED.role,
    account_type = EXCLUDED.account_type,
    company_code = EXCLUDED.company_code,
    email = EXCLUDED.email,
    updated_at = timezone('utc'::TEXT, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. Zero-Friction Meeting Mesh, Live Presence & Active Assignments
-- ============================================================================

-- A. Auto-Paired Live Meeting Sessions (Fingerprinted by Platform + Meeting ID)
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  meeting_platform TEXT NOT NULL, -- 'google_meet', 'zoom', 'teams', 'slack', 'offline_in_person'
  meeting_id TEXT NOT NULL,       -- e.g. 'abc-defg-hij' or 'room-conf-alpha'
  meeting_title TEXT,
  location_type TEXT DEFAULT 'online', -- 'online', 'offline_in_person'
  room_name TEXT,
  active_contract JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  UNIQUE(company_code, meeting_platform, meeting_id)
);

-- Backwards-compatible migrations if table already exists
ALTER TABLE public.meeting_sessions ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'online';
ALTER TABLE public.meeting_sessions ADD COLUMN IF NOT EXISTS room_name TEXT;

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_lookup ON public.meeting_sessions(company_code, meeting_platform, meeting_id);

-- B. Real-Time Extension Participant Presence (Heartbeat Mesh)
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company_code TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'transcribing', 'idle'
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants(session_id);

-- C. Company Active Tasks & Assignments Ledger (Sealed Handshakes)
CREATE TABLE IF NOT EXISTS public.company_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  session_id UUID REFERENCES public.meeting_sessions(id) ON DELETE SET NULL,
  meeting_title TEXT,
  title TEXT NOT NULL,
  deliverable_format TEXT NOT NULL,
  deadline_sla TEXT,
  definition_of_done TEXT,
  anti_goals TEXT,
  delegator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delegator_name TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'in_review', 'completed'
  clarity_score INTEGER DEFAULT 90,
  contract_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_tasks_code ON public.company_tasks(company_code);
CREATE INDEX IF NOT EXISTS idx_company_tasks_status ON public.company_tasks(company_code, status);

-- D. Offline Conference Room Registry (For In-Person Company Meetings)
CREATE TABLE IF NOT EXISTS public.offline_meeting_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  room_name TEXT NOT NULL,
  room_slug TEXT NOT NULL,
  building TEXT DEFAULT 'HQ',
  capacity INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  UNIQUE(company_code, room_slug)
);

CREATE INDEX IF NOT EXISTS idx_offline_rooms_company ON public.offline_meeting_rooms(company_code);

-- E. Meeting Live Transcripts Stream (Online Calls & Offline In-Person Rooms)
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  platform TEXT DEFAULT 'offline_in_person', -- 'google_meet', 'zoom', 'teams', 'slack', 'offline_in_person'
  is_ambiguous BOOLEAN DEFAULT false,
  ambiguity_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transcripts_lookup ON public.meeting_transcripts(company_code, meeting_id);

-- F. Meeting Summaries & AI Action Matrix Ledger
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  meeting_title TEXT,
  platform TEXT NOT NULL,
  location_type TEXT DEFAULT 'online', -- 'online', 'offline_in_person'
  room_name TEXT,
  executive_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  clarity_score INTEGER DEFAULT 90,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_summaries_lookup ON public.meeting_summaries(company_code, meeting_id);

-- G. Enable RLS on All Tables
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read meeting_sessions" ON public.meeting_sessions;
CREATE POLICY "Allow read meeting_sessions" ON public.meeting_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write meeting_sessions" ON public.meeting_sessions;
CREATE POLICY "Allow write meeting_sessions" ON public.meeting_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read meeting_participants" ON public.meeting_participants;
CREATE POLICY "Allow read meeting_participants" ON public.meeting_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write meeting_participants" ON public.meeting_participants;
CREATE POLICY "Allow write meeting_participants" ON public.meeting_participants FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read company_tasks" ON public.company_tasks;
CREATE POLICY "Allow read company_tasks" ON public.company_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write company_tasks" ON public.company_tasks;
CREATE POLICY "Allow write company_tasks" ON public.company_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read offline_meeting_rooms" ON public.offline_meeting_rooms;
CREATE POLICY "Allow read offline_meeting_rooms" ON public.offline_meeting_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write offline_meeting_rooms" ON public.offline_meeting_rooms;
CREATE POLICY "Allow write offline_meeting_rooms" ON public.offline_meeting_rooms FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read meeting_transcripts" ON public.meeting_transcripts;
CREATE POLICY "Allow read meeting_transcripts" ON public.meeting_transcripts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write meeting_transcripts" ON public.meeting_transcripts;
CREATE POLICY "Allow write meeting_transcripts" ON public.meeting_transcripts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read meeting_summaries" ON public.meeting_summaries;
CREATE POLICY "Allow read meeting_summaries" ON public.meeting_summaries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write meeting_summaries" ON public.meeting_summaries;
CREATE POLICY "Allow write meeting_summaries" ON public.meeting_summaries FOR ALL USING (true);

