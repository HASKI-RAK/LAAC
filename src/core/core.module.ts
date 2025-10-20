// Implements REQ-FN-014: Secrets and Configuration Management
// CoreModule provides global configuration access via ConfigModule

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configFactory, configValidationSchema } from './config';

@Module({
  imports: [
    // REQ-FN-014: Configure environment variable management
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally without imports
      cache: true, // Cache environment variables for performance
      load: [configFactory], // Load typed configuration factory
      validationSchema: configValidationSchema, // Validate at startup with Joi
      validationOptions: {
        allowUnknown: true, // Allow unknown variables for flexibility
        abortEarly: false, // Show all validation errors at once
      },
      expandVariables: true, // Support variable expansion in .env files
    }),
  ],
  controllers: [],
  providers: [],
  exports: [ConfigModule],
})
export class CoreModule {}
