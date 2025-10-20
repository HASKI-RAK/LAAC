// Implements REQ-FN-020: Application bootstrap with structured logging

import { NestFactory } from '@nestjs/core';
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application listening on port ${port}`, 'Bootstrap');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
