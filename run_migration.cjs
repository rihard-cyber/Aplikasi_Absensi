/**
 * Migration Runner — Eksekusi SQL ke Supabase PostgreSQL
 * 
 * Usage:
 *   1. Set env vars:
 *      $env:SUPABASE_DB_URL="postgresql://postgres:YOUR_DB_PASSWORD@db.bhauqlobuiuavaoeoawc.supabase.co:5432/postgres"
 *      node run_migration.js
 * 
 *   2. Or provide password interactively:
 *      node run_migration.js --db-password=YOUR_PASSWORD
 * 
 * Cara dapat DB password:
 *   - Buka https://supabase.com/dashboard/project/bhauqlobuiuavaoeoawc/settings/database
 *   - Copy "Connection string" → ambil password dari URI
 * 
 * Alternatif tanpa script:
 *   Buka https://supabase.com/dashboard/project/bhauqlobuiuavaoeoawc/sql/new
 *   Copy-paste isi file SQL di folder ini → Run
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const DB_URL = process.env.SUPABASE_DB_URL;
const argPassword = process.argv.find(a => a.startsWith('--db-password='))?.split('=')[1];

const PROJECT_REF = 'bhauqlobuiuavaoeoawc';
const MIGRATION_FILES = [
  'add_tenant_complaints.sql',
];

async function run() {
  if (!DB_URL && !argPassword) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  UNABLE TO CONNECT                                          ║
╠══════════════════════════════════════════════════════════════╣
║  Set SUPABASE_DB_URL env var or use --db-password flag       ║
║                                                              ║
║  Example:                                                    ║
║    $env:SUPABASE_DB_URL=\"postgresql://postgres:pass@db.${PROJECT_REF}.supabase.co:5432/postgres\"  ║
║    node run_migration.js                                     ║
║                                                              ║
║  OR run manually from Supabase Dashboard SQL Editor:         ║
║    1. https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new  ║
║    2. Copy-paste file content                                ║
║    3. Click Run                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    listMigrationFiles();
    process.exit(1);
  }

  const connectionString = DB_URL || `postgresql://postgres:${encodeURIComponent(argPassword)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

  console.log(`🔌 Connecting to ${PROJECT_REF}...`);
  
  const { Client } = require('pg');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected successfully.\n');

    for (const file of MIGRATION_FILES) {
      const filePath = join(__dirname, file);
      if (!existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${file}`);
        continue;
      }
      const sql = readFileSync(filePath, 'utf8');
      console.log(`▶️  Running migration: ${file}`);
      await client.query(sql);
      console.log(`✅ Done: ${file}\n`);
    }

    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('tenant_complaints')
    `);
    if (rows.length > 0) {
      console.log(`🎉 Table created: ${rows.map(r => r.table_name).join(', ')}`);
    } else {
      console.warn('⚠️  Table not found after migration — check for errors above.');
    }
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function listMigrationFiles() {
  console.log('\n📋 Available migrations:');
  for (const f of MIGRATION_FILES) {
    const full = join(__dirname, f);
    console.log(`   ${existsSync(full) ? '✅' : '❌'} ${f}`);
  }
}

run();
