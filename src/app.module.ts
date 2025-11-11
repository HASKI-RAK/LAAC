import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { AuthModule } from './auth';
import { MetricsModule } from './metrics';

@Module({
  imports: [CoreModule, AuthModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
