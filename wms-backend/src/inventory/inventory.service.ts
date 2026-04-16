import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Location } from './entities/location.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/create-location.dto';
import {
  AdjustInventoryDto,
  TransferInventoryDto,
} from './dto/adjust-inventory.dto';
import { StockStatus } from './enums/inventory.enum';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Location)
    private locationRepo: Repository<Location>,

    @InjectRepository(InventoryItem)
    private inventoryRepo: Repository<InventoryItem>,

    private dataSource: DataSource,
  ) {}

  // ========== QUẢN LÝ VỊ TRÍ KHO (Location CRUD) ==========

  async createLocation(dto: CreateLocationDto) {
    // Gán parent nếu có
    const location = this.locationRepo.create({
      ...dto,
      parent: dto.parent_id ? ({ id: dto.parent_id } as Location) : undefined,
    });

    const saved = await this.locationRepo.save(location);
    return {
      status: 'success',
      message: `Tạo vị trí ${dto.code} thành công`,
      data: saved,
    };
  }

  async findAllLocations(warehouse_code?: string) {
    const where: { warehouse_code?: string } = {};
    if (warehouse_code) where.warehouse_code = warehouse_code;

    const locations = await this.locationRepo.find({
      where,
      relations: ['parent', 'children'],
      order: { code: 'ASC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${locations.length} vị trí`,
      data: locations,
    };
  }

  async findOneLocation(id: string) {
    const location = await this.locationRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!location) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy vị trí với ID: ${id}`,
        data: null,
      });
    }

    return { status: 'success', message: 'OK', data: location };
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy vị trí với ID: ${id}`,
        data: null,
      });
    }

    Object.assign(location, dto);
    if (dto.parent_id) {
      location.parent = { id: dto.parent_id } as Location;
    }

    const saved = await this.locationRepo.save(location);
    return {
      status: 'success',
      message: `Cập nhật vị trí ${location.code} thành công`,
      data: saved,
    };
  }

  // ========== TRA CỨU TỒN KHO ==========

  async findAllInventory(filters: {
    product_id?: string;
    location_id?: string;
    warehouse_code?: string;
    status?: StockStatus;
  }) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.location', 'loc');

    if (filters.product_id)
      qb.andWhere('inv.product_id = :product_id', {
        product_id: filters.product_id,
      });
    if (filters.location_id)
      qb.andWhere('inv.location_id = :location_id', {
        location_id: filters.location_id,
      });
    if (filters.warehouse_code)
      qb.andWhere('inv.warehouse_code = :warehouse_code', {
        warehouse_code: filters.warehouse_code,
      });
    if (filters.status)
      qb.andWhere('inv.status = :status', { status: filters.status });

    qb.orderBy('inv.product_id', 'ASC').addOrderBy('inv.created_at', 'DESC');
    const items = await qb.getMany();

    return {
      status: 'success',
      message: `Tìm thấy ${items.length} bản ghi tồn kho`,
      data: items,
    };
  }

  // Tổng hợp tồn kho theo sản phẩm (gộp tất cả vị trí)
  async getSummaryByProduct(product_id: string) {
    const result = await this.inventoryRepo
      .createQueryBuilder('inv')
      .select('inv.product_id', 'product_id')
      .addSelect('SUM(inv.qty_on_hand)', 'total_on_hand')
      .addSelect('SUM(inv.qty_reserved)', 'total_reserved')
      .addSelect(
        'SUM(inv.qty_on_hand) - SUM(inv.qty_reserved)',
        'total_available',
      )
      .where('inv.product_id = :product_id', { product_id })
      .andWhere('inv.status = :status', { status: StockStatus.AVAILABLE })
      .groupBy('inv.product_id')
      .getRawOne<{
        product_id: string;
        total_on_hand: string | number;
        total_reserved: string | number;
        total_available: string | number;
      }>();

    return {
      status: 'success',
      message: 'OK',
      data: result ?? {
        product_id,
        total_on_hand: 0,
        total_reserved: 0,
        total_available: 0,
      },
    };
  }

  // ========== ĐIỀU CHỈNH TỒN KHO (Kiểm kê / Nhập thủ công) ==========

  async adjustInventory(dto: AdjustInventoryDto) {
    return this.dataSource.transaction(async (manager) => {
      this.logger.log(
        `adjustInventory bắt đầu: productId=${dto.product_id}, locationId=${dto.location_id}, adjustQty=${dto.adjustment_qty}`,
      );
      // Tìm bản ghi tồn kho hiện tại tại vị trí cụ thể
      let item = await manager.findOne(InventoryItem, {
        where: {
          product_id: dto.product_id,
          location_id: dto.location_id,
          lot_number: dto.lot_number ?? undefined,
          serial_number: dto.serial_number ?? undefined,
          status: StockStatus.AVAILABLE,
        },
      });

      if (!item && dto.adjustment_qty < 0) {
        throw new BadRequestException({
          status: 'error',
          message:
            'Không tìm thấy bản ghi tồn kho để giảm. Kiểm tra lại product_id, location_id, lot_number.',
          data: null,
        });
      }

      if (item) {
        // Cập nhật số lượng trên bản ghi hiện có
        const newQty = item.qty_on_hand + dto.adjustment_qty;
        if (newQty < 0) {
          throw new BadRequestException({
            status: 'error',
            message: `Tồn kho hiện tại (${item.qty_on_hand}) không đủ để giảm ${Math.abs(dto.adjustment_qty)}`,
            data: null,
          });
        }
        item.qty_on_hand = newQty;
        item.notes = dto.reason;
      } else {
        // Tạo bản ghi mới (chỉ khi adjustment_qty > 0)
        const location = await manager.findOne(Location, {
          where: { id: dto.location_id },
        });
        item = manager.create(InventoryItem, {
          product_id: dto.product_id,
          location_id: dto.location_id,
          qty_on_hand: dto.adjustment_qty,
          lot_number: dto.lot_number,
          serial_number: dto.serial_number,
          warehouse_code: location?.warehouse_code,
          notes: dto.reason,
        });
      }

      const saved = await manager.save(InventoryItem, item);
      this.logger.log(
        `adjustInventory thành công: productId=${dto.product_id}, newQty=${saved.qty_on_hand}`,
      );
      return {
        status: 'success',
        message: `Điều chỉnh tồn kho thành công (${dto.adjustment_qty > 0 ? '+' : ''}${dto.adjustment_qty})`,
        data: saved,
      };
    });
  }

  // ========== CHUYỂN KHO NỘI BỘ (Transfer) ==========

  async transferInventory(dto: TransferInventoryDto) {
    return this.dataSource.transaction(async (manager) => {
      this.logger.log(
        `transferInventory bắt đầu: productId=${dto.product_id}, from=${dto.from_location_id}, to=${dto.to_location_id}, qty=${dto.qty}`,
      );
      // 1. Tìm bản ghi tồn kho tại vị trí nguồn
      const source = await manager.findOne(InventoryItem, {
        where: {
          product_id: dto.product_id,
          location_id: dto.from_location_id,
          lot_number: dto.lot_number ?? undefined,
          status: StockStatus.AVAILABLE,
        },
      });

      if (!source || source.qty_on_hand < dto.qty) {
        throw new BadRequestException({
          status: 'error',
          message: `Tồn kho tại vị trí nguồn không đủ (hiện có: ${source?.qty_on_hand ?? 0}, yêu cầu: ${dto.qty})`,
          data: null,
        });
      }

      // 2. Trừ tồn kho nguồn
      source.qty_on_hand -= dto.qty;
      await manager.save(InventoryItem, source);

      // 3. Cộng tồn kho đích (tìm hoặc tạo mới)
      let target = await manager.findOne(InventoryItem, {
        where: {
          product_id: dto.product_id,
          location_id: dto.to_location_id,
          lot_number: dto.lot_number ?? undefined,
          status: StockStatus.AVAILABLE,
        },
      });

      if (target) {
        target.qty_on_hand += dto.qty;
      } else {
        const destLocation = await manager.findOne(Location, {
          where: { id: dto.to_location_id },
        });
        target = manager.create(InventoryItem, {
          product_id: dto.product_id,
          location_id: dto.to_location_id,
          qty_on_hand: dto.qty,
          lot_number: dto.lot_number,
          warehouse_code: destLocation?.warehouse_code,
          notes: dto.notes,
        });
      }

      await manager.save(InventoryItem, target);

      this.logger.log(
        `transferInventory thành công: productId=${dto.product_id}, qty=${dto.qty}, sourceRemaining=${source.qty_on_hand}, targetCurrent=${target.qty_on_hand}`,
      );
      return {
        status: 'success',
        message: `Chuyển ${dto.qty} sản phẩm từ vị trí nguồn sang đích thành công`,
        data: {
          source_qty_remaining: source.qty_on_hand,
          target_qty_current: target.qty_on_hand,
        },
      };
    });
  }
}
