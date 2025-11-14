#!/bin/bash

# 🚀 Quick VPS Deployment Script for Next.js + MongoDB + BullMQ Stack
# Usage: ./scripts/deploy.sh your-vps-ip your-domain.com

set -e

VPS_IP="$1"
DOMAIN="$2"
VPS_USER="deploy"

if [ -z "$VPS_IP" ] || [ -z "$DOMAIN" ]; then
    echo "❌ Usage: ./scripts/deploy.sh <VPS_IP> <DOMAIN>"
    echo "   Example: ./scripts/deploy.sh 142.93.123.45 myapp.com"
    exit 1
fi

echo "🚀 Starting deployment to $VPS_IP ($DOMAIN)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

MONGO_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
ADMIN_PASSWORD=$(generate_password)

print_status "Generated secure passwords for services"

# Create production docker-compose file
print_status "Creating production docker-compose configuration..."
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
      - REDIS_URL=redis://:\${REDIS_PASSWORD}@redis:6379
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
      - "127.0.0.1:27017:27017"
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
      - "127.0.0.1:6379:6379"
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - app-network

volumes:
  mongo-data:
  redis-data:

networks:
  app-network:
    driver: bridge
EOF

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
MONGO_PASSWORD=$MONGO_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

# Create production environment for Next.js
cat > .env.production << EOF
NODE_ENV=production
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongo:27017/nextjs-app?authSource=admin
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379
NEXT_TELEMETRY_DISABLED=1
EOF

# Create Nginx configuration
print_status "Creating Nginx configuration..."
mkdir -p nginx
cat > nginx/default.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    location / {
        proxy_pass http://nextjs-app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create backup script
print_status "Creating backup script..."
mkdir -p scripts
cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# Backup script for production deployment
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_PREFIX=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')

# Load environment variables
set -a
source .env
set +a

print_status() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

print_status "Starting backup process..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
print_status "Backing up MongoDB..."
docker exec ${CONTAINER_PREFIX}-mongo-1 mongodump \
    --username admin \
    --password "$MONGO_PASSWORD" \
    --authenticationDatabase admin \
    --out /tmp/backup

# Copy backup from container
docker cp ${CONTAINER_PREFIX}-mongo-1:/tmp/backup $BACKUP_DIR/mongo_$DATE

# Backup Redis
print_status "Backing up Redis..."
docker exec ${CONTAINER_PREFIX}-redis-1 redis-cli --rdb /tmp/dump.rdb
docker cp ${CONTAINER_PREFIX}-redis-1:/tmp/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Create application backup
print_status "Creating application backup..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    .

# Compress all backups
print_status "Compressing backups..."
tar -czf $BACKUP_DIR/full_backup_$DATE.tar.gz \
    $BACKUP_DIR/mongo_$DATE \
    $BACKUP_DIR/redis_$DATE.rdb \
    $BACKUP_DIR/app_$DATE.tar.gz

# Clean up temporary files
rm -rf $BACKUP_DIR/mongo_$DATE $BACKUP_DIR/redis_$DATE.rdb $BACKUP_DIR/app_$DATE.tar.gz

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "full_backup_*.tar.gz" -mtime +7 -delete

print_status "Backup completed: full_backup_$DATE.tar.gz"
print_status "Backup size: $(du -h $BACKUP_DIR/full_backup_$DATE.tar.gz | cut -f1)"
EOF

chmod +x scripts/backup.sh

# Create deployment script for VPS
print_status "Creating VPS deployment script..."
cat > scripts/deploy-to-vps.sh << EOF
#!/bin/bash

# This script runs ON the VPS to deploy the application

set -e

print_status() {
    echo "[VPS] \$1"
}

print_status "Installing Docker and Docker Compose if needed..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker \$USER
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt update
    sudo apt install nginx -y
    sudo systemctl enable nginx
fi

# Setup UFW firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

print_status "Building and starting application..."

# Build and start services
docker-compose -f docker-compose.prod.yml down || true
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 30

# Test the application
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
else
    print_status "⚠️  Application might need more time to start. Check logs with:"
    print_status "   docker-compose -f docker-compose.prod.yml logs -f"
fi

# Setup Nginx if domain is provided
if [ ! -z "$DOMAIN" ]; then
    print_status "Configuring Nginx for domain: $DOMAIN"
    
    sudo cp nginx/default.conf /etc/nginx/sites-available/$DOMAIN
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    print_status "Nginx configured. Install SSL certificate with:"
    print_status "   sudo apt install certbot python3-certbot-nginx -y"
    print_status "   sudo certbot --nginx -d $DOMAIN"
fi

# Setup backup cron job
print_status "Setting up daily backups..."
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "0 2 * * * cd \$(pwd) && ./scripts/backup.sh >> /var/log/backup.log 2>&1") | crontab -

print_status "🚀 Deployment completed!"
print_status "📊 View application logs: docker-compose -f docker-compose.prod.yml logs -f"
print_status "📈 Monitor containers: docker-compose -f docker-compose.prod.yml ps"
print_status "🔄 Restart services: docker-compose -f docker-compose.prod.yml restart"

EOF

chmod +x scripts/deploy-to-vps.sh

print_success "Production files created successfully!"

# Create archive for upload
print_status "Creating deployment archive..."
tar -czf deploy-package.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='*.log' \
    .

print_success "Deployment package created: deploy-package.tar.gz"

echo ""
echo "🚀 Ready for VPS deployment!"
echo ""
echo "📋 Next steps:"
echo "1️⃣  Upload to VPS:"
echo "   scp deploy-package.tar.gz $VPS_USER@$VPS_IP:~/"
echo ""
echo "2️⃣  SSH to VPS and extract:"
echo "   ssh $VPS_USER@$VPS_IP"
echo "   tar -xzf deploy-package.tar.gz"
echo "   cd my-app"
echo ""
echo "3️⃣  Run deployment:"
echo "   DOMAIN=$DOMAIN ./scripts/deploy-to-vps.sh"
echo ""
echo "🔐 Generated passwords (save these securely!):"
echo "   MongoDB: $MONGO_PASSWORD"
echo "   Redis: $REDIS_PASSWORD"
echo "   Admin: $ADMIN_PASSWORD"
echo ""
echo "🌐 After deployment, your app will be available at:"
echo "   http://$DOMAIN (or http://$VPS_IP:3000)"
echo ""
print_success "Deployment script completed! 🎉"
EOF

chmod +x scripts/deploy.sh
