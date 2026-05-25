import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config/config.js';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Interceptor & Filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Cookies
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000'], // Adjust based on your frontend URL
    credentials: true,
  });

  await app.listen(config.PORT);
  console.log(`Application is running on: http://localhost:${config.PORT}/api/v1`);
}
bootstrap();
