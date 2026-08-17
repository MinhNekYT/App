create table if not exists public.vm_instances (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null check (name ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  repository text not null,
  status text not null default 'queued',
  github_run_id bigint,
  log_text text not null default '',
  sshx_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vm_instances enable row level security;
create policy "No direct client access" on public.vm_instances for all using (false) with check (false);
