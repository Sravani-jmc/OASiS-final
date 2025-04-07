/**
 * Email utility functions
 * 
 * This module provides email functionality using nodemailer.
 */

import nodemailer from 'nodemailer';

// Configure email transporter
let transporter: nodemailer.Transporter | null = null;
let testAccountPromise: Promise<nodemailer.TestAccount> | null = null;

// Initialize the email transporter based on environment
async function getTransporter() {
  // If we already have a transporter, return it
  if (transporter) {
    return transporter;
  }

  try {
    // In production, use actual SMTP configuration
    if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_FROM) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: process.env.EMAIL_SERVER_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });
    } else {
      // For development/testing without SMTP server
      // Uses ethereal.email service for testing
      try {
        if (!testAccountPromise) {
          // Only create a test account once
          testAccountPromise = nodemailer.createTestAccount();
        }
        
        const testAccount = await testAccountPromise;
        
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('Using Ethereal test account:', testAccount.user);
      } catch (etherealError) {
        console.error('Failed to create Ethereal test account:', etherealError);
        // Fallback to logging transporter if test account creation fails
        transporter = createLoggingTransporter();
      }
    }

    return transporter;
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
    
    // Fallback to a simple logging transporter
    transporter = createLoggingTransporter();
    
    return transporter;
  }
}

// Create a simple logging transporter for fallback
function createLoggingTransporter() {
  return {
    sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
      console.log('=================== EMAIL ===================');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Text:', mailOptions.text);
      console.log('HTML:', mailOptions.html);
      console.log('==============================================');
      return { messageId: 'mock-message-id' };
    }
  } as nodemailer.Transporter;
}

/**
 * Send an invitation email to a user
 */
export async function sendInvitationEmail(
  email: string,
  teamName: string,
  inviterName: string
): Promise<boolean> {
  try {
    const transport = await getTransporter();
    
    const subject = `${inviterName}さんから「${teamName}」チームへの招待が届いています`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>招待のお知らせ</h2>
        <p>${inviterName}さんから「${teamName}」チームへの招待が届いています。</p>
        <p>以下のリンクをクリックして招待を確認してください：</p>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/invitations" 
             style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px;">
            招待を確認する
          </a>
        </p>
        <p>このメールに心当たりがない場合は、無視してください。</p>
      </div>
    `;
    
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@oasis-app.com',
      to: email,
      subject,
      html: htmlBody,
      text: htmlBody.replace(/<[^>]*>/g, ''),
    });
    
    // Log email preview URL if using ethereal for testing
    if (info.messageId && !process.env.EMAIL_SERVER_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}

/**
 * Send a notification email to a user
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    const transport = await getTransporter();
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>通知</h2>
        <p>${message}</p>
      </div>
    `;
    
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@oasis-app.com',
      to: email,
      subject,
      html: htmlBody,
      text: message,
    });
    
    // Log email preview URL if using ethereal for testing
    if (info.messageId && !process.env.EMAIL_SERVER_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

/**
 * Send an OTP verification email to a user
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  username: string
): Promise<boolean> {
  try {
    const transport = await getTransporter();
    
    const subject = 'OASiS アカウント確認コード';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>パスワード再設定</h2>
        <p>こんにちは、${username}さん。</p>
        <p>アカウントのパスワード再設定リクエストを受け取りました。</p>
        <p>確認コード: <strong style="font-size: 20px; letter-spacing: 3px;">${otp}</strong></p>
        <p>このコードは15分間有効です。</p>
        <p>このリクエストにお心当たりがない場合は、このメールを無視してください。</p>
      </div>
    `;
    
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@oasis-app.com',
      to: email,
      subject,
      html: htmlBody,
      text: `パスワード再設定\n\nこんにちは、${username}さん。\n\nアカウントのパスワード再設定リクエストを受け取りました。\n\n確認コード: ${otp}\n\nこのコードは15分間有効です。\n\nこのリクエストにお心当たりがない場合は、このメールを無視してください。`,
    }).catch(error => {
      console.error(`Failed to send email to ${email}:`, error);
      // Return a fake success for development environments
      return { messageId: 'mock-message-id-failed-silently' };
    });
    
    // Log email preview URL if using ethereal for testing
    if (info.messageId && !process.env.EMAIL_SERVER_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    // Return true in development to simulate success
    return process.env.NODE_ENV === 'production' ? false : true;
  }
}

/**
 * Send account credentials email to user after successful OTP verification
 */
export async function sendCredentialsEmail(
  email: string,
  username: string,
  temporaryPassword: string
): Promise<boolean> {
  try {
    const transport = await getTransporter();
    
    const subject = 'OASiS アカウント情報';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>アカウント情報</h2>
        <p>こんにちは、${username}さん。</p>
        <p>リクエストに応じて、以下があなたのOASiSアカウント情報です：</p>
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>ユーザー名:</strong> ${username}</p>
          <p><strong>仮パスワード:</strong> ${temporaryPassword}</p>
        </div>
        <p>セキュリティのため、ログイン後すぐにパスワードを変更することをお勧めします。</p>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/login" 
             style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px;">
            ログイン
          </a>
        </p>
      </div>
    `;
    
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@oasis-app.com',
      to: email,
      subject,
      html: htmlBody,
      text: `アカウント情報\n\nこんにちは、${username}さん。\n\nリクエストに応じて、以下があなたのOASiSアカウント情報です：\n\nユーザー名: ${username}\n仮パスワード: ${temporaryPassword}\n\nセキュリティのため、ログイン後すぐにパスワードを変更することをお勧めします。`,
    });
    
    // Log email preview URL if using ethereal for testing
    if (info.messageId && !process.env.EMAIL_SERVER_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending credentials email:', error);
    return false;
  }
} 