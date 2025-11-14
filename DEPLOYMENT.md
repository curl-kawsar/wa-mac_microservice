# 🚀 VPS Deployment Guide

Complete guide to deploy your Next.js + MongoDB + BullMQ + Docker stack to a Virtual Private Server.

## 📋 **VPS Requirements**

### **Minimum Specifications:**
- **RAM**: 2GB (4GB+ recommended)
- **CPU**: 2 cores
- **Storage**: 20GB SSD (50GB+ recommended)
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Network**: Public IP address

### **Recommended VPS Providers:**
- **DigitalOcean** (Droplets)
- **Vultr** (Cloud Compute)
- **Linode** (Nanode/Shared CPU)
- **AWS EC2** (t3.small+)
- **Hetzner** (CPX21+)

## 🔧 **1. Initial VPS Setup**

### **Connect to your VPS:**
```bash
ssh root@your-vps-ip
# or
ssh ubuntu@your-vps-ip
```

### **Update the system:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### **Create a non-root user (recommended):**
```bash
# Create user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Set password
sudo passwd deploy

# Add to sudoers
echo "deploy ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/deploy

# Switch to deploy user
su - deploy
```

## 🐳 **2. Install Docker & Docker Compose**

### **Install Docker:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Test Docker
docker --version
```

### **Install Docker Compose:**
```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Test installation
docker-compose --version
```

## 📂 **3. Deploy Your Application**

### **Upload your project:**

**Option A: Git Clone (Recommended)**
```bash
# Install Git
sudo apt install git -y

# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Or clone from your development machine
# First, push your code to GitHub/GitLab
```

**Option B: Direct Upload**
```bash
# From your local machine
scp -r my-app/ deploy@your-vps-ip:~/

# Then SSH to VPS
ssh deploy@your-vps-ip
cd my-app
```

## 🌐 **4. Production Configuration**

### **Create production environment file:**
```bash
cd ~/my-app

# Create production .env.local
cat > .env.local << EOF
# Production MongoDB (replace with your values)
MONGODB_URI=mongodb://admin:YOUR_SECURE_PASSWORD@mongo:27017/nextjs-app?authSource=admin

# Production Redis
REDIS_URL=redis://redis:6379

# Production settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
```

### **Update docker-compose for production:**
```bash
# Create production docker-compose.prod.yml
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  nextjs-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:\${MONGO_PASSWORD}@mongo:27017/nextjs-app?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    networks:
      - app-network

  mongo:
    image: mongo:7.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"  # Only bind to localhost
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: nextjs-app
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"  # Only bind to localhost
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - app-network

  # Optional: MongoDB Express (remove in production for security)
  # mongo-express:
  #   image: mongo-express:latest
  #   restart: unless-stopped
  #   ports:
  #     - "127.0.0.1:8081:8081"
  #   environment:
  #     ME_CONFIG_MONGODB_ADMINUSERNAME: admin
  #     ME_CONFIG_MONGODB_ADMINPASSWORD: \${MONGO_PASSWORD}
  #     ME_CONFIG_MONGODB_URL: mongodb://admin:\${MONGO_PASSWORD}@mongo:27017/
  #     ME_CONFIG_BASICAUTH: true
  #     ME_CONFIG_BASICAUTH_USERNAME: admin
  #     ME_CONFIG_BASICAUTH_PASSWORD: \${ADMIN_PASSWORD}
  #   depends_on:
  #     - mongo
  #   networks:
  #     - app-network

volumes:
  mongo-data:
  redis-data:

networks:
  app-network:
    driver: bridge
EOF
```

### **Create environment variables file:**
```bash
# Create .env file for docker-compose
cat > .env << EOF
MONGO_PASSWORD=your-super-secure-mongo-password-here
REDIS_PASSWORD=your-super-secure-redis-password-here
ADMIN_PASSWORD=your-admin-interface-password-here
EOF

