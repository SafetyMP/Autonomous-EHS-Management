#!/usr/bin/env tsx
/**
 * PortCo staging pilot verification — validates iPaaS fixtures and optionally POSTs to staging.
 *
 * Usage:
 *   npm run portco:pilot-verify
 *   npm run portco:pilot-verify -- --live   # requires PORTCO_PILOT_BASE_URL + INTEGRATION_INBOUND_SECRET
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { integrationInboundSchema } from "../src/lib/integration/inboundEnvelope";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

const fixtureDir = resolve(process.cwd(), "tests/fixtures/integration");
const FIXTURES = [
  "workday-hris-sync.json",
  "adp-hris-sync.json",
  "bamboohr-hris-sync.json",
  "hris-contractor-sync.json",
] as const;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function pass(msg: string) {
  console.log(`OK: ${msg}`);
}

async function postFixture(name: string, raw: Record<string, unknown>) {
  const baseUrl = process.env.PORTCO_PILOT_BASE_URL?.replace(/\/$/, "");
  const secret = process.env.INTEGRATION_INBOUND_SECRET;
  const orgId = process.env.PORTCO_PILOT_ORG_ID;

  if (!baseUrl || !secret) {
    fail("Live mode requires PORTCO_PILOT_BASE_URL and INTEGRATION_INBOUND_SECRET");
  }

  const body = orgId ? { ...raw, organizationId: orgId } : raw;
  const res = await fetch(`${baseUrl}/api/integration/inbound`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok && res.status !== 202) {
    fail(`${name} POST ${res.status}: ${JSON.stringify(json)}`);
  }
  pass(`${name} POST ${res.status}`);
}

async function main() {
  const live = process.argv.includes("--live");
  let validated = 0;

  for (const file of FIXTURES) {
    const path = resolve(fixtureDir, file);
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const parsed = integrationInboundSchema.safeParse(raw);
    if (!parsed.success) {
      fail(`${file} failed Zod validation: ${parsed.error.message}`);
    }
    pass(`${file} validates (${parsed.data.kind})`);
    validated += 1;

    if (live) {
      await postFixture(file, raw);
    }
  }

  console.log(`\nValidated ${validated} fixtures.`);
  if (!live) {
    console.log("Tip: run with --live to POST fixtures to PORTCO_PILOT_BASE_URL (staging).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
