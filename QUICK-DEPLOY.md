# ⚡ Quick VPS Deployment

**Deploy your Next.js + MongoDB + BullMQ stack to a VPS in 5 minutes!**

## 🚀 **Super Quick Method**

### **1. Run the deployment script:**
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy (replace with your VPS IP and domain)
./scripts/deploy.sh YOUR_VPS_IP YOUR_DOMAIN.COM

# Example:
./scripts/deploy.sh 142.93.123.45 myapp.com
```

### **2. Upload to VPS:**
```bash
# The script creates deploy-package.tar.gz
scp deploy-package.tar.gz deploy@YOUR_VPS_IP:~/
```

### **3. SSH to VPS and deploy:**
```bash
ssh deploy@YOUR_VPS_IP

# Extract and deploy
tar -xzf deploy-package.tar.gz
cd my-app
DOMAIN=YOUR_DOMAIN.COM ./scripts/deploy-to-vps.sh
```

### **4. Setup SSL (Optional):**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d YOUR_DOMAIN.COM
```

**✅ Done! Your app is live at `https://YOUR_DOMAIN.COM`**

---

## 🔧 **Manual Method** 

If you prefer step-by-step control:

### **VPS Requirements:**
- **2GB RAM**, **2 CPU cores**, **20GB SSD**
- **Ubuntu 20.04+** or similar
- **Public IP** address

### **1. Prepare VPS:**
```bash
# SSH to VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### **2. Upload your app:**
```bash
# From your local machine
scp -r my-app/ root@YOUR_VPS_IP:~/
```

### **3. Configure for production:**
```bash
# SSH to VPS
ssh root@YOUR_VPS_IP
cd my-app

# Create production environment
cat > .env.local << EOF
MONGODB_URI=mongodb://admin:SECURE_PASSWORD@mongo:27017/nextjs-app?authSource=admin
REDIS_URL=redis://redis:6379
NODE_ENV=production
EOF

# Update docker-compose ports for security
sed -i 's/27017:27017/127.0.0.1:27017:27017/' docker-compose.yml
sed -i 's/6379:6379/127.0.0.1:6379:6379/' docker-compose.yml
```

### **4. Deploy:**
```bash
# Start services
docker-compose up --build -d

# Test application
curl http://localhost:3000

# Check health status
curl http://localhost:3000/api/health
```

### **5. Setup domain & SSL:**
```bash
# Install Nginx
apt install nginx -y

# Configure reverse proxy
cat > /etc/nginx/sites-available/your-domain.com << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
systemctl reload nginx

# Install SSL
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

---

## 🔍 **Recommended VPS Providers**

| Provider | Plan | Specs | Price/Month | Notes |
|----------|------|-------|-------------|-------|
| **DigitalOcean** | Basic Droplet | 2GB RAM, 2 CPU, 50GB SSD | $12 | Great docs, reliable |
| **Vultr** | Regular Performance | 2GB RAM, 1 CPU, 55GB SSD | $10 | Fast deployment |
| **Linode** | Nanode 2GB | 2GB RAM, 1 CPU, 50GB SSD | $10 | Excellent support |
| **Hetzner** | CPX21 | 4GB RAM, 3 CPU, 80GB SSD | $7 | Best value |

## 📊 **Post-Deployment**

### **Monitor your app:**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f nextjs-app

# Restart if needed
docker-compose restart nextjs-app
```

### **Backup your data:**
```bash
# Manual backup
./scripts/backup.sh

# Setup auto-backup (already configured by deploy script)
crontab -l  # Check if backup cron job exists
```

### **Update your app:**
```bash
# Pull new code
git pull origin main

# Rebuild and restart
docker-compose up --build -d
```

---

## 🆘 **Troubleshooting**

### **App not accessible:**
```bash
# Check if containers are running
docker-compose ps

# Check logs for errors
docker-compose logs nextjs-app

# Check if ports are open
netstat -tulpn | grep :3000
```

### **Database connection issues:**
```bash
# Check MongoDB logs
docker-compose logs mongo

# Test connection
docker exec -it my-app-mongo-1 mongosh
```

### **SSL issues:**
```bash
# Check Nginx config
nginx -t

# Check certificate status
certbot certificates

# Renew certificate
certbot renew
```

### **Performance issues:**
```bash
# Check resource usage
htop
docker stats

# Check disk space
df -h
```

---

## 🎯 **Quick Commands Reference**

```bash
# Deploy from scratch
./scripts/deploy.sh VPS_IP DOMAIN

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs  
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Backup data
./scripts/backup.sh

# Update SSL
sudo certbot renew

# Monitor resources
docker stats
htop
```

**🚀 Your Next.js + MongoDB + BullMQ stack is now production-ready on your VPS!**

For detailed instructions, see `DEPLOYMENT.md`
