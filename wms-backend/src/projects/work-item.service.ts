import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { WorkItemMaster } from './entities/work-item-master.entity';
import {
  CreateWorkItemDto,
  UpdateWorkItemDto,
} from './dto/create-work-item.dto';

@Injectable()
export class WorkItemService {
  constructor(
    @InjectRepository(WorkItemMaster)
    private readonly repo: Repository<WorkItemMaster>,
  ) {}

  async create(dto: CreateWorkItemDto): Promise<WorkItemMaster> {
    const exists = await this.repo.findOne({
      where: { item_code: dto.item_code },
    });
    if (exists) {
      throw new ConflictException(`Ma cong tac "${dto.item_code}" da ton tai`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(search?: string, group?: string): Promise<WorkItemMaster[]> {
    const where: Record<string, unknown> = { is_active: true };
    if (search) {
      return this.repo.find({
        where: [
          { item_code: ILike(`%${search}%`), is_active: true },
          { item_name: ILike(`%${search}%`), is_active: true },
        ],
        order: { item_code: 'ASC' },
      });
    }
    if (group) where.item_group = group;
    return this.repo.find({ where, order: { item_code: 'ASC' } });
  }

  async findOne(id: string): Promise<WorkItemMaster> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Cong tac khong ton tai');
    return item;
  }

  async update(id: string, dto: UpdateWorkItemDto): Promise<WorkItemMaster> {
    const item = await this.findOne(id);
    if (dto.item_code && dto.item_code !== item.item_code) {
      const dup = await this.repo.findOne({
        where: { item_code: dto.item_code },
      });
      if (dup) {
        throw new ConflictException(
          `Ma cong tac "${dto.item_code}" da ton tai`,
        );
      }
    }
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.is_active = false;
    await this.repo.save(item);
  }
}
