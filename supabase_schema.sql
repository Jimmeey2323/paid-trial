-- Supabase / Postgres schema for Physique 57 trial-form lead capture
-- Uses unique object names to avoid collisions with existing tables, triggers, and indexes.
-- Safe to run in the Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_physique57_trial_form_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.physique57_trial_form_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  external_lead_id text,
  source_form text not null default 'trial-form',
  status text not null default 'submitted' check (status in ('submitted', 'synced', 'failed_sync')),

  first_name text not null,
  last_name text not null,
  email text not null,
  phone_number text not null,
  phone_country text default 'IN',
  preferred_time text not null,
  studio_location text not null,
  class_format text not null,
  waiver_accepted boolean not null default true,

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

  ip_address inet,
  user_agent text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.physique57_trial_form_partials (
  id uuid primary key default gen_random_uuid(),
  form_session_id text not null unique,
  event_id text,
  status text not null default 'in_progress' check (status in ('in_progress', 'abandoned', 'submitted')),
  completion_percent numeric(5,2) not null default 0,
  last_completed_step text,

  first_name text,
  last_name text,
  email text,
  phone_number text,
  phone_country text default 'IN',
  preferred_time text,
  studio_location text,
  class_format text,
  waiver_accepted boolean,

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

  ip_address inet,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  submitted_submission_id uuid references public.physique57_trial_form_submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_physique57_trial_form_submissions_email
  on public.physique57_trial_form_submissions (lower(email));

create index if not exists idx_physique57_trial_form_submissions_submitted_at
  on public.physique57_trial_form_submissions (submitted_at desc);

create index if not exists idx_physique57_trial_form_submissions_studio_format
  on public.physique57_trial_form_submissions (studio_location, class_format);

create index if not exists idx_physique57_trial_form_submissions_campaign
  on public.physique57_trial_form_submissions (utm_campaign);

create index if not exists idx_physique57_trial_form_submissions_raw_payload
  on public.physique57_trial_form_submissions using gin (raw_payload);

create index if not exists idx_physique57_trial_form_partials_status
  on public.physique57_trial_form_partials (status, last_seen_at desc);

create index if not exists idx_physique57_trial_form_partials_email
  on public.physique57_trial_form_partials (lower(email));

create index if not exists idx_physique57_trial_form_partials_last_seen
  on public.physique57_trial_form_partials (last_seen_at desc);

create index if not exists idx_physique57_trial_form_partials_raw_payload
  on public.physique57_trial_form_partials using gin (raw_payload);

create or replace trigger trg_physique57_trial_form_submissions_updated_at
before update on public.physique57_trial_form_submissions
for each row
execute function public.set_physique57_trial_form_updated_at();

create or replace trigger trg_physique57_trial_form_partials_updated_at
before update on public.physique57_trial_form_partials
for each row
execute function public.set_physique57_trial_form_updated_at();

commit;