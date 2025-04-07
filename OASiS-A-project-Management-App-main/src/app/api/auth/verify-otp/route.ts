import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendCredentialsEmail } from '@/lib/email';
import bcrypt from 'bcrypt';

// Define the User interface directly
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName?: string | null;
  position?: string | null;
  department?: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date | null;
}

// Extended user type with reset token fields
type UserWithResetToken = User & {
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
};

// Validation schema
const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

// Function to generate a random temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tempPassword;
}

// POST /api/auth/verify-otp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = verifyOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    const { email, otp } = result.data;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    }) as UserWithResetToken | null;
    
    // Check if user exists and has valid OTP
    if (!user || !user.resetToken || user.resetToken !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 400 }
      );
    }
    
    // Check if OTP is expired
    if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
      return NextResponse.json(
        { error: 'OTP code has expired' },
        { status: 400 }
      );
    }
    
    // OTP is valid
    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    // Update user password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any, // Type assertion for fields not in the base schema
    });
    
    // Send credentials email with username and temporary password
    try {
      const emailSent = await sendCredentialsEmail(
        email,
        user.username || 'User',
        temporaryPassword
      );
      
      if (!emailSent) {
        console.error('Failed to send credentials email to:', email);
        // We've already updated the password, so we return success
        // but log the error for admin awareness
      }
    } catch (emailError) {
      console.error('Error sending credentials email:', emailError);
      // We've already updated the password, so we return success
      // but log the error for admin awareness
    }
    
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully. Account credentials have been sent to your email.',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 