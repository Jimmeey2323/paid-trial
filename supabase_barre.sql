-- Add Barre 57 trial form submissions table

begin;

create table if not exists public.barre57_trial_form_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  external_lead_id text,
  source_form text not null default 'barre-trial-form',
  status text not null default 'submitted' check (status in ('submitted', 'synced', 'failed_sync')),

  first_name text not null,
  last_name text not null,
  email text not null,
  phone_number text not null,
  phone_country text default 'IN',
  studio_location text not null,
  class_format text not null default 'Barre 57',
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

create index if not exists idx_barre57_email on public.barre57_trial_form_submissions(email);
create index if not exists idx_barre57_studio on public.barre57_trial_form_submissions(studio_location);
create index if not exists idx_barre57_submitted_at on public.barre57_trial_form_submissions(submitted_at desc);

commit;
