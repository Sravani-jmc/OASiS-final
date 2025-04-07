# OASiS AWS Deployment Guide

This guide provides detailed instructions for deploying the OASiS Project Management System on AWS infrastructure, with a focus on production readiness, high availability, and automated database backups.

## AWS Architecture Overview

![AWS Architecture](https://example.com/aws-architecture.png)

The recommended AWS architecture includes:

- **Amazon RDS**: PostgreSQL database with Multi-AZ deployment
- **Amazon EC2**: Virtual server for application deployment
- **Amazon S3**: Static asset storage
- **Amazon CloudFront**: Content delivery network (CDN)
- **AWS Route 53**: DNS management
- **AWS Certificate Manager**: SSL certificate management
- **Amazon ElastiCache**: Optional Redis caching
- **AWS Backup**: Automated database backup management

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Git installed locally
- A registered domain name (for production deployment)

## Step-by-Step Deployment Guide

### 1. Database Setup with Amazon RDS

```bash
# Create a PostgreSQL database instance with AWS CLI
aws rds create-db-instance \
  --db-instance-identifier oasis-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --allocated-storage 20 \
  --master-username adminuser \
  --master-user-password <secure-password> \
  --vpc-security-groups <security-group-id> \
  --backup-retention-period 7 \
  --preferred-backup-window "02:00-03:00" \
  --multi-az
```

Key configuration parameters:
- `--backup-retention-period 7`: Keeps daily automated backups for 7 days
- `--preferred-backup-window`: Sets the daily backup window (adjust according to your timezone)
- `--multi-az`: Enables Multi-AZ deployment for high availability

### 2. Database Migration and Setup

Once your RDS instance is available, run the database migrations:

```bash
# Set DATABASE_URL environment variable with your RDS endpoint
export DATABASE_URL="postgresql://adminuser:<secure-password>@<rds-endpoint>:5432/oasis_db"

# Apply migrations to production database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. EC2 Instance Setup and Deployment

#### Launch EC2 Instance

```bash
# Launch EC2 instance via AWS CLI
aws ec2 run-instances \
  --image-id ami-xxxxxxxxx \  # Amazon Linux 2 or Ubuntu AMI
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=oasis-server}]'
```

#### Configure Security Group

Ensure your security group allows:
- SSH (port 22) from your IP
- HTTP (80) and HTTPS (443) from anywhere
- PostgreSQL (5432) from the EC2 instance only

#### Install Dependencies on EC2

SSH into your instance and run:

```bash
# Update system
sudo yum update -y  # For Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # For Ubuntu

# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

#### Deploy Application to EC2

```bash
# Clone the repository
git clone https://github.com/Omi1209jmc/OASiS-A-project-Management-App.git
cd OASiS-A-project-Management-App

# Install dependencies
npm install

# Set environment variables
cat > .env << EOL
# Database connection
DATABASE_URL=postgresql://adminuser:password@your-rds-endpoint:5432/oasis_db

# Application configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Node environment
NODE_ENV=production
EOL

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "oasis" -- start
pm2 startup
pm2 save
```

#### Configure Nginx as Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/oasis

# Add the following configuration
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/oasis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Set Up SSL with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Set Up Auto-Deployment (Optional)

```bash
# Create deployment script
cat > /home/ec2-user/deploy.sh << 'EOL'
#!/bin/bash
cd /home/ec2-user/OASiS-A-project-Management-App
git pull
npm install
npm run build
pm2 restart oasis
EOL

chmod +x /home/ec2-user/deploy.sh

# Set up a cron job to check for updates
echo "*/10 * * * * /home/ec2-user/deploy.sh >> /home/ec2-user/deploy.log 2>&1" | crontab -
```

### 4. S3 and CloudFront Setup for Static Assets

```bash
# Create S3 bucket for static assets
aws s3 mb s3://oasis-static-assets

# Enable static website hosting
aws s3 website s3://oasis-static-assets --index-document index.html

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name oasis-static-assets.s3.amazonaws.com \
  --default-root-object index.html
```

### 5. DNS and SSL Certificate Setup

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name oasis.example.com \
  --validation-method DNS \
  --subject-alternative-names www.oasis.example.com

# Create Route 53 record set for your domain
aws route53 change-resource-record-sets \
  --hosted-zone-id <hosted-zone-id> \
  --change-batch file://dns-records.json
```

## Database Backup Strategy

The OASiS application relies on a PostgreSQL database, which requires a comprehensive backup strategy for production deployments.

### 1. Automated RDS Backups

Amazon RDS provides automated daily backups. These are configured during the RDS instance creation with:
- `--backup-retention-period 7`: Keeps backups for 7 days
- `--preferred-backup-window "02:00-03:00"`: Sets daily backup window

### 2. Manual Database Snapshots

Take regular manual snapshots before major updates or changes:

```bash
# Create manual RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier oasis-db \
  --db-snapshot-identifier oasis-db-snapshot-$(date +%Y-%m-%d)
