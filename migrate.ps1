param(
  [string]$DbPassword,
  [switch]$Help
)

$PROJECT_REF = "bhauqlobuiuavaoeoawc"
$MIGRATION_FILE = "add_tenant_complaints.sql"

if ($Help -or !$DbPassword) {
  Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║  SUPABASE MIGRATION RUNNER                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Jalankan migration SQL ke Supabase project                 ║
║                                                              ║
║  USAGE:                                                      ║
║    .\migrate.ps1 -DbPassword "YOUR_DB_PASSWORD"              ║
║                                                              ║
║  Alternatif (lewat Dashboard SQL Editor):                    ║
║    1. Buka link di bawah                                     ║
║    2. Copy-paste isi file add_tenant_complaints.sql          ║
║    3. Klik Run                                               ║
║                                                              ║
║    https://supabase.com/dashboard/project/$PROJECT_REF/sql/new  ║
║                                                              ║
║  Cara dapat password:                                        ║
║    Dashboard > Project Settings > Database > Connection string ║
╚══════════════════════════════════════════════════════════════╝
"@
  if (Test-Path $MIGRATION_FILE) {
    Write-Host "`n📄 Migration file found: $MIGRATION_FILE ($((Get-Item $MIGRATION_FILE).Length) bytes)"
    Write-Host "   SQL yang akan dijalankan:"
    Write-Host "   " -NoNewline
    Get-Content $MIGRATION_FILE | ForEach-Object { Write-Host "   $_" }
  } else {
    Write-Host "`n❌ Migration file not found: $MIGRATION_FILE"
  }
  return
}

# Build connection string
$DB_URL = "postgresql://postgres:$([System.Web.HttpUtility]::UrlEncode($DbPassword))@db.$PROJECT_REF.supabase.co:5432/postgres"

Write-Host "🔌 Connecting to $PROJECT_REF..."

try {
  # Try using npx supabase
  $env:SUPABASE_DB_URL = $DB_URL
  npx supabase db execute --db-url $DB_URL -f $MIGRATION_FILE 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration berhasil!"
  } else {
    Write-Host "`n⚠️  npx supabase failed, trying node script..."
    node run_migration.js
  }
}
catch {
  Write-Host "`n❌ Error: $_"
  Write-Host "`nCoba manual: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
}
