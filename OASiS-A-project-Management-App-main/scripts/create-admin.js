const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  // Create a new Prisma client instance
  const prisma = new PrismaClient();
  
  try {
    console.log('Creating admin user...');
    
    // Admin credentials
    const admin = {
      username: 'admin',
      password: 'Admin@123',
      email: 'admin@example.com',
      isAdmin: true,
      fullName: 'Admin User',
    };
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    
    // Create or update the admin user in the database
    const result = await prisma.user.upsert({
      where: { 
        email: admin.email 
      },
      update: {
        username: admin.username,
        passwordHash: hashedPassword,
        isAdmin: true,
        fullName: admin.fullName,
        isActive: true,
        department: 'Management',
        position: 'Administrator'
      },
      create: {
        email: admin.email,
        username: admin.username,
        passwordHash: hashedPassword,
        isAdmin: true,
        fullName: admin.fullName,
        isActive: true,
        department: 'Management',
        position: 'Administrator'
      },
    });
    
    console.log('Admin user created successfully:');
    console.log({
      id: result.id,
      username: result.username,
      email: result.email,
      isAdmin: result.isAdmin,
    });
    
    console.log('\nAdmin credentials:');
    console.log('Username: admin');
    console.log('Password: Admin@123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}

// Run the main function
main(); 