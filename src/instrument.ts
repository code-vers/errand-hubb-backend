import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring / Tracing
    tracesSampleRate: 1.0,
    // Profiling
    profilesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.SENTRY_DEBUG === 'true',
  });
  console.log('SENTRY: Initialized successfully');
} else {
  console.warn('SENTRY: SENTRY_DSN not found in environment. Sentry is disabled.');
}
