import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Global Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['uploads/(.*)'],
  });

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Serve static files from /uploads
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('HUST Cine - Cinema Ticket Booking API')
    .setDescription(
      'Hệ thống Đặt vé Xem phim & Quản trị Rạp chiếu phim HUST Cine (Đại học Bách Khoa Hà Nội)\n\n' +
      '- Timezone: Asia/Ho_Chi_Minh (UTC+7)\n' +
      '- Currency: VND\n' +
      '- Database: SQLite Local (Zero-Docker)',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`🚀 HUST Cine Backend is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger API Documentation:       http://localhost:${port}/docs`);
  logger.log(`🕒 Server Time API:                http://localhost:${port}/api/v1/time`);
  logger.log(`=======================================================`);
}

bootstrap();
