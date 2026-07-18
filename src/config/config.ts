import 'dotenv/config';
import { join } from 'path';

// Debug: Check if env vars are loaded
if (!process.env.SMTP_USER) {
  console.warn('WARNING: SMTP_USER is not defined in environment variables');
  console.log('Current working directory:', process.cwd());
}

// Helper to safely get env vars even if the user's .env file has leading spaces in keys
const getSafeEnv = (key: string): string => {
  if (process.env[key]) return process.env[key] as string;
  // Fallback: search all keys and trim them to find a match
  const foundKey = Object.keys(process.env).find((k) => k.trim() === key);
  return foundKey ? (process.env[foundKey] as string) : '';
};

export const config = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: getSafeEnv('DATABASE_URL'),
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  JWT_SECRET: getSafeEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '1d') as string,
  SMTP_HOST: (process.env.SMTP_HOST || 'smtp.gmail.com') as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: getSafeEnv('SMTP_USER'),
  SMTP_PASS: getSafeEnv('SMTP_PASS'),
  SMTP_FROM: (process.env.SMTP_FROM || 'noreply@errandhub.com') as string,
  FRONTEND_URL: getSafeEnv('FRONTEND_URL'),
  BACKEND_URL: getSafeEnv('BACKEND_URL'),
  STRIPE_SECRET_KEY: getSafeEnv('STRIPE_SECRET_KEY').trim(),
  STRIPE_WEBHOOK_SECRET: getSafeEnv('STRIPE_WEBHOOK_SECRET').trim(),
  STRIPE_MONTHLY_PRICE_ID: getSafeEnv('STRIPE_MONTHLY_PRICE_ID').trim(),
  STRIPE_YEARLY_PRICE_ID: getSafeEnv('STRIPE_YEARLY_PRICE_ID').trim(),
  STRIPE_CURRENCY: (process.env.STRIPE_CURRENCY || 'usd') as string,
  STRIPE_SUCCESS_URL: (getSafeEnv('STRIPE_SUCCESS_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/subscription?success=true`).trim(),
  STRIPE_CANCEL_URL: (getSafeEnv('STRIPE_CANCEL_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/subscription?canceled=true`).trim(),
  STRIPE_CUSTOMER_PORTAL_RETURN_URL: (getSafeEnv('STRIPE_CUSTOMER_PORTAL_RETURN_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/subscription`).trim(),

  // Ads Subscription
  STRIPE_ADS_MONTHLY_PRICE_ID: getSafeEnv('STRIPE_ADS_MONTHLY_PRICE_ID').trim(),
  STRIPE_ADS_SUCCESS_URL: (getSafeEnv('STRIPE_ADS_SUCCESS_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/ads-subscription?success=true`).trim(),
  STRIPE_ADS_CANCEL_URL: (getSafeEnv('STRIPE_ADS_CANCEL_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/ads-subscription?canceled=true`).trim(),
  STRIPE_ADS_CUSTOMER_PORTAL_RETURN_URL: (getSafeEnv('STRIPE_ADS_CUSTOMER_PORTAL_RETURN_URL') ||
    `${getSafeEnv('FRONTEND_URL')}/dashboard/ads-subscription`).trim(),

  MEDIA_ROOT: process.env.MEDIA_ROOT || join(process.cwd(), 'media'),
};

// Simple validation to ensure required config is present
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env');
}

if (!config.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}
