/**
 * Mock nodemailer typings since the actual package isn't installed.
 * This allows TypeScript to compile with our mock implementation.
 */
declare module 'nodemailer' {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    [key: string]: any;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<any>;
  }

  export interface TestAccount {
    user: string;
    pass: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
    };
    imap: {
      host: string;
      port: number;
      secure: boolean;
    };
    pop3: {
      host: string;
      port: number;
      secure: boolean;
    };
    web: string;
  }

  export function createTransport(options: any): Transporter;
  export function createTestAccount(): Promise<TestAccount>;
  export function getTestMessageUrl(info: any): string;
} 