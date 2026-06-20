import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwt = app.get(JwtService);
  const token = jwt.sign({ sub: 'user-id-here', email: 'rakib36@gmail.com' });
  console.log("Token:", token);
  await app.close();
}
bootstrap();
