#!/bin/bash

# EC2 Setup Script for OASiS - Project Management App
# Optimized for t3.medium instance

# Update system packages
echo "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
echo "Installing build dependencies..."
sudo apt-get install -y build-essential

# Install PM2 for process management
echo "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/oasis << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain or IP

    # Gzip compression for better performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static assets caching
    location /_next/static {
        alias /path/to/your/app/.next/static;
        expires 365d;
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/oasis /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup app directory (modify as needed)
echo "Setting up application directory..."
mkdir -p /home/ubuntu/oasis
cd /home/ubuntu/oasis

echo "Deployment script completed!"
echo "Next steps:"
echo "1. Copy your application to this server"
echo "2. Run 'npm install --production' in the app directory"
echo "3. Build the app with 'npm run build'"
echo "4. Start the app with PM2: 'pm2 start npm --name \"oasis\" -- start'"
echo "5. Setup PM2 startup: 'pm2 startup' and follow instructions"
echo "6. Save PM2 process list: 'pm2 save'"
echo "---"
echo "For monitoring, use: 'pm2 monit' or 'pm2 logs'" 