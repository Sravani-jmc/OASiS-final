import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        position: true,
        isAdmin: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json(
      { message: 'プロフィール情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }

    const { fullName, email, department, position } = await req.json();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { message: 'メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { message: 'このメールアドレスは既に使用されています' },
          { status: 400 }
        );
      }
    }

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: fullName || null,
        email,
        department: department || null,
        position: position || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        position: true,
        isAdmin: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json(
      { message: 'プロフィール情報の更新に失敗しました' },
      { status: 500 }
    );
  }
} 