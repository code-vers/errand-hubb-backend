import 'dotenv/config';

export const config = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
};

// Simple validation to ensure required config is present
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env');
}

if (!config.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}
