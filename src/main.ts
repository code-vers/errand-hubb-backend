import './instrument.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config/config.js';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';

import { urlencoded, json } from 'express';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  // Remove payload limit for unlimited large images and preserve rawBody for webhooks
  app.use(
    json({
      limit: '50000mb',
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    urlencoded({
      extended: true,
      limit: '50000mb',
      parameterLimit: 1000000,
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Invalid value',
        }));
        return new BadRequestException(result);
      },
    }),
  );

  // Global Interceptor & Filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Cookies - Use a more robust check for ESM
  const cookieHandler = (cookieParser as any).default || cookieParser;
  app.use(cookieHandler());

  // Diagnostics for VPS File System
  const mediaRoot = config.MEDIA_ROOT;
  console.log(`SERVER: -----------------------------------------`);
  console.log(`SERVER: Current Working Directory: ${process.cwd()}`);
  console.log(`SERVER: Static Files (MEDIA_ROOT): ${mediaRoot}`);

  try {
    if (!fs.existsSync(mediaRoot)) {
      console.log(`SERVER: Media directory missing, creating at ${mediaRoot}`);
      fs.mkdirSync(mediaRoot, { recursive: true });
    }
    const testFile = join(mediaRoot, '.boot-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`SERVER: Media directory is WRITABLE`);
  } catch (err: any) {
    console.error(`SERVER ERROR: Media directory issue: ${err.message}`);
  }
  console.log(`SERVER: -----------------------------------------`);

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
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to true for debugging, change to error in strict prod
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ErrandHub API Documentation')
    .setDescription(
      'Interactive API documentation and direct testing portal for ErrandHub backend services.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token obtained from /api/v1/auth/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(config.PORT);
  console.log(
    `Application is running on: http://localhost:${config.PORT}/api/v1`,
  );
  console.log(
    `Swagger documentation is available at: http://localhost:${config.PORT}/api/docs`,
  );
}
bootstrap();
