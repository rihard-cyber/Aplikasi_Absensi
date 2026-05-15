#!/bin/bash
# =============================================================================
# DEPLOY SCRIPT — SI PRESENSI PRO MAX
# =============================================================================
# Cara pakai:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
# =============================================================================

set -e

echo "🚀 SI PRESENSI PRO MAX — DEPLOYMENT"
echo "========================================"

# 1. Build
echo ""
echo "📦 Step 1: Building..."
npm run build

# 2. Copy landing page ke dist
echo "📄 Step 2: Copying landing page..."
cp public/landing.html dist/landing.html

# 3. Buat file version
echo "🔖 Step 3: Creating version file..."
echo "Built: $(date)" > dist/version.txt

# 4. Deploy ke server (ganti dengan server Anda)
echo ""
echo "🌐 Step 4: Deploying to server..."
echo "   Server: root@sipresensi.com"
echo "   Target: /var/www/sipresensi/dist"
echo ""

read -p "   Deploy now? (y/N): " confirm
if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    rsync -avz --delete dist/ root@sipresensi.com:/var/www/sipresensi/dist/
    
    echo ""
    echo "✅ Deploy selesai!"
    echo "   https://sipresensi.com — Landing Page"
    echo "   https://sipresensi.com/#/ — Aplikasi"
    echo "   https://sipresensi.com/landing.html — Static Landing"
else
    echo ""
    echo "⏸️  Deploy skipped. Files ready in dist/"
fi

echo ""
echo "========================================"
echo "🎉 Done!"
