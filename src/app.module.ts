import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { AuthModule } from './auth';
import { AdminModule } from './admin';

@Module({
  imports: [CoreModule, AuthModule, AdminModule], // REQ-FN-021: AdminModule for metrics export
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
