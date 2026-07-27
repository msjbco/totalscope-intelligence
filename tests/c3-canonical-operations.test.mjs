import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/202607270002_c3_canonical_operations.sql", "utf8");

test("generalized operational files bridge C1 without modifying it", () => {
  assert.match(migration, /create table public\.operational_files/);
  assert.match(migration, /legacy_claim_id uuid unique references public\.claims\(id\)/);
  assert.doesNotMatch(migration, /alter table public\.claims/);
  assert.doesNotMatch(migration, /drop\s+(table|constraint|function)/i);
});

test("clients, branches, people, files, history, and assignments use stable keys", () => {
  for (const key of [
    "stable_client_id",
    "stable_branch_id",
    "stable_user_id",
    "stable_file_id",
    "stable_status_event_id",
    "stable_assignment_id",
  ]) {
    assert.match(migration, new RegExp(`${key} text not null unique`));
  }
  assert.match(migration, /file_assignments_one_current_idx/);
  assert.match(migration, /where ended_at is null/);
});

test("ambiguous operational dates retain availability and timezone state", () => {
  assert.match(migration, /submitted_at_availability public\.availability_status/);
  assert.match(migration, /completed_at_availability public\.availability_status/);
  assert.match(migration, /source_timezone_status public\.timezone_status/);
  assert.match(migration, /completed_at is null or submitted_at is null or completed_at >= submitted_at/);
});

test("canonical field lineage is field-level, versioned, and immutable", () => {
  assert.match(migration, /create table public\.canonical_field_lineage/);
  assert.match(migration, /canonical_field_name text not null/);
  assert.match(migration, /source_field_path text not null/);
  assert.match(migration, /transformation_version text not null/);
  assert.match(migration, /authority_rule text not null/);
  assert.match(migration, /create trigger canonical_field_lineage_immutable/);
});

test("new canonical tables begin behind RLS with browser access revoked", () => {
  for (const table of ["clients", "branches", "operational_people", "operational_files", "file_status_events", "file_assignments", "canonical_field_lineage"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant .*\bto authenticated/);
});

test("photos remain outside canonical document scope", () => {
  assert.match(migration, /create table public\.file_documents/);
  assert.doesNotMatch(migration, /\b(photo|image_blob|image_file)\b/i);
});