# Secure the file
chmod 600 .env
```

## 🚀 **5. Deploy the Application**

### **Build and start services:**
```bash
# Build and start in production mode
docker-compose -f docker-compose.prod.yml up --build -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f nextjs-app
```

### **Test the deployment:**
```bash
# Test locally on VPS
curl http://localhost:3000

# Check if it's working
curl http://localhost:3000/api/users
```

## 🔒 **6. Security & Firewall Setup**

### **Configure UFW Firewall:**
```bash
# Install and enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow your app (if not using reverse proxy)
sudo ufw allow 3000

# Check status
sudo ufw status
```

### **Secure SSH (Optional but recommended):**
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Add these lines:
# PermitRootLogin no
# PasswordAuthentication no  # Only if you have SSH keys
# Port 2222  # Change default port

# Restart SSH
sudo systemctl restart sshd
```

## 🌍 **7. Domain & SSL Setup with Nginx**

### **Install Nginx:**
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### **Configure Nginx reverse proxy:**
```bash
sudo nano /etc/nginx/sites-available/your-domain.com

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### **Enable the site:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### **Install SSL with Let's Encrypt:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔄 **8. Process Management with PM2 (Alternative)**

If you prefer not to use Docker in production:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Start your app with PM2
pm2 start npm --name "nextjs-app" -- start
pm2 startup
pm2 save
```

## 📊 **9. Monitoring & Maintenance**

### **Monitor Docker containers:**
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f nextjs-app

# Restart services
docker-compose -f docker-compose.prod.yml restart nextjs-app
```

### **Set up log rotation:**
```bash
# Create log rotation config
sudo nano /etc/logrotate.d/docker-compose

# Add:
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    size 10M
    missingok
    delaycompress
    copytruncate
}
```

### **Backup strategy:**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec my-app-mongo-1 mongodump --username admin --password "$MONGO_PASSWORD" --authenticationDatabase admin --out /tmp/backup

# Copy backup from container
docker cp my-app-mongo-1:/tmp/backup $BACKUP_DIR/mongo_$DATE

# Backup Redis (if needed)
docker exec my-app-redis-1 redis-cli --rdb /tmp/dump.rdb
docker cp my-app-redis-1:/tmp/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Compress backups
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/mongo_$DATE $BACKUP_DIR/redis_$DATE.rdb

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
EOF

chmod +x backup.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/deploy/my-app/backup.sh") | crontab -
```

## 🔄 **10. CI/CD with GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: \${{ secrets.VPS_HOST }}
        username: \${{ secrets.VPS_USERNAME }}
        key: \${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /home/deploy/my-app
          git pull origin main
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml up --build -d
```

## 📋 **Production Checklist**

- [ ] ✅ VPS with adequate resources
- [ ] ✅ Docker & Docker Compose installed
- [ ] ✅ Firewall configured
- [ ] ✅ Domain pointed to VPS IP
- [ ] ✅ SSL certificate installed
- [ ] ✅ Environment variables secured
- [ ] ✅ Database passwords changed
- [ ] ✅ Nginx reverse proxy configured
- [ ] ✅ Backup strategy implemented
- [ ] ✅ Monitoring set up
- [ ] ✅ Log rotation configured

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Port binding errors:**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3000
   sudo lsof -i :3000
   ```

2. **Permission issues:**
   ```bash
   # Fix Docker permissions
   sudo chown -R $USER:$USER ~/my-app
   ```

3. **Memory issues:**
   ```bash
   # Check memory usage
   free -h
   docker stats
   ```

4. **Database connection issues:**
   ```bash
   # Check container logs
   docker-compose -f docker-compose.prod.yml logs mongo
   ```

## 🎯 **Performance Optimization**

1. **Enable Docker BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Optimize Nginx:**
   ```bash
   # Add to Nginx config
   gzip on;
   gzip_vary on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

3. **Set up Redis persistence:**
   - Already configured in docker-compose.prod.yml

---

Your Next.js + MongoDB + BullMQ stack is now production-ready on your VPS! 🚀

For support, monitor your logs and set up alerts for critical services.
