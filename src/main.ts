import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config/config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(config.PORT);
  console.log(`Application is running on: http://localhost:${config.PORT}`);
}
bootstrap();
