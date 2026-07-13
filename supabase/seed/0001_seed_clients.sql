-- Argos — seed data: the two real clients (Phase 1)
-- Run AFTER creating your auth user, while owner_id default (auth.uid()) won't
-- apply in the SQL editor: replace <OWNER_ID> with your user's UUID
-- (Dashboard > Authentication > Users > copy the ID).

insert into public.clients (owner_id, name, notes)
values
  ('<OWNER_ID>', 'LSM Logistics', '2 postes'),
  ('<OWNER_ID>', 'Eurofret', '3 postes');

-- Devices (2 for LSM Logistics, 3 for Eurofret) — placeholders to rename later
insert into public.devices (owner_id, client_id, hostname, status)
select '<OWNER_ID>', c.id, h.hostname, 'active'
from public.clients c
join lateral (
  values ('LSM-PC-01'), ('LSM-PC-02')
) as h(hostname) on c.name = 'LSM Logistics'
union all
select '<OWNER_ID>', c.id, h.hostname, 'active'
from public.clients c
join lateral (
  values ('EURO-PC-01'), ('EURO-PC-02'), ('EURO-PC-03')
) as h(hostname) on c.name = 'Eurofret';
