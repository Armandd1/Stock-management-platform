import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);

  const jwtSecret = configService.get<string>('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET before starting the application.');
  }

  await app.register(fastifyCookie, {
    secret: jwtSecret, // same secret for simple signing
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
  });

  // Global Validation Pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Exception Filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Stock Management API')
    .setDescription('API for managing products, warehouses, stock and movements')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Listen on 0.0.0.0 for Docker port forwarding
  await app.listen(configService.get<number>('PORT') ?? 3000, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger docs: ${await app.getUrl()}/api/docs`);
}
bootstrap();

