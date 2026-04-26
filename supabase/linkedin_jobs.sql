create table if not exists public.linkedin_jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text not null,
  posted_at timestamptz,
  posted_at_timestamp bigint,
  years_of_experience text,
  linkedin_url text,
  apply_url text,
  hidden boolean not null default false,
  hidden_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_jobs_posted_at_idx
  on public.linkedin_jobs (posted_at desc);

create index if not exists linkedin_jobs_hidden_idx
  on public.linkedin_jobs (hidden);

create index if not exists linkedin_jobs_years_of_experience_idx
  on public.linkedin_jobs (years_of_experience);
