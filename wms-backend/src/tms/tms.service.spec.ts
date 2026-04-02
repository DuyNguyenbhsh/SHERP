import { Test, TestingModule } from '@nestjs/testing';
import { TmsService } from './tms.service';

describe('TmsService', () => {
  let service: TmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TmsService],
    }).compile();

    service = module.get<TmsService>(TmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
