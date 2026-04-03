# VPS Deployment Guide - Silent Reading Club

Panduan lengkap deploy Next.js app ke VPS dari fresh setup.

---

## Prerequisites

- VPS dengan Ubuntu 22.04 LTS (atau 20.04)
- Domain yang sudah pointing ke IP VPS (opsional tapi recommended)
- Access SSH ke VPS
- Supabase project sudah setup dan migrations sudah dijalankan

---

## 1. Setup VPS Awal

### Login ke VPS

```bash
ssh root@your-vps-ip
```

### Update sistem

```bash
apt update && apt upgrade -y
```

### Buat user non-root (recommended)

```bash
adduser deploy
usermod -aG sudo deploy
```

Logout dan login sebagai user `deploy`:

```bash
exit
ssh deploy@your-vps-ip
```

---

## 2. Install Node.js (via NVM)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS
nvm install --lts
nvm use --lts

# Verify
node -v
npm -v
```

---

## 3. Install Git & Clone Repository

```bash
# Install Git
sudo apt install git -y

# Clone project
cd ~
git clone https://github.com/YOUR-USERNAME/silent-reading-club.git
cd silent-reading-club
```

---

## 4. Setup Environment Variables

```bash
# Copy example
cp .env.example .env

# Edit dengan nano/vim
nano .env
```

Isi dengan credentials production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-real-publishable-key
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # atau http://your-vps-ip:3000
ADMIN_SECRET=your-very-secure-random-secret
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 5. Install Dependencies & Build

```bash
# Install dependencies
npm install

# Build production
npm run build
```

**Tunggu hingga selesai** (bisa 2-5 menit). Jika berhasil, akan muncul `.next` folder.

---

## 6. Install & Setup PM2 (Process Manager)

PM2 untuk keep app running 24/7 dan auto-restart.

```bash
# Install PM2 globally
npm install -g pm2

# Start app dengan PM2
pm2 start npm --name "silent-reading-club" -- start

# Auto-start on boot
pm2 startup
# Copy-paste command yang muncul, lalu jalankan

pm2 save
```

### PM2 Commands (untuk maintenance):

```bash
pm2 status              # Lihat status
pm2 logs                # Lihat logs
pm2 restart silent-reading-club   # Restart app
pm2 stop silent-reading-club      # Stop app
pm2 delete silent-reading-club    # Remove app
```

---

## 7. Install & Setup Nginx (Reverse Proxy)

Nginx akan forward request dari port 80/443 ke Next.js (port 3000).

### Install Nginx

```bash
sudo apt install nginx -y
```

### Buat Nginx config

```bash
sudo nano /etc/nginx/sites-available/silent-reading-club
```

Paste config ini:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Ganti dengan domain kamu

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Jika belum punya domain**, gunakan IP saja:

```nginx
server {
    listen 80;
    server_name your-vps-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Enable site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/silent-reading-club /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 8. Setup Firewall (UFW)

```bash
# Allow SSH (penting!)
sudo ufw allow OpenSSH

# Allow HTTP & HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 9. (Optional) Setup SSL dengan Let's Encrypt

**Hanya jika sudah punya domain.**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Ikuti instruksi, pilih "Redirect" untuk auto-redirect HTTP ke HTTPS
```

Certbot akan otomatis:
- Generate SSL certificate
- Update Nginx config
- Setup auto-renewal

---

## 10. Test & Verify

### Test website

Buka browser:
- **Dengan domain:** `http://yourdomain.com` (atau `https://` jika SSL aktif)
- **Tanpa domain:** `http://your-vps-ip`

### Check app status

```bash
pm2 status
pm2 logs silent-reading-club --lines 50
```

### Check Nginx

```bash
sudo systemctl status nginx
sudo nginx -t
```

---

## 11. Deploy Updates (Git Pull)

Untuk update code di masa depan:

```bash
cd ~/silent-reading-club
git pull origin main
npm install  # jika ada dependency baru
npm run build
pm2 restart silent-reading-club
```

---

## Troubleshooting

### App tidak jalan

```bash
# Cek logs PM2
pm2 logs silent-reading-club

# Restart app
pm2 restart silent-reading-club

# Jika masih error, rebuild
cd ~/silent-reading-club
npm run build
pm2 restart silent-reading-club
```

### Nginx error

```bash
# Cek error logs
sudo tail -f /var/log/nginx/error.log

# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

### Port 3000 conflict

```bash
# Cek apa yang pakai port 3000
sudo lsof -i :3000

# Kill proses jika perlu
sudo kill -9 <PID>
```

### Environment variables tidak terbaca

```bash
# Pastikan .env ada
cat ~/silent-reading-club/.env

# Rebuild & restart
cd ~/silent-reading-club
npm run build
pm2 restart silent-reading-club
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Memory usage
pm2 status
```

### Logs

```bash
# App logs
pm2 logs silent-reading-club --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Auto-updates (optional)

Setup cron job untuk auto git pull:

```bash
crontab -e
```

Tambahkan (deploy setiap jam 2 pagi):

```
0 2 * * * cd ~/silent-reading-club && git pull origin main && npm install && npm run build && pm2 restart silent-reading-club
```

---

## Summary Checklist

- [ ] VPS setup & user created
- [ ] Node.js installed via NVM
- [ ] Repository cloned
- [ ] `.env` configured with production values
- [ ] Dependencies installed
- [ ] App built successfully
- [ ] PM2 running app
- [ ] Nginx configured as reverse proxy
- [ ] Firewall (UFW) enabled
- [ ] SSL certificate installed (if using domain)
- [ ] Website accessible from browser
- [ ] PM2 auto-start on boot enabled

---

## Quick Commands Reference

```bash
# App management
pm2 status
pm2 restart silent-reading-club
pm2 logs silent-reading-club

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t

# Updates
cd ~/silent-reading-club && git pull && npm install && npm run build && pm2 restart silent-reading-club

# Logs
pm2 logs --lines 100
sudo tail -f /var/log/nginx/error.log
```

---

**Your app is now live! 🚀**

URL: `http://yourdomain.com` or `http://your-vps-ip`
