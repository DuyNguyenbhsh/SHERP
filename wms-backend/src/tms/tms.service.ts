import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Waybill } from './entities/waybill.entity';
import { OutboundOrder } from '../outbound/entities/outbound-order.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { WaybillStatus } from './enums/tms.enum';
import { OutboundStatus } from '../outbound/enums/outbound.enum';
import { CreateWaybillDto } from './dto/create-tm.dto';
import { UpdateWaybillDto } from './dto/update-tm.dto';

@Injectable()
export class TmsService {
  constructor(
    @InjectRepository(Waybill)
    private waybillRepo: Repository<Waybill>,

    @InjectRepository(OutboundOrder)
    private outboundOrderRepo: Repository<OutboundOrder>,

    private dataSource: DataSource,
  ) {}

  // === 1. TẠO VẬN ĐƠN — Gom nhiều OutboundOrder vào 1 chuyến xe ===
  async createWaybill(dto: CreateWaybillDto) {
    return this.dataSource.transaction(async (manager) => {
      // --- Bước 1: Validate danh sách OutboundOrder ---
      const orders = await manager.find(OutboundOrder, {
        where: { id: In(dto.outbound_order_ids) },
      });

      if (orders.length !== dto.outbound_order_ids.length) {
        const foundIds = orders.map((o) => o.id);
        const missingIds = dto.outbound_order_ids.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy phiếu xuất kho: ${missingIds.join(', ')}`,
          data: null,
        });
      }

      // Chỉ cho phép gom các phiếu đã PACKED hoặc PICKED (sẵn sàng xuất kho)
      const invalidOrders = orders.filter(
        (o) =>
          o.status !== OutboundStatus.PACKED &&
          o.status !== OutboundStatus.PICKED,
      );
      if (invalidOrders.length > 0) {
        throw new BadRequestException({
          status: 'error',
          message: `Các phiếu sau chưa sẵn sàng xuất kho (yêu cầu PICKED hoặc PACKED): ${invalidOrders.map((o) => o.order_number).join(', ')}`,
          data: null,
        });
      }

      // Kiểm tra phiếu đã gán vận đơn khác chưa
      const alreadyAssigned = orders.filter((o) => o.waybill_id);
      if (alreadyAssigned.length > 0) {
        throw new BadRequestException({
          status: 'error',
          message: `Các phiếu sau đã được gán vào vận đơn khác: ${alreadyAssigned.map((o) => o.order_number).join(', ')}`,
          data: null,
        });
      }

      // --- Bước 2: Validate Vehicle (nếu có) ---
      if (dto.vehicle_id) {
        const vehicle = await manager.findOne(Vehicle, {
          where: { id: dto.vehicle_id },
        });
        if (!vehicle) {
          throw new NotFoundException({
            status: 'error',
            message: `Không tìm thấy xe với ID: ${dto.vehicle_id}`,
            data: null,
          });
        }
      }

      // --- Bước 3: Sinh mã vận đơn tự động ---
      const waybillCode = dto.waybill_code || this.generateWaybillCode();

      // --- Bước 4: Tạo Waybill ---
      const waybill = manager.create(Waybill, {
        waybill_code: waybillCode,
        vehicle_id: dto.vehicle_id,
        cod_amount: dto.cod_amount,
        weight: dto.weight,
        shipping_fee: dto.shipping_fee,
        provider_id: dto.provider_id,
        driver_name: dto.driver_name,
        notes: dto.notes,
        status: WaybillStatus.DRAFT,
      });
      const savedWaybill = await manager.save(Waybill, waybill);

      // --- Bước 5: Gán OutboundOrders vào Waybill → chuyển trạng thái SHIPPED ---
      for (const order of orders) {
        order.waybill_id = savedWaybill.id;
        order.status = OutboundStatus.SHIPPED;
      }
      await manager.save(OutboundOrder, orders);

      return {
        status: 'success',
        message: `Tạo vận đơn ${waybillCode} thành công với ${orders.length} phiếu xuất kho`,
        data: {
          ...savedWaybill,
          outbound_orders: orders.map((o) => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status,
          })),
        },
      };
    });
  }

  // === 2. DANH SÁCH VẬN ĐƠN ===
  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const waybills = await this.waybillRepo.find({
      where,
      relations: ['vehicle', 'outbound_orders'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${waybills.length} vận đơn`,
      data: waybills,
    };
  }

  // === 3. CHI TIẾT VẬN ĐƠN ===
  async findOne(id: string) {
    const waybill = await this.waybillRepo.findOne({
      where: { id },
      relations: ['vehicle', 'outbound_orders', 'outbound_orders.lines'],
    });

    if (!waybill) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy vận đơn với ID: ${id}`,
        data: null,
      });
    }

    return { status: 'success', message: 'OK', data: waybill };
  }

  // === 4. CẬP NHẬT VẬN ĐƠN ===
  async updateWaybill(id: string, dto: UpdateWaybillDto) {
    const waybill = await this.waybillRepo.findOne({ where: { id } });
    if (!waybill) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy vận đơn với ID: ${id}`,
        data: null,
      });
    }