```

### 3. Automated Snapshot Exports to S3

Set up an AWS Lambda function to export RDS snapshots to S3 for long-term retention:

```bash
# Create S3 bucket for DB exports
aws s3 mb s3://oasis-db-backups

# Set lifecycle policy for backups
aws s3api put-bucket-lifecycle-configuration \
  --bucket oasis-db-backups \
  --lifecycle-configuration file://lifecycle-config.json
```

Example lifecycle policy to transition backups to cheaper storage after 30 days:
```json
{
  "Rules": [
    {
      "ID": "Move to Glacier after 30 days",
      "Status": "Enabled",
      "Prefix": "backup/",
      "Transition": {
        "Days": 30,
        "StorageClass": "GLACIER"
      }
    }
  ]
}
```

### 4. AWS Backup Integration

For enterprise deployments, use AWS Backup service for centralized backup management:

```bash
# Create backup plan
aws backup create-backup-plan --cli-input-json file://backup-plan.json

# Assign resources to backup plan
aws backup create-backup-selection --backup-plan-id <backup-plan-id> --cli-input-json file://backup-selection.json
```

### 5. Database Replication

For zero data loss scenarios, consider setting up a read replica:

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier oasis-db-replica \
  --source-db-instance-identifier oasis-db
```

## Environment Variables for AWS Deployment

Create a production environment file with these variables:

```
# Database connection
DATABASE_URL=postgresql://<username>:<password>@<rds-endpoint>:5432/oasis_db

# Application configuration
NEXTAUTH_URL=https://oasis.example.com
NEXTAUTH_SECRET=<generated-secret>

# Email configuration
EMAIL_SERVER=smtp://<username>:<password>@<smtp-server>:587
EMAIL_FROM=noreply@oasis.example.com

# AWS specific
NEXT_PUBLIC_S3_BUCKET=oasis-static-assets
AWS_REGION=<your-region>
```

## Monitoring and Maintenance

### CloudWatch Alarms

Set up CloudWatch alarms for key metrics:

```bash
# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name oasis-db-high-cpu \
  --alarm-description "High CPU utilization for RDS instance" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=oasis-db \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

### EC2 Monitoring

```bash
# Install CloudWatch agent on EC2
sudo yum install -y amazon-cloudwatch-agent  # For Amazon Linux
# OR
sudo apt install -y amazon-cloudwatch-agent  # For Ubuntu

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start CloudWatch agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

### Database Maintenance

Schedule regular maintenance:

```bash
# Enable automatic minor version upgrades
aws rds modify-db-instance \
  --db-instance-identifier oasis-db \
  --auto-minor-version-upgrade \
  --apply-immediately
```

## Security Best Practices

1. **VPC Configuration**: Deploy all resources within a custom VPC with proper subnet configuration
2. **Security Groups**: Restrict access to necessary ports only
3. **IAM Roles**: Use least privilege principle for all service roles
4. **EC2 Updates**: Set up automatic security updates for the EC2 instance
5. **RDS Encryption**: Enable at-rest encryption for the database
6. **S3 Bucket Policies**: Restrict access to S3 buckets with appropriate policies
7. **WAF Integration**: Consider adding AWS WAF for additional web application security

## Scaling Strategies

As your user base grows, consider these scaling options:

1. **EC2 Scaling**: Use a larger instance type or set up an Auto Scaling group with a load balancer
2. **RDS Scaling**: Increase instance size or add read replicas for database scaling
3. **ElastiCache**: Add Redis caching for session storage and API response caching

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check security group rules allow traffic from EC2 to RDS
   - Verify credentials in environment variables

2. **Application Performance**:
   - Monitor EC2 and RDS metrics in CloudWatch
   - Check PM2 logs for application issues

3. **SSL Certificate Issues**:
   - Verify Certbot renewal is properly configured
   - Check Route 53 DNS records

## Cost Optimization

1. **Reserved Instances**: Purchase EC2 and RDS Reserved Instances for long-term cost savings
2. **EC2 Rightsizing**: Monitor utilization and adjust instance type as needed
3. **S3 Lifecycle Policies**: Implement lifecycle policies for backups and logs
4. **CloudFront Caching**: Optimize caching parameters to reduce origin requests

## Disaster Recovery

For critical deployments, implement a cross-region disaster recovery strategy:

1. Create cross-region read replicas for your database
2. Set up S3 cross-region replication for static assets
3. Implement Route 53 health checks with failover routing

---

By following this guide, you'll have a production-ready OASiS deployment on AWS with comprehensive database backup strategies to ensure data durability and business continuity. 
