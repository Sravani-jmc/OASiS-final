import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { hash } from 'bcryptjs';

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        department: true,
        isAdmin: true,
        lastLogin: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user/member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'メンバーを追加するにはログインが必要です' },
        { status: 401 }
      );
    }
    
    // Validate request body
    const schema = z.object({
      name: z.string().min(1, '名前は必須です'),
      email: z.string().email('有効なメールアドレスを入力してください'),
      phone: z.string().nullable().optional(),
      role: z.enum(['member', 'admin']).default('member'),
    });
    
    const validationResult = schema.safeParse(await request.json());
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '入力データが無効です', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, email, phone, role } = validationResult.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      );
    }
    
    // Generate a temporary username based on email
    const tempUsername = email.split('@')[0] + '_' + crypto.randomBytes(4).toString('hex');
    
    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    // Hash the password
    const hashedPassword = await hash(tempPassword, 10);
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        username: tempUsername,
        email,
        passwordHash: hashedPassword,
        fullName: name,
        isAdmin: role === 'admin',
        isActive: true,
        createdAt: new Date(),
      },
    });
    
    // Create a daily log entry for the user creation
    await prisma.dailyLog.create({
      data: {
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        description: `Added new member: ${name} (${email})`,
        category: 'user',
        completed: true,
        userId: session.user.id,
      },
    });
    
    // In a real app, you would send an email with login instructions
    // For now, we'll just log the temporary credentials
    console.log(`New user created: ${email}, Username: ${tempUsername}, Password: ${tempPassword}`);
    
    return NextResponse.json(
      { 
        message: 'メンバーが正常に追加されました',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'メンバーの追加に失敗しました' },
      { status: 500 }
    );
  }
} 