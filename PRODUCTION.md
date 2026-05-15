# 🚀 SI PRESENSI PRO MAX — Production Guide

## 1-Panel Deployment untuk Website + APK

```
📁 dist/                  → Build React app
├── index.html            → React entry point (HashRouter)
├── landing.html          → Static landing page for SEO
├── assets/*.js           → React chunks (lazy-loaded)
└── assets/*.css          → Styles
```

---

## 🔧 Web Server (Nginx)

```bash
# 1. Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sipresensi

# 2. Enable site
sudo ln -s /etc/nginx/sites-available/sipresensi /etc/nginx/sites-enabled/

# 3. Setup SSL (Let's Encrypt)
sudo certbot --nginx -d sipresensi.com -d www.sipresensi.com

# 4. Deploy
./deploy/deploy.sh

# 5. Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Hasil:

| URL | Yang Ditampilkan |
|-----|-----------------|
| `sipresensi.com/` | **landing.html** (static, SEO) |
| `sipresensi.com/#/` | **React LandingPage** (interaktif) |
| `sipresensi.com/#/login` | **Auth Portal** (login/register) |
| `sipresensi.com/#/app` | **Employee Dashboard** |
| `sipresensi.com/#/superadmin` | **Super Admin** |
| `sipresensi.com/#/tenantadmin` | **Tenant Admin** |
| `sipresensi.com/landing.html` | **Static landing** (fallback) |

---

## 📱 Android APK (Capacitor)

```bash
# 1. Build React
npm run build

# 2. Sync ke Capacitor
npx cap sync android

# 3. Generate keystore (1x saja)
keytool -genkey -v -keystore release.keystore -alias sipresensi \
  -keyalg RSA -keysize 2048 -validity 10000

# 4. Build APK
cd android
./gradlew assembleRelease

# 5. APK siap di: android/app/build/outputs/apk/release/
```

### File APK untuk Play Store:

```
android/app/build/outputs/bundle/release/app-release.aab  → Play Store
android/app/build/outputs/apk/release/app-release.apk     → Direct install
```

---

## 🤖 SEO Checklist

- [ ] Google Search Console: daftarkan `sipresensi.com`
- [ ] Submit sitemap: `sipresensi.com/sitemap.xml`
- [ ] Pastikan `landing.html` ter-index (via GSC)
- [ ] Social preview: share URL ke WhatsApp/Telegram — cek previewnya

---

## 📊 Monitoring

```bash
# Cek log nginx
sudo tail -f /var/log/nginx/sipresensi_access.log
sudo tail -f /var/log/nginx/sipresensi_error.log

# Cek status
curl -I https://sipresensi.com
```
