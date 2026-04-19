import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './shared/redis';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: RedisService,
          useValue: {
            ping: jest.fn().mockResolvedValue({
              ok: true,
              latencyMs: 1,
              version: 'test',
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('healthCheck', () => {
    it('trả về status "ok" + message + timestamp', () => {
      const result = appController.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.message).toContain('SH-GROUP ERP Backend');
      expect(result.timestamp).toEqual(expect.any(String));
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});
