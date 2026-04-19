import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from './shared/redis';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  healthCheck() {
    return {
      status: 'ok',
      message: 'SH-GROUP ERP Backend is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/redis')
  async redisHealth() {
    const result = await this.redisService.ping();
    return {
      status: result.ok ? 'ok' : 'down',
      message: result.ok ? 'Redis kết nối thành công' : 'Redis không phản hồi',
      data: result,
    };
  }
}
