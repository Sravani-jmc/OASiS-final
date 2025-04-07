# OASiS - Project Management System

A modern project management application with Japanese design aesthetics built with Next.js, React, and TypeScript.

## Features

- **User Authentication**: Secure login and registration system
- **Dashboard**: Overview of projects, tasks, and announcements
- **Project Management**: Create, edit, and track projects
- **Task Management**: Assign and monitor tasks with priorities and deadlines
- **Team Collaboration**: 
  - Member management and assignment
  - Member profile editing
  - Team invitations
  - Role-based access control
- **Bulletin Board**: Team-wide announcements and discussions
- **Daily Log**: Activity tracking and reporting
- **Reports**: Data visualization and project analytics
- **Daily Reports**: Track daily progress and receive feedback

## Technology Stack

- **Frontend**: React, Next.js, TypeScript
- **Styling**: Tailwind CSS with Japanese-inspired design elements
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM (SQLite for development)
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Custom components with Headless UI
- **Deployment**: Optimized for AWS

## Detailed Installation Guide

### Prerequisites

1. **Node.js Installation**
   - Download and install Node.js version 16.x or later from https://nodejs.org/
   - Verify installation by running:
     ```bash
     node --version
     npm --version
     ```

2. **PostgreSQL Setup (for production)**
   - Download and install PostgreSQL from https://www.postgresql.org/download/
   - During installation, set a password for the default 'postgres' user
   - Create a new database named 'oasis_db':
     ```bash
     psql -U postgres
     CREATE DATABASE oasis_db;
     \q
     ```

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd OASiS-A-project-Management-App
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Edit `.env` with your specific configuration:
   ```
   # Database connection
    DATABASE_URL="file:./dev.db"
    # NextAuth configuration
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET="your_secret_key"
    # Application settings
    NODE_ENV="development"
   ```

4. **Database Setup**
   - For development with SQLite (default):
     ```bash
     npm i --save-dev prisma@latest
     npm i @prisma/client@latest
     ```
     ```bash
     npx prisma generate
     npx prisma db push
     ```
   
   - For production with PostgreSQL:
     - First update the provider in `prisma/schema.prisma`:
       ```
       datasource db {
         provider = "postgresql"
         url      = env("DATABASE_URL")
       }
       ```
     - Then run migrations:
       ```bash
       npx prisma migrate dev --name init
       ```


5. **Create Your First Account**
   - Visit http://localhost:3000/register to create a user account
   - For admin access, you can update the database directly:
     ```bash
     cd scripts
     node create-admin.js
     ```
     (or)
     
     ```bash
     # For SQLite
     sqlite3 prisma/dev.db
     UPDATE users SET "isAdmin" = true WHERE email = 'your-email@example.com';
     .exit
     
     # For PostgreSQL
     psql -U postgres -d oasis_db
     UPDATE users SET "isAdmin" = true WHERE email = 'your-email@example.com';
     \q
     ```

6. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:3000

## Usage Guide

### Dashboard
The dashboard provides an overview of:
- Your assigned tasks
- Recent team activities
- Project progress
- Upcoming deadlines

### Project Management
- Create new projects with details like name, description, timeline and members
- Track project progress and status
- Assign team members to specific projects

### Task Management
- Create and assign tasks to team members
- Set priorities, deadlines, and track progress
- Add comments and updates to tasks

### Daily Reports
- Submit daily progress reports for your projects
- Track completed tasks, in-progress work, issues, and plans for tomorrow
- Receive feedback from administrators on your reports

### Team Communication
- Use the bulletin board for team-wide announcements
- Track team member activities through the daily log
- Manage team invitations and memberships

## Troubleshooting

### Database Connection Issues
- Verify your database is running
- Check credentials in your `.env` file
- For PostgreSQL, ensure port 5432 is accessible

### Prisma Migration Errors
- If migrations fail, try: `npx prisma migrate reset` (warning: this deletes all data)
- Check the Prisma logs for detailed error messages

### NextAuth Configuration Problems
- Ensure NEXTAUTH_URL matches your actual deployment URL
- Verify that NEXTAUTH_SECRET is properly set

## Production Deployment

For production deployment on AWS, follow these steps:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start in production mode**:
   ```bash
   npm run start
   ```

3. **Use a process manager like PM2**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "oasis" -- start
   ```

Refer to the AWS deployment section for details on setting up:
- Amazon RDS for PostgreSQL
- Amazon ECS/Fargate for containerized deployment
- Amazon S3 for static assets
- AWS Route 53 for DNS management

## License

ISC
