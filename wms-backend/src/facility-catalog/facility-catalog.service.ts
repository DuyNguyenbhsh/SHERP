import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacilitySystem } from './entities/facility-system.entity';
import { FacilityEquipmentItem } from './entities/facility-equipment-item.entity';
import { CreateFacilitySystemDto } from './dto/create-facility-system.dto';
import { UpdateFacilitySystemDto } from './dto/update-facility-system.dto';
import { CreateFacilityEquipmentItemDto } from './dto/create-facility-equipment-item.dto';
import { UpdateFacilityEquipmentItemDto } from './dto/update-facility-equipment-item.dto';

@Injectable()
export class FacilityCatalogService {
  constructor(
    @InjectRepository(FacilitySystem)
    private readonly systemsRepo: Repository<FacilitySystem>,
    @InjectRepository(FacilityEquipmentItem)
    private readonly itemsRepo: Repository<FacilityEquipmentItem>,
  ) {}

  // ── facility_systems ────────────────────────────────────────
  async listSystems(): Promise<FacilitySystem[]> {
    return this.systemsRepo.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', name_vi: 'ASC' },
    });
  }

  async createSystem(dto: CreateFacilitySystemDto): Promise<FacilitySystem> {
    const dup = await this.systemsRepo.findOne({ where: { code: dto.code } });
    if (dup)
      throw new BadRequestException(`Mã hệ thống ${dto.code} đã tồn tại`);
    return this.systemsRepo.save(this.systemsRepo.create(dto));
  }

  async updateSystem(
    id: string,
    dto: UpdateFacilitySystemDto,
  ): Promise<FacilitySystem> {
    const sys = await this.systemsRepo.findOne({ where: { id } });
    if (!sys) throw new NotFoundException(`Không tìm thấy hệ thống ${id}`);
    Object.assign(sys, dto);
    return this.systemsRepo.save(sys);
  }

  async deactivateSystem(id: string): Promise<FacilitySystem> {
    return this.updateSystem(id, { is_active: false });
  }

  // ── facility_equipment_items ────────────────────────────────
  async listEquipmentItems(
    systemId?: string,
  ): Promise<FacilityEquipmentItem[]> {
    return this.itemsRepo.find({
      where: {
        is_active: true,
        ...(systemId ? { system_id: systemId } : {}),
      },
      order: { sort_order: 'ASC', name_vi: 'ASC' },
      relations: ['system'],
    });
  }

  async createEquipmentItem(
    dto: CreateFacilityEquipmentItemDto,
  ): Promise<FacilityEquipmentItem> {
    const sys = await this.systemsRepo.findOne({
      where: { id: dto.system_id },
    });
    if (!sys)
      throw new NotFoundException(`Không tìm thấy hệ thống ${dto.system_id}`);
    if (dto.code) {
      const dup = await this.itemsRepo.findOne({ where: { code: dto.code } });
      if (dup) throw new BadRequestException(`Mã ${dto.code} đã tồn tại`);
    }
    return this.itemsRepo.save(this.itemsRepo.create(dto));
  }

  async updateEquipmentItem(
    id: string,
    dto: UpdateFacilityEquipmentItemDto,
  ): Promise<FacilityEquipmentItem> {
    const item = await this.itemsRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Không tìm thấy thiết bị ${id}`);
    Object.assign(item, dto);
    return this.itemsRepo.save(item);
  }

  async deactivateEquipmentItem(id: string): Promise<FacilityEquipmentItem> {
    return this.updateEquipmentItem(id, { is_active: false });
  }
}
