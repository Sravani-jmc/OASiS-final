# OASiS Project Management App Deployment Guide

This guide outlines steps to deploy the OASiS application on an AWS EC2 t3.medium instance.

## EC2 t3.medium Specifications
- 2 vCPUs
- 4GB Memory
- Moderate network performance
- Burstable CPU performance

## Prerequisites
- AWS account with EC2 access
- Domain name (optional but recommended)
- Basic familiarity with Linux commands

## Deployment Steps

### 1. Launch EC2 Instance
1. Launch a t3.medium instance with Ubuntu Server 22.04 LTS
2. Configure security groups to allow:
   - HTTP (80)
   - HTTPS (443)
   - SSH (22)
   - Custom TCP (3000) - optional for development

### 2. Connect to Your Instance
```
ssh -i your-key.pem ubuntu@your-instance-ip
```

### 3. Initial Server Setup
Run the setup script provided in this repository:
```
# Clone the repository
git clone https://github.com/your-repo/oasis-project-management.git
cd oasis-project-management

# Make the setup script executable
chmod +x deployment/ec2-setup.sh

# Run the setup script
./deployment/ec2-setup.sh
```

### 4. Configure Environment Variables
Create a `.env.local` file in the project root:
```
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/oasis"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Other app configurations
# Add any other environment variables your app needs
```

### 5. Build and Start the Application
```
# Install dependencies
npm install --production

# Build the application
npm run build

# Start the application with PM2
pm2 start ecosystem.config.js

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

### 6. Verify Deployment
- Visit your domain or EC2 IP address to confirm the application is running
- Check logs if there are issues: `pm2 logs oasis`

## Performance Optimization

### Database Optimization
- Configure PostgreSQL with proper settings for t3.medium:
  ```
  max_connections = 100
  shared_buffers = 1GB
  effective_cache_size = 3GB
  maintenance_work_mem = 256MB
  checkpoint_completion_target = 0.9
  wal_buffers = 16MB
  default_statistics_target = 100
  random_page_cost = 1.1
  effective_io_concurrency = 200
  work_mem = 10485kB
  min_wal_size = 1GB
  max_wal_size = 4GB
  ```

### Nginx Caching
- Enable caching for static assets in Nginx:
  ```
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
  }
  ```

## Monitoring and Maintenance

### Regular Maintenance
- Update system packages: `sudo apt update && sudo apt upgrade`
- Backup database: Setup regular pg_dump cronjobs
- Monitor disk space: `df -h`

### Performance Monitoring
- Use PM2 monitoring: `pm2 monit`
- Setup CloudWatch for instance metrics

### Scaling Considerations
- If traffic grows, consider:
  1. Separating the database to RDS
  2. Implementing Redis caching
  3. Upgrading to t3.large or different instance family

## Troubleshooting

### Common Issues
- **503 Service Unavailable**: Check Nginx and Next.js server status
- **Slow Performance**: Monitor CPU credits and memory usage
- **Database Connection Issues**: Verify PostgreSQL is running and credentials are correct

For additional help, consult the application documentation or reach out to the development team. 