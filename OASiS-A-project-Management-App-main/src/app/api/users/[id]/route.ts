import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
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
        memberProjects: {
          select: {
            id: true,
            name: true,
          },
        },
        managedProjects: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Transform the projects data to a simpler format for the frontend
    const projects = [
      ...user.memberProjects.map(project => ({ id: project.id, name: project.name })),
      ...user.managedProjects.map(project => ({ id: project.id, name: project.name }))
    ];
    // Remove duplicates
    const uniqueProjects = Array.from(
      new Map(projects.map(item => [item.id, item])).values()
    );

    const transformedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      position: user.position,
      department: user.department,
      isAdmin: user.isAdmin,
      lastLogin: user.lastLogin,
      projects: uniqueProjects,
    };

    return NextResponse.json(transformedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' }, 
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    
    // Validate user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate request body
    const schema = z.object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      position: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      isAdmin: z.boolean().optional(),
    });
    
    const body = await request.json();
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: validationResult.data,
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
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    
    // Validate user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete the user by marking as inactive
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive: false,
      },
    });

    // Create a daily log entry for the user deletion
    await prisma.dailyLog.create({
      data: {
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        description: `Removed member: ${existingUser.fullName || existingUser.username}`,
        category: 'user',
        completed: true,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' }, 
      { status: 500 }
    );
  }
} 