-- Argos — initial schema (Phase 1)
-- Run this in the Supabase SQL editor (or via supabase CLI migrations).
-- Every table carries owner_id and is protected by RLS: auth.uid() = owner_id.

-- ============================================================
-- clients
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  siret text,
  address text,
  tenant_id text,
  tenant_domain text,
  subscription_active boolean not null default true,
  subscription_price numeric(10,2) not null default 39,
  hourly_rate numeric(10,2) not null default 30,
  after_hours_multiplier numeric(4,2) not null default 1.5,
  billing_minimum_minutes integer not null default 30,
  billing_increment_minutes integer not null default 15,
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- ============================================================
-- contacts
-- ============================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean not null default false
);

-- ============================================================
-- devices
-- ============================================================
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  hostname text not null,
  serial_number text,
  model text,
  os text,
  purchase_date date,
  warranty_end date,
  assigned_contact_id uuid references public.contacts (id) on delete set null,
  intune_enrolled boolean not null default false,
  defender_onboarded boolean not null default false,
  status text not null default 'active' check (status in ('active', 'stock', 'retired')),
  notes text
);

-- ============================================================
-- licenses
-- ============================================================
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  product text not null,
  quantity integer not null default 1,
  assigned_contact_id uuid references public.contacts (id) on delete set null,
  renewal_date date,
  monthly_cost numeric(10,2) -- informational only: no margin, no rebilling
);

-- ============================================================
-- tickets
-- ============================================================
create sequence public.ticket_reference_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  reference text not null unique
    default 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_reference_seq')::text, 4, '0'),
  client_id uuid not null references public.clients (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'support'
    check (category in ('support', 'admin', 'securite', 'projet', 'supervision')),
  priority text not null default 'normal'
    check (priority in ('bloquant', 'normal', 'bas')),
  status text not null default 'nouveau'
    check (status in ('nouveau', 'en_cours', 'attente_client', 'resolu', 'ferme')),
  billable boolean not null default true,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution text,
  -- resolution is mandatory once the ticket is resolved or closed
  constraint resolution_required check (
    status not in ('resolu', 'ferme') or (resolution is not null and length(trim(resolution)) > 0)
  )
);

-- ============================================================
-- time_entries
-- ============================================================
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  date date not null default current_date,
  start_time time,
  duration_minutes integer not null check (duration_minutes > 0),
  after_hours boolean not null default false, -- computed client-side from start_time, manually overridable
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- monthly_reports
-- ============================================================
create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  defender_alerts_reviewed integer,
  defender_alerts_resolved integer,
  devices_compliant integer,
  devices_total integer,
  updates_status text,
  accounts_reviewed text,
  recommendations text,
  generated_at timestamptz,
  sent_at timestamptz,
  unique (client_id, month)
);

-- ============================================================
-- billing_summaries — the "bon à facturer", NOT an invoice
-- ============================================================
create table public.billing_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  subscription_amount numeric(10,2) not null default 0,
  billable_minutes integer not null default 0,
  billable_amount numeric(10,2) not null default 0,
  after_hours_minutes integer not null default 0,
  after_hours_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  lines jsonb not null default '[]'::jsonb, -- per-ticket detail
  status text not null default 'brouillon'
    check (status in ('brouillon', 'valide', 'facture_externe')),
  exported_at timestamptz,
  unique (client_id, month)
);

-- ============================================================
-- Row Level Security — every table, no exception
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'contacts', 'devices', 'licenses',
    'tickets', 'time_entries', 'monthly_reports', 'billing_summaries'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner_all_%s" on public.%I for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)',
      t, t
    );
  end loop;
end $$;

-- Useful indexes
create index idx_contacts_client on public.contacts (client_id);
create index idx_devices_client on public.devices (client_id);
create index idx_licenses_client on public.licenses (client_id);
create index idx_tickets_client on public.tickets (client_id);
create index idx_tickets_status on public.tickets (status);
create index idx_time_entries_ticket on public.time_entries (ticket_id);
create index idx_time_entries_date on public.time_entries (date);
