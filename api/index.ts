import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import cookieParser from 'cookie-parser';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const createApp = async (expressInstance) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints ? Object.values(error.constraints)[0] : 'Invalid value',
        }));
        return new BadRequestException(result);
      },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Cookies - Use a more robust check for ESM
  const cookieHandler = (cookieParser as any).default || cookieParser;
  app.use(cookieHandler());

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'http://localhost:5173',
        'https://errand-hubb.vercel.app',
      ];
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.init();
  return app;
};

let cachedApp;

export default async (req, res) => {
  if (!cachedApp) {
    cachedApp = await createApp(server);
  }
  return server(req, res);
};
