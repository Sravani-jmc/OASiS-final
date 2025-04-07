// Type declarations for missing types in API routes
declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: URL;
  }
  
  export class NextResponse<T = any> extends Response {
    static json<T>(body: T, init?: ResponseInit): NextResponse<T>;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}

// Add missing module declarations
declare module '@next-auth/prisma-adapter' {
  import { PrismaClient } from '@prisma/client';
  export function PrismaAdapter(prismaClient: PrismaClient): any;
}

declare module '@prisma/client' {
  export namespace Prisma {
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, any>;
      clientVersion: string;
      constructor(message: string, code: string, clientVersion: string, meta?: Record<string, any>);
    }
  }
}

declare module 'zod' {
  export const z: any;
  export function string(): any;
  export function boolean(): any;
  export function number(): any;
  export function object(schema: any): any;
  export function array(schema: any): any;
  export function enumValues(values: any[]): any;
  export class ZodError extends Error {
    constructor(issues: any[]);
    format(): any;
  }
}

// Add types for React UI components if needed
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 