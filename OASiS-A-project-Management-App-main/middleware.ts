import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || 
                       path === '/register' || 
                       path === '/forgot-password' ||
                       path === '/api/auth' ||
                       path.startsWith('/api/auth/');
  
  // Get the token and check if the user is authenticated
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // Redirect logic
  if (isPublicPath && token) {
    // If user is logged in and trying to access a public path, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (!isPublicPath && !token) {
    // If user is not logged in and trying to access a protected path, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 