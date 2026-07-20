-- ============================================================================
-- SAKSHI — Supabase / Postgres schema (7 tables)
-- ============================================================================
-- OPTIONAL persistence layer. The deployed demo runs fully on the deterministic
-- in-memory seed store with NO database. Applying this schema to a Supabase
-- project (and setting the 3 env vars) upgrades SAKSHI to real, durable,
-- row-level-secured persistence — without changing the Gravity Core.
--
-- The design mirrors the idea PDF exactly:
--   farmers · fields (geo-polygons) · loss_events · evidence_receipts
--   (hash-chain) · corroboration_reports · claim_dossiers · audit_log
--
-- Hash-chain + append-only invariants are enforced in the database itself, so
-- the tamper-evidence is not merely an application convention.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1 · farmers -----------------------------------------------------------------
create table if not exists farmers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  village      text,
  tehsil       text,
  district     text,
  state        text,
  lang_pref    text not null default 'hi',
  phone_masked text,
  created_at   timestamptz not null default now()
);

-- 2 · fields (geo-polygons) ---------------------------------------------------
-- ring stored as JSONB array of {lat,lng}; PostGIS optional but not required.
create table if not exists fields (
  id         uuid primary key default gen_random_uuid(),
  farmer_id  uuid not null references farmers(id) on delete cascade,
  khasra     text,
  crop       text,
  crop_label text,
  area_ha    numeric(6,2),
  ring       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists fields_farmer_idx on fields(farmer_id);

-- 3 · loss_events -------------------------------------------------------------
create table if not exists loss_events (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null references fields(id) on delete cascade,
  farmer_id    uuid not null references farmers(id) on delete cascade,
  loss_type    text not null,
  loss_label   text,
  growth_stage text not null,
  event_at     timestamptz not null,
  reported_at  timestamptz not null,
  gps_lat      double precision not null,
  gps_lng      double precision not null,
  gps_accuracy numeric,
  created_at   timestamptz not null default now()
);
create index if not exists loss_events_field_idx on loss_events(field_id);

-- 4 · evidence_receipts (the append-only hash-chain) --------------------------
create table if not exists evidence_receipts (
  id           uuid primary key default gen_random_uuid(),
  chain_index  integer not null unique,
  event_id     uuid not null references loss_events(id) on delete restrict,
  prev_hash    char(64) not null,
  payload      jsonb not null,
  payload_hash char(64) not null,
  hash         char(64) not null unique,
  sealed_at    timestamptz not null,
  created_at   timestamptz not null default now()
);
create index if not exists receipts_event_idx on evidence_receipts(event_id);

-- 5 · corroboration_reports ---------------------------------------------------
create table if not exists corroboration_reports (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references loss_events(id) on delete cascade,
  receipt_hash   char(64) not null references evidence_receipts(hash),
  score          integer not null check (score between 0 and 100),
  verdict        text not null,
  components      jsonb not null,
  reasons        jsonb not null,
  engine_version text not null,
  computed_at    timestamptz not null default now()
);
create index if not exists reports_event_idx on corroboration_reports(event_id);

-- 6 · claim_dossiers ----------------------------------------------------------
create table if not exists claim_dossiers (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references loss_events(id) on delete cascade,
  receipt_hash char(64) not null references evidence_receipts(hash),
  score        integer not null,
  verdict      text not null,
  summary      jsonb not null,
  built_at     timestamptz not null default now()
);

-- 7 · audit_log (append-only) -------------------------------------------------
create table if not exists audit_log (
  seq          bigserial primary key,
  ts           timestamptz not null default now(),
  action       text not null,
  actor        text not null,
  event_id     uuid,
  receipt_hash char(64),
  detail       text not null
);

-- ---------------------------------------------------------------------------
-- Invariant 1: evidence_receipts and audit_log are APPEND-ONLY.
-- No UPDATE or DELETE may ever touch them — tamper-evidence at the DB layer.
-- ---------------------------------------------------------------------------
create or replace function sakshi_block_mutation() returns trigger as $$
begin
  raise exception 'SAKSHI: % on % is forbidden — this table is append-only.', tg_op, tg_table_name;
end;
$$ language plpgsql;

drop trigger if exists no_mutate_receipts on evidence_receipts;
create trigger no_mutate_receipts
  before update or delete on evidence_receipts
  for each row execute function sakshi_block_mutation();

drop trigger if exists no_mutate_audit on audit_log;
create trigger no_mutate_audit
  before update or delete on audit_log
  for each row execute function sakshi_block_mutation();

-- ---------------------------------------------------------------------------
-- Invariant 2: each new receipt must chain to the current tip.
-- chain_index must increment by 1 and prev_hash must equal the last hash.
-- ---------------------------------------------------------------------------
create or replace function sakshi_enforce_chain() returns trigger as $$
declare
  tip_index integer;
  tip_hash  char(64);
begin
  select chain_index, hash into tip_index, tip_hash
    from evidence_receipts order by chain_index desc limit 1;

  if tip_index is null then
    if new.chain_index <> 0 then
      raise exception 'SAKSHI: first receipt must have chain_index 0.';
    end if;
    if new.prev_hash <> repeat('0', 64) then
      raise exception 'SAKSHI: genesis receipt must point at the zero root.';
    end if;
  else
    if new.chain_index <> tip_index + 1 then
      raise exception 'SAKSHI: chain_index must be % (got %).', tip_index + 1, new.chain_index;
    end if;
    if new.prev_hash <> tip_hash then
      raise exception 'SAKSHI: prev_hash must embed the current tip hash.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_chain on evidence_receipts;
create trigger enforce_chain
  before insert on evidence_receipts
  for each row execute function sakshi_enforce_chain();

-- ---------------------------------------------------------------------------
-- Row-Level Security. Public (anon) may READ for the QR verifier & demo;
-- writes go through the service role only (server-side sealing).
-- ---------------------------------------------------------------------------
alter table farmers               enable row level security;
alter table fields                enable row level security;
alter table loss_events           enable row level security;
alter table evidence_receipts     enable row level security;
alter table corroboration_reports enable row level security;
alter table claim_dossiers        enable row level security;
alter table audit_log             enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'farmers','fields','loss_events','evidence_receipts',
    'corroboration_reports','claim_dossiers','audit_log'
  ] loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- No INSERT/UPDATE/DELETE policies for anon: only the service role key (which
-- bypasses RLS) can write. Secrets stay server-side. Tamper stays impossible.
