#!/usr/bin/env node
/**
 * Seeds 5 users, each with one site, into tests/load/data/users.csv.
 * Idempotent: a 409 on re-run reuses the existing user or site.
 *
 *   pnpm load:seed
 *   TARGET=http://staging.example.com pnpm load:seed
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// so the caller need not source load-test.env first
const envPath = join(__dirname, "load-test.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^export\s+(\w+)=(.+)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}

const TARGET = process.env.TARGET || "http://localhost:8000";
const CSV_PATH = join(__dirname, "data", "users.csv");

const USERS = [
  {
    name: "Load Test 01",
    email: "loadtest01@gmail.com",
    password: "Password@123",
    domain: "loadtest01.example.com",
  },
  {
    name: "Load Test 02",
    email: "loadtest02@gmail.com",
    password: "Password@123",
    domain: "loadtest02.example.com",
  },
  {
    name: "Load Test 03",
    email: "loadtest03@gmail.com",
    password: "Password@123",
    domain: "loadtest03.example.com",
  },
  {
    name: "Load Test 04",
    email: "loadtest04@gmail.com",
    password: "Password@123",
    domain: "loadtest04.example.com",
  },
  {
    name: "Load Test 05",
    email: "loadtest05@gmail.com",
    password: "Password@123",
    domain: "loadtest05.example.com",
  },
];

async function register(user) {
  const res = await fetch(`${TARGET}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
    }),
  });
  // 409 means a previous run created them
  if (res.status !== 200 && res.status !== 201 && res.status !== 409) {
    const body = await res.text();
    throw new Error(
      `Register failed for ${user.email}: HTTP ${res.status} — ${body}`
    );
  }
}

async function login(user) {
  const res = await fetch(`${TARGET}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Login failed for ${user.email}: HTTP ${res.status} — ${body}`
    );
  }
  const body = await res.json();
  return body.data.accessToken;
}

async function createOrGetSite(token, user) {
  const res = await fetch(`${TARGET}/api/v1/sites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: `Load Test Site (${user.email})`,
      domain: user.domain,
    }),
  });

  if (res.status === 200 || res.status === 201) {
    const body = await res.json();
    return body.data.site;
  }

  if (res.status === 409) {
    // already exists, so match it by domain
    const listRes = await fetch(`${TARGET}/api/v1/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok)
      throw new Error(`Get sites failed: HTTP ${listRes.status}`);
    const listBody = await listRes.json();
    const site = listBody.data.find((s) => s.domain === user.domain);
    if (!site)
      throw new Error(`Could not find existing site for domain ${user.domain}`);
    return site;
  }

  const body = await res.text();
  throw new Error(
    `Create site failed for ${user.domain}: HTTP ${res.status} — ${body}`
  );
}

async function seed() {
  console.log(`Target: ${TARGET}\n`);
  mkdirSync(join(__dirname, "data"), { recursive: true });

  const rows = ["email,password,siteId,trackingId"];

  for (const user of USERS) {
    process.stdout.write(`  ${user.email} ... `);

    await register(user);
    const token = await login(user);
    const site = await createOrGetSite(token, user);

    rows.push(`${user.email},${user.password},${site.id},${site.trackingId}`);
    console.log(`ok  (siteId=${site.id}  tid=${site.trackingId})`);
  }

  writeFileSync(CSV_PATH, rows.join("\n") + "\n");

  console.log(`\nCSV → ${CSV_PATH}`);
  console.log("Run load tests:");
  console.log("  pnpm load:ingestion");
  console.log("  pnpm load:analytics");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
