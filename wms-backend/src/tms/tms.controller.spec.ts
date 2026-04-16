import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TmsController } from './tms.controller';
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

describe('TmsController', () => {
  let controller: TmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TmsController],
      providers: [
        TmsService,
        { provide: getRepositoryToken(Waybill), useValue: mockRepo() },
        { provide: getRepositoryToken(OutboundOrder), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    controller = module.get<TmsController>(TmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
