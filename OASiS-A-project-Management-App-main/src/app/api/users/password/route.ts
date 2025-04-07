import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compare, hash } from 'bcryptjs';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: '現在のパスワードと新しいパスワードは必須です' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: '新しいパスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // Get user with current password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await compare(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: '現在のパスワードが正しくありません' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return NextResponse.json({
      message: 'パスワードが更新されました',
    });
  } catch (error) {
    console.error('Failed to update password:', error);
    return NextResponse.json(
      { message: 'パスワード更新に失敗しました' },
      { status: 500 }
    );
  }
} 