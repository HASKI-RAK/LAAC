import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { AuthModule } from './auth';
import { AdminModule } from './admin';
import { MetricsModule } from './metrics';

@Module({
  imports: [CoreModule, AuthModule, MetricsModule, AdminModule], // REQ-FN-021: AdminModule for metrics export
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
