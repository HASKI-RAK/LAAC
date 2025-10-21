import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public() // REQ-FN-023: Root endpoint is public
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public() // REQ-FN-023: Health endpoint is public
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
