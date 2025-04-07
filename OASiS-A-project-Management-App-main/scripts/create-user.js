const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.upsert({
      where: { username: 'testuser' },
      update: {},
      create: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        isAdmin: true,
        isActive: true,
        fullName: 'Test User'
      }
    });
    
    console.log('User created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
