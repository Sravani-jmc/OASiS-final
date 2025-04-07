import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// For demo purposes, we're saving files to the public directory
// In production, you would use a cloud storage solution like S3
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id;
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // Check if user is a member of the team (in a real app)
    // For now, we'll mock this check
    const isMember = true;
    
    if (!isMember) {
      return NextResponse.json(
        { error: 'このチームにファイルをアップロードする権限がありません' },
        { status: 403 }
      );
    }
    
    // Process the FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }
    
    // Get file details
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create directory if it doesn't exist
    const teamUploadDir = join(UPLOAD_DIR, teamId);
    await mkdir(teamUploadDir, { recursive: true });
    
    // Write the file
    const filePath = join(teamUploadDir, filename);
    await writeFile(filePath, buffer);
    
    // Generate file URL
    const fileUrl = `/uploads/${teamId}/${filename}`;
    
    // Determine file type
    const fileType = getFileType(file.type);
    
    // Return file metadata
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        url: fileUrl,
        type: fileType,
        size: file.size,
      }
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// Helper function to determine file type category
function getFileType(mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'other' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('text/') ||
    mimeType.includes('application/json') ||
    mimeType.includes('application/xml')
  ) {
    return 'document';
  } else {
    return 'other';
  }
} 