import 'dotenv/config';
import { join } from 'path';

// Debug: Check if env vars are loaded
if (!process.env.SMTP_USER) {
  console.warn('WARNING: SMTP_USER is not defined in environment variables');
  console.log('Current working directory:', process.cwd());
}

export const config = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL as string,
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '1d') as string,
  SMTP_HOST: (process.env.SMTP_HOST || 'smtp.gmail.com') as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER as string,
  SMTP_PASS: process.env.SMTP_PASS as string,
  SMTP_FROM: (process.env.SMTP_FROM || 'noreply@errandhub.com') as string,
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:3000') as string,
  BACKEND_URL: (process.env.BACKEND_URL || 'http://localhost:3001') as string,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
  STRIPE_MONTHLY_PRICE_ID: process.env.STRIPE_MONTHLY_PRICE_ID as string,
  STRIPE_CURRENCY: (process.env.STRIPE_CURRENCY || 'usd') as string,
  STRIPE_SUCCESS_URL: (process.env.STRIPE_SUCCESS_URL ||
    `${process.env.FRONTEND_URL}/dashboard/subscription?success=true`) as string,
  STRIPE_CANCEL_URL: (process.env.STRIPE_CANCEL_URL ||
    `${process.env.FRONTEND_URL}/dashboard/subscription?canceled=true`) as string,
  STRIPE_CUSTOMER_PORTAL_RETURN_URL: (process.env
    .STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
    `${process.env.FRONTEND_URL}/dashboard/subscription`) as string,
  MEDIA_ROOT: process.env.MEDIA_ROOT || join(process.cwd(), 'media'),
};

// Simple validation to ensure required config is present
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env');
}

if (!config.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}
