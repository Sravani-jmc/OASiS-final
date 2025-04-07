import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendOtpEmail } from '@/lib/email';

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
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Function to generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    const { email } = result.data;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    }) as UserWithResetToken | null;
    
    // For security reasons, always return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.',
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    // Update user with OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      } as any, // Type assertion for fields not in the base schema
    });
    
    // Send OTP email
    try {
      const emailSent = await sendOtpEmail(email, otp, user.username || user.email);
      
      if (!emailSent) {
        console.error('Failed to send OTP email to:', email);
        // Continue with success response for security reasons
      }
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Continue with success response for security reasons
    }
    
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Return success response even on error for security
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
    });
  }
} 