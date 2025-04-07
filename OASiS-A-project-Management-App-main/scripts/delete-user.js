const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  try {
    // First check if the user exists
    const user = await prisma.user.findUnique({
      where: { email: 'omprakashbdj1209@gmail.com' }
    });

    if (!user) {
      console.log('User with email omprakashbdj1209@gmail.com not found');
      return;
    }

    console.log('Found user:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    
    // Remove any related data (considering foreign key constraints)
    // 1. First remove any user-related data like tokens, etc.
    console.log('Deleting user data...');
    
    // Delete user OTP tokens if they exist
    if (user.resetToken) {
      console.log('Cleaning up reset tokens...');
    }
    
    // 2. Then delete the user
    console.log('Deleting user...');
    await prisma.user.delete({
      where: { email: 'omprakashbdj1209@gmail.com' }
    });
    
    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
deleteUser(); 