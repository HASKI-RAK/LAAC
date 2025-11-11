// Implements REQ-FN-020: Application bootstrap with structured logging
// Implements REQ-FN-023: Swagger configuration with bearer auth
// Implements REQ-FN-008/009: OpenAPI documentation

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './core/logger';

async function bootstrap() {
  // Create application with buffer logs until custom logger is ready
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // REQ-FN-020: Use custom structured logger globally
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // REQ-FN-024: Enable global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert types
      },
    }),
  );

  // Set global API prefix (e.g., /api/v1)
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      '/',
      'health',
      'health/liveness',
      'health/readiness',
      'prometheus',
    ], // Exclude public routes from prefix
  });

  // REQ-FN-008/009: Configure Swagger/OpenAPI documentation
  // REQ-FN-023: Add bearer authentication security scheme
  const config = new DocumentBuilder()
    .setTitle('LAAC - Learning Analytics Analyzing Center')
    .setDescription(
      'RESTful API for learning analytics metrics computation and retrieval. ' +
        'Provides access to xAPI-based analytics from Learning Record Stores (LRS). ' +
        'Requires JWT authentication with appropriate scopes.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // Security scheme name
    )
    .addTag('Health', 'Health check and readiness endpoints (public)')
    .addTag('Metrics', 'Metrics catalog and computation endpoints')
    .addTag('Admin', 'Administrative endpoints (cache, config)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep auth token in browser
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application listening on port ${port}`, 'Bootstrap');
  logger.log(
    `API documentation available at http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