    if (
      waybill.status === WaybillStatus.DELIVERED ||
      waybill.status === WaybillStatus.CANCELED
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Vận đơn đang ở trạng thái ${waybill.status}, không thể cập nhật`,
        data: null,
      });
    }

    if (dto.status) waybill.status = dto.status;
    if (dto.cod_status) waybill.cod_status = dto.cod_status;
    if (dto.driver_name) waybill.driver_name = dto.driver_name;
    if (dto.notes !== undefined) waybill.notes = dto.notes;

    const saved = await this.waybillRepo.save(waybill);
    return {
      status: 'success',
      message: `Cập nhật vận đơn ${waybill.waybill_code} thành công`,
      data: saved,
    };
  }

  // === 5. XÁC NHẬN GIAO HÀNG (completeDelivery) — Transaction ACID ===
  //
  // Luồng nghiệp vụ Dock-to-Door:
  //   TMS xác nhận vận đơn đã giao thành công (POD)
  //   → Waybill chuyển sang DELIVERED
  //   → Tất cả OutboundOrder liên kết chuyển sang DELIVERED
  //
  async completeDelivery(id: string) {
    return this.dataSource.transaction(async (manager) => {
      // --- Bước 1: Validate Waybill tồn tại và đang IN_TRANSIT ---
      const waybill = await manager.findOne(Waybill, {
        where: { id },
        relations: ['outbound_orders'],
      });

      if (!waybill) {
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy vận đơn với ID: ${id}`,
          data: null,
        });
      }

      if (waybill.status !== WaybillStatus.IN_TRANSIT) {
        throw new BadRequestException({
          status: 'error',
          message: `Vận đơn đang ở trạng thái ${waybill.status}. Chỉ có thể xác nhận giao khi trạng thái là IN_TRANSIT`,
          data: null,
        });
      }

      // --- Bước 2: Chuyển Waybill → DELIVERED ---
      waybill.status = WaybillStatus.DELIVERED;
      await manager.save(Waybill, waybill);

      // --- Bước 3: Chuyển tất cả OutboundOrder → DELIVERED ---
      const updatedOrders: {
        id: string;
        order_number: string;
        status: string;
      }[] = [];
      for (const order of waybill.outbound_orders) {
        order.status = OutboundStatus.DELIVERED;
        await manager.save(OutboundOrder, order);
        updatedOrders.push({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
        });
      }

      return {
        status: 'success',
        message: `Vận đơn ${waybill.waybill_code} đã giao thành công. ${updatedOrders.length} phiếu xuất kho được cập nhật DELIVERED`,
        data: {
          waybill: {
            id: waybill.id,
            waybill_code: waybill.waybill_code,
            status: waybill.status,
          },
          outbound_orders: updatedOrders,
        },
      };
    });
  }

  // === 6. LẤY DANH SÁCH PHIẾU XUẤT SẴN SÀNG GOM VÀO VẬN ĐƠN ===
  async getPendingOutboundOrders() {
    const orders = await this.outboundOrderRepo.find({
      where: [
        { status: OutboundStatus.PICKED, waybill_id: undefined },
        { status: OutboundStatus.PACKED, waybill_id: undefined },
      ],
      order: { created_at: 'DESC' },
    });

    // Lọc thêm lần nữa (TypeORM xử lý null/undefined khác nhau tùy driver)
    const available = orders.filter((o) => !o.waybill_id);

    return {
      status: 'success',
      message: `Tìm thấy ${available.length} phiếu xuất sẵn sàng giao`,
      data: available,
    };
  }

  // --- Helper: Sinh mã vận đơn tự động ---
  private generateWaybillCode(): string {
    const today = new Date();
    const prefix = `WB-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  }
}
