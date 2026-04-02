-- ============================================================================
-- Complete SQL Migration Script for Trial Form Database
-- ============================================================================
-- This script creates all necessary tables and indexes for both:
--   1. Physique 57 Trial Form Submissions
--   2. Barre 57 Trial Form Submissions
--
-- Safe to run multiple times in Supabase SQL editor.
-- Uses "create if not exists" for all objects.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Helper Functions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_trial_form_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

-- ============================================================================
-- PHYSIQUE 57 TABLES
-- ============================================================================

-- Main submissions table for Physique 57 trial bookings
CREATE TABLE IF NOT EXISTS public.physique57_trial_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  external_lead_id text,
  source_form text NOT NULL DEFAULT 'trial-form',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'synced', 'failed_sync')),

  -- Lead Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  phone_country text DEFAULT 'IN',
  
  -- Trial Details
  preferred_time text NOT NULL,
  studio_location text NOT NULL,
  class_format text NOT NULL,
  waiver_accepted boolean NOT NULL DEFAULT true,

  -- Marketing Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_id text,
  utm_term text,
  gclid text,
  fbclid text,
  msclkid text,
  ttclid text,
  gbraid text,
  wbraid text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,

  -- Metadata
  ip_address inet,
  user_agent text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Partial/draft submissions for Physique 57 (for abandoned cart recovery)
CREATE TABLE IF NOT EXISTS public.physique57_trial_form_partials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_session_id text NOT NULL UNIQUE,
  event_id text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'abandoned', 'submitted')),
  completion_percent numeric(5,2) NOT NULL DEFAULT 0,
  last_completed_step text,

  -- Lead Information (partial)
  first_name text,
  last_name text,
  email text,
  phone_number text,
  phone_country text DEFAULT 'IN',
  
  -- Trial Details (partial)
  preferred_time text,
  studio_location text,
  class_format text,
  waiver_accepted boolean,

  -- Marketing Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_id text,
  utm_term text,
  gclid text,
  fbclid text,
  msclkid text,
  ttclid text,
  gbraid text,
  wbraid text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,

  -- Metadata
  ip_address inet,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  submitted_submission_id uuid REFERENCES public.physique57_trial_form_submissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================================
-- BARRE 57 TABLES
-- ============================================================================

-- Main submissions table for Barre 57 trial bookings (no payment required)
CREATE TABLE IF NOT EXISTS public.barre57_trial_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  external_lead_id text,
  source_form text NOT NULL DEFAULT 'barre-trial-form',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'synced', 'failed_sync')),

  -- Lead Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  phone_country text DEFAULT 'IN',
  
  -- Trial Details
  studio_location text NOT NULL,
  class_format text NOT NULL DEFAULT 'Barre 57',
  waiver_accepted boolean NOT NULL DEFAULT true,

  -- Marketing Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_id text,
  utm_term text,
  gclid text,
  fbclid text,
  msclkid text,
  ttclid text,
  gbraid text,
  wbraid text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,

  -- Metadata
  ip_address inet,
  user_agent text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Partial/draft submissions for Barre 57 (for abandoned form recovery)
CREATE TABLE IF NOT EXISTS public.barre57_trial_form_partials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_session_id text NOT NULL UNIQUE,
  event_id text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'abandoned', 'submitted')),
  completion_percent numeric(5,2) NOT NULL DEFAULT 0,
  last_completed_step text,

  -- Lead Information (partial)
  first_name text,
  last_name text,
  email text,
  phone_number text,
  phone_country text DEFAULT 'IN',
  
  -- Trial Details (partial)
  studio_location text,
  class_format text,
  waiver_accepted boolean,

  -- Marketing Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_id text,
  utm_term text,
  gclid text,
  fbclid text,
  msclkid text,
  ttclid text,
  gbraid text,
  wbraid text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,

  -- Metadata
  ip_address inet,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  submitted_submission_id uuid REFERENCES public.barre57_trial_form_submissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================================
