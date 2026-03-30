import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Bootstrap the table
async function ensureTrackingTable(client: any) {
  await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
}

// Check what is applied
async function appliedMigrations(client: any): Promise<Set<string>> {
  const result = await client.query(`
     SELECT filename FROM schema_migrations ORDER BY filename 
    `);
  return new Set(result.rows.map((row: any) => row.filename));
}

// Read migration files
function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, "migrations");
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // alphabetical = numeric order given our naming convention
}

// Run single migration
async function runMigration(client: any, filename: string): Promise<void> {
  const filePath = path.join(__dirname, "migrations", filename);
  const sql = fs.readFileSync(filePath, "utf8");

  // Certain TimescaleDB statements must run outside a transaction
  const requiresNoTransaction =
    sql.includes("timescaledb.continuous") ||
    sql.includes("timescaledb.compress") ||
    sql.includes("add_compression_policy") ||
    sql.includes("add_retention_policy") ||
    sql.includes("add_continuous_aggregate_policy") ||
    sql.includes("refresh_continuous_aggregate");

  if (requiresNoTransaction) {
    // Split into individual statements so each runs in its own autocommit
    // context — TimescaleDB functions like refresh_continuous_aggregate and
    // create_hypertable cannot run inside a multi-statement implicit transaction.
    const statements = sql
      .split(/;[ \t]*\n/)
      .map((s) => s.replace(/^(--[^\n]*\n\s*)*/m, "").trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [
      filename,
    ]);
  } else {
    // Wrap in a transaction — if anything fails, the whole migration rolls back
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1)`,
        [filename]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
}

async function migrate() {
  console.log("[migrate] Starting database migrations...");

  const client = await pool.connect();

  try {
    // Step 1: ensure our tracking table exists
    await ensureTrackingTable(client);

    // Step 2: find out what's already been applied
    const applied = await appliedMigrations(client);
    console.log(`[migrate] ${applied.size} migration(s) already applied.`);

    // Step 3: get all migration files from disk
    const files = getMigrationFiles();

    // Step 4: run only what hasn't been applied
    let ranCount = 0;
    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`  ↷  ${filename} (already applied)`);
        continue;
      }

      console.log(`  →  ${filename} (running...)`);
      await runMigration(client, filename);
      console.log(`  ✓  ${filename} (done)`);
      ranCount++;
    }

    if (ranCount === 0) {
      console.log("[migrate] Nothing to run. Database is up to date.");
    } else {
      console.log(`[migrate] Applied ${ranCount} migration(s) successfully.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err.message);
  process.exit(1);
});
