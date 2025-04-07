import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { username, email, password, fullName, department, position } = await req.json();

    console.log('Registration attempt:', { username, email, fullName, department, position });

    // Validate input data
    if (!username || !email || !password) {
      console.log('Missing required fields');
      return NextResponse.json(
        { message: 'ユーザー名、メール、パスワードは必須項目です' },
        { status: 400 }
      );
    }

    // Check password length
    if (password.length < 8) {
      console.log('Password too short');
      return NextResponse.json(
        { message: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUserByUsername) {
      console.log('Username already exists');
      return NextResponse.json(
        { message: 'このユーザー名は既に使用されています' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      console.log('Email already exists');
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the user
    try {
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashedPassword,
          fullName: fullName || null,
          department: department || null,
          position: position || null,
          isAdmin: false,
          isActive: true,
          createdAt: new Date(),
        },
      });

      console.log('User created successfully:', user.id);

      // Return success with user data (excluding password)
      return NextResponse.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        position: user.position,
        createdAt: user.createdAt,
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { message: 'ユーザー作成に失敗しました', error: String(createError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'ユーザー登録に失敗しました', error: String(error) },
      { status: 500 }
    );
  }
} 