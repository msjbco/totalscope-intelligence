-- TotalScope Intelligence C3: canonical financial facts and first-class payment events.
-- Amounts are stored in currency minor units. Missing values remain explicit availability states.

create table public.file_financial_facts (
  id uuid primary key default gen_random_uuid(),
  stable_financial_fact_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  metric_key text not null,
  amount_minor bigint,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  availability public.availability_status not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now(),
  check (
    (availability = 'captured' and amount_minor is not null)
    or (availability <> 'captured' and amount_minor is null)
  )
);

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  stable_invoice_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  client_id uuid not null references public.clients(id),
  invoice_date date not null,
  status text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.billing_invoice_charges (
  id uuid primary key default gen_random_uuid(),
  stable_charge_id text not null unique,
  billing_invoice_id uuid not null references public.billing_invoices(id),
  charge_type text not null,
  amount_minor bigint,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  availability public.availability_status not null,
  client_billable boolean not null,
  voided boolean not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now(),
  check (
    (availability = 'captured' and amount_minor is not null)
    or (availability <> 'captured' and amount_minor is null)
  )
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  stable_payment_id text not null unique,
  billing_invoice_id uuid references public.billing_invoices(id),
  operational_file_id uuid references public.operational_files(id),
  amount_minor bigint not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null,
  settled_at timestamptz,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.refund_events (
  id uuid primary key default gen_random_uuid(),
  stable_refund_id text not null unique,
  payment_event_id uuid not null references public.payment_events(id),
  amount_minor bigint not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null,
  refunded_at timestamptz not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.payment_failure_events (
  id uuid primary key default gen_random_uuid(),
  stable_failure_id text not null unique,
  billing_invoice_id uuid references public.billing_invoices(id),
  amount_minor bigint,
  amount_availability public.availability_status not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  failure_code text not null,
  failed_at timestamptz not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now(),
  check (
    (amount_availability = 'captured' and amount_minor is not null)
    or (amount_availability <> 'captured' and amount_minor is null)
  )
);

create table public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  stable_dispute_id text not null unique,
  payment_event_id uuid not null references public.payment_events(id),
  amount_minor bigint not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null,
  opened_at timestamptz not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.processor_fee_events (
  id uuid primary key default gen_random_uuid(),
  stable_processor_fee_id text not null unique,
  payment_event_id uuid not null references public.payment_events(id),
  amount_minor bigint not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  assessed_at timestamptz not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create index file_financial_facts_file_metric_idx on public.file_financial_facts(operational_file_id, metric_key);
create index billing_invoices_file_date_idx on public.billing_invoices(operational_file_id, invoice_date);
create index billing_invoice_charges_invoice_idx on public.billing_invoice_charges(billing_invoice_id);
create index payment_events_invoice_idx on public.payment_events(billing_invoice_id);
create index refund_events_payment_idx on public.refund_events(payment_event_id);
create index payment_failure_events_invoice_date_idx on public.payment_failure_events(billing_invoice_id, failed_at);
create index dispute_events_payment_idx on public.dispute_events(payment_event_id);
create index processor_fee_events_payment_idx on public.processor_fee_events(payment_event_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'file_financial_facts', 'billing_invoices', 'billing_invoice_charges',
    'payment_events', 'refund_events', 'payment_failure_events',
    'dispute_events', 'processor_fee_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  end loop;
end $$;

create trigger file_financial_facts_immutable
before update or delete on public.file_financial_facts
for each row execute function public.prevent_immutable_source_mutation();
create trigger billing_invoices_immutable
before update or delete on public.billing_invoices
for each row execute function public.prevent_immutable_source_mutation();
create trigger billing_invoice_charges_immutable
before update or delete on public.billing_invoice_charges
for each row execute function public.prevent_immutable_source_mutation();
create trigger payment_events_immutable
before update or delete on public.payment_events
for each row execute function public.prevent_immutable_source_mutation();
create trigger refund_events_immutable
before update or delete on public.refund_events
for each row execute function public.prevent_immutable_source_mutation();
create trigger payment_failure_events_immutable
before update or delete on public.payment_failure_events
for each row execute function public.prevent_immutable_source_mutation();
create trigger dispute_events_immutable
before update or delete on public.dispute_events
for each row execute function public.prevent_immutable_source_mutation();
create trigger processor_fee_events_immutable
before update or delete on public.processor_fee_events
for each row execute function public.prevent_immutable_source_mutation();
