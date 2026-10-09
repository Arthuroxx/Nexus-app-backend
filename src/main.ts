import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { optionalEnv } from './config/env';
import { ProblemDetailFilter } from './common/problem-detail.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailFilter());
  app.enableCors({
    origin: [optionalEnv('FRONTEND_URL', 'http://localhost:4200'), 'http://localhost:4200'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
