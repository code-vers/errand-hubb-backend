import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from '../config/config.js';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('--- MailService Debug ---');
    console.log('SMTP_HOST:', config.SMTP_HOST);
    console.log('SMTP_PORT:', config.SMTP_PORT);
    
    // Safe logging for Render/Production
    const maskString = (str: string) => {
      if (!str) return 'MISSING';
      if (str.length <= 4) return '****';
      return `${str.substring(0, 2)}...${str.substring(str.length - 2)}`;
    };

    console.log('SMTP_USER:', maskString(config.SMTP_USER));
    console.log('SMTP_PASS:', maskString(config.SMTP_PASS));
    console.log('SMTP_FROM:', config.SMTP_FROM);
    console.log('FRONTEND_URL:', config.FRONTEND_URL);
    console.log('-------------------------');

    // On Render, IPv6 is often problematic. We force IPv4 using 'family: 4'
    const transportConfig: any = {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      // CRITICAL: Force IPv4 to fix ENETUNREACH on Render
      family: 4,
    };

    // If using Gmail, we can still use the service shortcut but keep the family: 4
    if (config.SMTP_HOST.includes('gmail.com')) {
      console.log('MailService: Gmail detected, applying IPv4-forced settings');
      transportConfig.service = 'gmail';
      // When using 'service', nodemailer ignores host/port/secure
      // but 'family' and 'auth' are still used.
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('MailService: Connection verification failed:', error.message);
        if (error.message.includes('ENETUNREACH')) {
          console.error('HINT: This is a network reachability issue. Render might be blocking this port or IPv6.');
        }
      } else {
        console.log('MailService: Server is ready to take our messages');
      }
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    console.log('MailService: Preparing reset email with URL:', resetUrl);

    const mailOptions = {
      from: `"Errand Hub" <${config.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h1 style="color: #2563eb; text-align: center;">Password Reset</h1>
          <p>Hello,</p>
          <p>You requested a password reset for your Errand Hub account. Please click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 Errand Hub. All rights reserved.</p>
        </div>
      `,
    };

    try {
      if (!config.SMTP_USER || !config.SMTP_PASS) {
        throw new Error('SMTP credentials are missing. Please check your environment variables.');
      }
      console.log('MailService: Sending reset email to:', email);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('MailService: Reset email sent successfully. MessageID:', info.messageId);
    } catch (error) {
      console.error('MailService: Failed to send reset email:', error);
      throw error;
    }
  }

  async sendAccountDeletionEmail(email: string, code: string) {
    const mailOptions = {
      from: `"Errand Hub Security" <${config.SMTP_FROM}>`,
      to: email,
      subject: 'Account Deletion Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h1 style="color: #dc2626; text-align: center;">Security Verification</h1>
          <p>Hello,</p>
          <p>We received a request to permanently delete your Errand Hub account. To proceed, please use the following verification code:</p>
          <div style="text-align: center; margin: 40px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background-color: #f3f4f6; padding: 15px 30px; border-radius: 10px; border: 2px dashed #dc2626;">
              ${code}
            </span>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, your account is still secure. Please change your password immediately as a precaution.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 Errand Hub. All rights reserved.</p>
        </div>
      `,
    };

    try {
      console.log('MailService: Sending deletion verification email to:', email);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('MailService: Deletion verification email sent. MessageID:', info.messageId);
    } catch (error) {
      console.error('MailService: Failed to send deletion email:', error);
      throw error;
    }
  }
}
