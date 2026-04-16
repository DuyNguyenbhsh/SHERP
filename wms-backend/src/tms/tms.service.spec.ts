import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TmsService } from './tms.service';
import { Waybill } from './entities/waybill.entity';
import { OutboundOrder } from '../outbound/entities/outbound-order.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockDataSource = {
  transaction: jest.fn(),
};

describe('TmsService', () => {
  let service: TmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmsService,
        { provide: getRepositoryToken(Waybill), useValue: mockRepo() },
        { provide: getRepositoryToken(OutboundOrder), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TmsService>(TmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
