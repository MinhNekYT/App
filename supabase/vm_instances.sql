create table if not exists public.vm_instances (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
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
create policy "Read own VM instances" on public.vm_instances for select using (auth.uid() = owner_id);
create policy "No direct client writes" on public.vm_instances for all using (false) with check (false);
