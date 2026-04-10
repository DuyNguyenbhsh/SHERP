/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkItemService } from './work-item.service';
import { WorkItemMaster } from './entities/work-item-master.entity';
import {
  CreateWorkItemDto,
  UpdateWorkItemDto,
} from './dto/create-work-item.dto';

describe('WorkItemService', () => {
  let service: WorkItemService;
  let repo: jest.Mocked<Repository<WorkItemMaster>>;

  const mockWorkItem: WorkItemMaster = {
    id: 'uuid-001',
    item_code: 'CT-XD-001',
    item_name: 'Do be tong cot',
    unit: 'm3',
    item_group: 'Ket cau',
    specifications: undefined as unknown as Record<string, unknown>,
    inspection_checklist: undefined as unknown as Record<string, unknown>[],
    reference_images: undefined as unknown as {
      url: string;
      caption?: string;
    }[],
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkItemService,
        {
          provide: getRepositoryToken(WorkItemMaster),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<WorkItemService>(WorkItemService);
    repo = module.get(getRepositoryToken(WorkItemMaster));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateWorkItemDto = {
      item_code: 'CT-XD-001',
      item_name: 'Do be tong cot',
      unit: 'm3',
      item_group: 'Ket cau',
    };

    it('should create and return a work item when item_code is unique', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockWorkItem);
      mockRepo.save.mockResolvedValue(mockWorkItem);

      const result = await service.create(dto);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { item_code: dto.item_code },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(mockWorkItem);
      expect(result).toEqual(mockWorkItem);
    });

    it('should throw ConflictException when item_code already exists', async () => {
      mockRepo.findOne.mockResolvedValue(mockWorkItem);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        `Ma cong tac "${dto.item_code}" da ton tai`,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── FIND ALL ──────────────────────────────────────────────────────────

  describe('findAll()', () => {
    const items = [mockWorkItem];

    it('should return all active work items with no filters', async () => {
      mockRepo.find.mockResolvedValue(items);

      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { item_code: 'ASC' },
      });
      expect(result).toEqual(items);
    });

    it('should filter by search term on item_code and item_name', async () => {
      mockRepo.find.mockResolvedValue(items);

      const result = await service.findAll('be tong');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: [
          {
            item_code: expect.objectContaining({ _value: '%be tong%' }),
            is_active: true,
          },
          {
            item_name: expect.objectContaining({ _value: '%be tong%' }),
            is_active: true,
          },
        ],
        order: { item_code: 'ASC' },
      });
      expect(result).toEqual(items);
    });

    it('should filter by group when group is provided', async () => {
      mockRepo.find.mockResolvedValue(items);

      const result = await service.findAll(undefined, 'Ket cau');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { is_active: true, item_group: 'Ket cau' },
        order: { item_code: 'ASC' },
      });
      expect(result).toEqual(items);
    });

    it('should prioritize search over group filter', async () => {
      mockRepo.find.mockResolvedValue(items);

      // When both search and group are provided, the service returns
      // early with the search query, ignoring the group filter.
      await service.findAll('cot', 'Ket cau');

      // The find call should use the search pattern (ILike), not group
      const callArgs = mockRepo.find.mock.calls[0][0];
      expect(Array.isArray(callArgs.where)).toBe(true);
    });

    it('should return empty array when no items match', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findAll('nonexistent');

      expect(result).toEqual([]);
    });
  });

  // ─── FIND ONE ──────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return the work item when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockWorkItem);

      const result = await service.findOne('uuid-001');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-001' },
      });
      expect(result).toEqual(mockWorkItem);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('uuid-999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('uuid-999')).rejects.toThrow(
        'Cong tac khong ton tai',
      );
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────────────

  describe('update()', () => {
    const updateDto: UpdateWorkItemDto = {
      item_name: 'Do be tong dam',
    };

    it('should update and return the work item', async () => {
      const updatedItem = { ...mockWorkItem, item_name: 'Do be tong dam' };
      mockRepo.findOne.mockResolvedValue({ ...mockWorkItem });
      mockRepo.save.mockResolvedValue(updatedItem);

      const result = await service.update('uuid-001', updateDto);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ item_name: 'Do be tong dam' }),
      );
      expect(result).toEqual(updatedItem);
    });

    it('should throw NotFoundException when item to update does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow renaming item_code when no duplicate exists', async () => {
      const renameDto: UpdateWorkItemDto = { item_code: 'CT-XD-002' };
      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockWorkItem }) // findOne(id) in findOne()
        .mockResolvedValueOnce(null); // duplicate check
      const renamed = { ...mockWorkItem, item_code: 'CT-XD-002' };
      mockRepo.save.mockResolvedValue(renamed);

      const result = await service.update('uuid-001', renameDto);

      // Second findOne call checks for duplicate item_code
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2);
      expect(mockRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { item_code: 'CT-XD-002' },
      });
      expect(result).toEqual(renamed);
    });

    it('should throw ConflictException when renaming to an existing item_code', async () => {
      const renameDto: UpdateWorkItemDto = { item_code: 'CT-XD-EXISTING' };
      const existingItem = {
        ...mockWorkItem,
        id: 'uuid-002',
        item_code: 'CT-XD-EXISTING',
      };
      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockWorkItem }) // findOne(id)
        .mockResolvedValueOnce(existingItem); // duplicate found

      await expect(service.update('uuid-001', renameDto)).rejects.toThrow(
        ConflictException,
      );

      // Reset mocks for second assertion
      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockWorkItem })
        .mockResolvedValueOnce(existingItem);

      await expect(service.update('uuid-001', renameDto)).rejects.toThrow(
        'Ma cong tac "CT-XD-EXISTING" da ton tai',
      );
    });

    it('should skip duplicate check when item_code is unchanged', async () => {
      const sameCodeDto: UpdateWorkItemDto = { item_code: 'CT-XD-001' };
      mockRepo.findOne.mockResolvedValue({ ...mockWorkItem });
      mockRepo.save.mockResolvedValue(mockWorkItem);

      await service.update('uuid-001', sameCodeDto);

      // Only one findOne call (the findOne(id)), no duplicate check
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate check when item_code is not in dto', async () => {
      const noCodeDto: UpdateWorkItemDto = { unit: 'kg' };
      mockRepo.findOne.mockResolvedValue({ ...mockWorkItem });
      mockRepo.save.mockResolvedValue({ ...mockWorkItem, unit: 'kg' });

      await service.update('uuid-001', noCodeDto);

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete by setting is_active to false', async () => {
      const activeItem = { ...mockWorkItem, is_active: true };
      mockRepo.findOne.mockResolvedValue(activeItem);
      mockRepo.save.mockResolvedValue({ ...activeItem, is_active: false });

      await service.remove('uuid-001');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should throw NotFoundException when item to remove does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('uuid-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return void on successful removal', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockWorkItem });
      mockRepo.save.mockResolvedValue({ ...mockWorkItem, is_active: false });

      const result = await service.remove('uuid-001');

      expect(result).toBeUndefined();
    });
  });
});
