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
    console.log('SMTP_USER:', config.SMTP_USER ? 'Found' : 'MISSING');
    console.log('SMTP_PASS:', config.SMTP_PASS ? 'Found' : 'MISSING');
    console.log('-------------------------');

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

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
        throw new Error('SMTP credentials are missing. Please check your .env file.');
      }
      await this.transporter.sendMail(mailOptions);
      console.log('Reset email sent successfully to:', email);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      throw error;
    }
  }
}
