import { Pool, type PoolClient } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureTrackingTable(client: PoolClient) {
  await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
}

async function appliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query(`
     SELECT filename FROM schema_migrations ORDER BY filename 
    `);
  return new Set<string>(result.rows.map((row) => row.filename));
}

function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, "migrations");
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // zero-padded names, so alphabetical == numeric order
}

async function runMigration(client: PoolClient, filename: string): Promise<void> {
  const filePath = path.join(__dirname, "migrations", filename);
  const sql = fs.readFileSync(filePath, "utf8");

  // These Timescale calls fail inside a transaction block.
  const requiresNoTransaction =
    sql.includes("timescaledb.continuous") ||
    sql.includes("timescaledb.compress") ||
    sql.includes("add_compression_policy") ||
    sql.includes("add_retention_policy") ||
    sql.includes("add_continuous_aggregate_policy") ||
    sql.includes("refresh_continuous_aggregate");

  if (requiresNoTransaction) {
    const statements = sql
      .split(/;[ \t]*\n/)
      // strip leading -- comments so a comment-only fragment isn't queried
      .map((s) => s.replace(/^(--[^\n]*\n\s*)*/m, "").trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [
      filename,
    ]);
  } else {
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
    await ensureTrackingTable(client);

    const applied = await appliedMigrations(client);
    console.log(`[migrate] ${applied.size} migration(s) already applied.`);

    const files = getMigrationFiles();

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