-- INDEXES - PHYSIQUE 57
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_email
  ON public.physique57_trial_form_submissions (lower(email));

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_submitted_at
  ON public.physique57_trial_form_submissions (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_studio_format
  ON public.physique57_trial_form_submissions (studio_location, class_format);

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_campaign
  ON public.physique57_trial_form_submissions (utm_campaign);

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_raw_payload
  ON public.physique57_trial_form_submissions USING GIN (raw_payload);

CREATE INDEX IF NOT EXISTS idx_physique57_submissions_event_id
  ON public.physique57_trial_form_submissions (event_id);

CREATE INDEX IF NOT EXISTS idx_physique57_partials_status
  ON public.physique57_trial_form_partials (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_physique57_partials_email
  ON public.physique57_trial_form_partials (lower(email));

CREATE INDEX IF NOT EXISTS idx_physique57_partials_last_seen
  ON public.physique57_trial_form_partials (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_physique57_partials_raw_payload
  ON public.physique57_trial_form_partials USING GIN (raw_payload);

-- ============================================================================
-- INDEXES - BARRE 57
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_email
  ON public.barre57_trial_form_submissions (lower(email));

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_studio
  ON public.barre57_trial_form_submissions (studio_location);

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_submitted_at
  ON public.barre57_trial_form_submissions (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_campaign
  ON public.barre57_trial_form_submissions (utm_campaign);

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_raw_payload
  ON public.barre57_trial_form_submissions USING GIN (raw_payload);

CREATE INDEX IF NOT EXISTS idx_barre57_submissions_event_id
  ON public.barre57_trial_form_submissions (event_id);

CREATE INDEX IF NOT EXISTS idx_barre57_partials_status
  ON public.barre57_trial_form_partials (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_barre57_partials_email
  ON public.barre57_trial_form_partials (lower(email));

CREATE INDEX IF NOT EXISTS idx_barre57_partials_last_seen
  ON public.barre57_trial_form_partials (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_barre57_partials_raw_payload
  ON public.barre57_trial_form_partials USING GIN (raw_payload);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER trg_physique57_submissions_updated_at
BEFORE UPDATE ON public.physique57_trial_form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_form_updated_at();

CREATE OR REPLACE TRIGGER trg_physique57_partials_updated_at
BEFORE UPDATE ON public.physique57_trial_form_partials
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_form_updated_at();

CREATE OR REPLACE TRIGGER trg_barre57_submissions_updated_at
BEFORE UPDATE ON public.barre57_trial_form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_form_updated_at();

CREATE OR REPLACE TRIGGER trg_barre57_partials_updated_at
BEFORE UPDATE ON public.barre57_trial_form_partials
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_form_updated_at();

-- ============================================================================
-- COMMENTS (for documentation in Supabase UI)
-- ============================================================================

COMMENT ON TABLE public.physique57_trial_form_submissions IS 
  'Physique 57 trial form submissions - leads completing paid trial booking with payment verification';

COMMENT ON TABLE public.physique57_trial_form_partials IS 
  'Physique 57 abandoned form sessions - partial data for cart recovery and re-targeting';

COMMENT ON TABLE public.barre57_trial_form_submissions IS 
  'Barre 57 trial form submissions - leads booking free trial without payment';

COMMENT ON TABLE public.barre57_trial_form_partials IS 
  'Barre 57 abandoned form sessions - partial data for cart recovery and re-targeting';

COMMENT ON COLUMN public.physique57_trial_form_submissions.status IS 
  'submitted: Form submitted by user | synced: Successfully synced to Momence/external system | failed_sync: Failed to sync after submission';

COMMENT ON COLUMN public.barre57_trial_form_submissions.class_format IS 
  'Always Barre 57 for this table - auto-populated class format';

COMMIT;

-- ============================================================================
-- DATABASE VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful:

-- Check all trial form tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%trial_form%';

-- Count records by table:
-- SELECT 'physique57_submissions' as table_name, COUNT(*) as record_count FROM public.physique57_trial_form_submissions
-- UNION ALL
-- SELECT 'physique57_partials', COUNT(*) FROM public.physique57_trial_form_partials
-- UNION ALL
-- SELECT 'barre57_submissions', COUNT(*) FROM public.barre57_trial_form_submissions
-- UNION ALL
-- SELECT 'barre57_partials', COUNT(*) FROM public.barre57_trial_form_partials;

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename LIKE '%trial_form%' ORDER BY indexname;
