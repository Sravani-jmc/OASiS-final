import { NextRequest, NextResponse } from 'next/server';
import { getSocketIO } from '@/lib/socketio';

export async function GET(req: NextRequest) {
  try {
    // Initialize Socket.io server if it doesn't exist
    const io = getSocketIO(req);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Socket.io server is running',
      socketPath: '/api/socketio'
    });
  } catch (error) {
    console.error('Socket.io initialization error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to start Socket.io server' 
    }, { status: 500 });
  }
} 