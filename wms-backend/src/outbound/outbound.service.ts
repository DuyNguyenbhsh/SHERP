import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboundOrder } from './entities/outbound-order.entity';
import { OutboundLine } from './entities/outbound-line.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Location } from '../inventory/entities/location.entity';
import { OutboundStatus, PickStatus } from './enums/outbound.enum';
import { StockStatus } from '../inventory/enums/inventory.enum';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { UpdateOutboundStatusDto, PickItemDto } from './dto/pick-item.dto';
import { ProjectBoqService } from '../projects/project-boq.service';

@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundOrder)
    private orderRepo: Repository<OutboundOrder>,

    @InjectRepository(OutboundLine)
    private lineRepo: Repository<OutboundLine>,

    private dataSource: DataSource,

    private boqService: ProjectBoqService,
  ) {}

  // === 1. TẠO PHIẾU XUẤT KHO ===
  async create(dto: CreateOutboundOrderDto) {
    const today = new Date();
    const prefix = `OB-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.orderRepo.count();
    const order_number = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    // ── BOQ Threshold Check: kiểm tra định mức khi xuất cho dự án ──
    const boqWarnings: string[] = [];
    if (dto.project_id) {
      for (const line of dto.lines) {
        const check = await this.boqService.checkBoqThreshold(
          dto.project_id,
          line.product_id,
          line.requested_qty,
        );
        if (check.exceeded) {
          boqWarnings.push(
            `Sản phẩm ${line.product_id}: vượt định mức BOQ (còn lại: ${check.remaining}, yêu cầu: ${line.requested_qty})`,
          );
        }
      }

      // Chặn giao dịch nếu vượt mức
      if (boqWarnings.length > 0) {
        throw new BadRequestException({
          status: 'error',
          message: 'Vượt định mức BOQ! Không thể tạo phiếu xuất.',
          data: { warnings: boqWarnings },
        });
      }
    }

    const order = this.orderRepo.create({
      order_number,
      order_type: dto.order_type,
      customer_name: dto.customer_name,
      customer_phone: dto.customer_phone,
      delivery_address: dto.delivery_address,
      reference_code: dto.reference_code,
      warehouse_code: dto.warehouse_code,
      required_date: dto.required_date
        ? new Date(dto.required_date)
        : undefined,
      assigned_to: dto.assigned_to,
      total_weight: dto.total_weight,
      notes: dto.notes,
      project_id: dto.project_id,
      wbs_id: dto.wbs_id,
      lines: dto.lines.map((line) => ({
        product_id: line.product_id,
        requested_qty: line.requested_qty,
        lot_number: line.lot_number,
        notes: line.notes,
      })),
    });

    const saved = await this.orderRepo.save(order);
    return {
      status: 'success',
      message: `Tạo phiếu xuất kho ${order_number} thành công`,
      data: saved,
    };
  }

  // === 2. DANH SÁCH PHIẾU XUẤT KHO ===
  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const orders = await this.orderRepo.find({
      where,
      relations: ['lines'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${orders.length} phiếu xuất kho`,
      data: orders,
    };
  }

  // === 3. CHI TIẾT PHIẾU XUẤT KHO ===
  async findOne(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });

    if (!order) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy phiếu xuất kho với ID: ${id}`,
        data: null,
      });
    }

    return { status: 'success', message: 'OK', data: order };
  }

  // === 4. CẬP NHẬT TRẠNG THÁI PHIẾU XUẤT ===
  async updateStatus(id: string, dto: UpdateOutboundStatusDto) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy phiếu xuất kho với ID: ${id}`,
        data: null,
      });
    }

    if (
      order.status === OutboundStatus.SHIPPED ||
      order.status === OutboundStatus.CANCELED
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Phiếu xuất đang ở trạng thái ${order.status}, không thể chuyển trạng thái`,
        data: null,
      });
    }

    order.status = dto.status;
    if (dto.notes) order.notes = dto.notes;

    const saved = await this.orderRepo.save(order);
    return {
      status: 'success',
      message: `Chuyển trạng thái phiếu ${order.order_number} sang ${dto.status}`,
      data: saved,
    };
  }

  // === 5. PICK ITEM — Điểm giao thoa Outbound ↔ Inventory (Transaction ACID) ===
  //
  // Luồng nghiệp vụ:
  //   Picker quét barcode vị trí kệ + sản phẩm → xác nhận số lượng lấy
  //   → trừ tồn kho InventoryItem → cập nhật Location.current_qty
  //   → ghi nhận picked_qty trên OutboundLine
  //   → kiểm tra tất cả lines đã pick xong → tự chuyển Order sang PICKED
  //
  async pickItem(lineId: string, dto: PickItemDto) {
    return this.dataSource.transaction(async (manager) => {
      // --- Bước 1: Validate OutboundLine tồn tại và chưa pick đủ ---
      const line = await manager.findOne(OutboundLine, {
        where: { id: lineId },
        relations: ['outbound_order'],
      });

      if (!line) {
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy dòng hàng xuất với ID: ${lineId}`,
          data: null,
        });
      }

      if (line.pick_status === PickStatus.PICKED) {
        throw new BadRequestException({
          status: 'error',
          message: `Dòng hàng đã được Pick đủ (${line.picked_qty}/${line.requested_qty}). Không thể Pick thêm.`,
          data: null,
        });
      }

      // Kiểm tra số lượng pick không vượt quá yêu cầu còn lại
      const remainingQty = line.requested_qty - line.picked_qty;
      if (dto.pick_qty > remainingQty) {
        throw new BadRequestException({
          status: 'error',
          message: `Số lượng Pick (${dto.pick_qty}) vượt quá số lượng còn lại cần lấy (${remainingQty})`,
          data: null,
        });
      }

      // --- Bước 2: Tìm InventoryItem tại vị trí được chỉ định ---
      const inventoryItem = await manager.findOne(InventoryItem, {
        where: {
          product_id: line.product_id,
          location_id: dto.location_id,
          lot_number: dto.lot_number ?? line.lot_number ?? undefined,
          status: StockStatus.AVAILABLE,
        },
      });

      if (!inventoryItem) {
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy tồn kho sản phẩm ${line.product_id} tại vị trí ${dto.location_id}`,
          data: null,
        });
      }

      // --- Bước 3: Kiểm tra tồn kho đủ không ---
      const availableQty =
        inventoryItem.qty_on_hand - inventoryItem.qty_reserved;
      if (availableQty < dto.pick_qty) {
        throw new BadRequestException({
          status: 'error',
          message: `Tồn kho khả dụng không đủ (khả dụng: ${availableQty}, yêu cầu: ${dto.pick_qty}). on_hand=${inventoryItem.qty_on_hand}, reserved=${inventoryItem.qty_reserved}`,
          data: null,
        });
      }

      // --- Bước 4: Trừ tồn kho ---
      inventoryItem.qty_on_hand -= dto.pick_qty;
      await manager.save(InventoryItem, inventoryItem);

      // --- Bước 5: Cập nhật Location.current_qty ---
      const location = await manager.findOne(Location, {
        where: { id: dto.location_id },
      });
      if (location) {
        location.current_qty = Math.max(0, location.current_qty - dto.pick_qty);
        await manager.save(Location, location);
      }

      // --- Bước 6: Cập nhật OutboundLine ---
      line.picked_qty += dto.pick_qty;
      line.pick_location_id = dto.location_id;
      if (dto.notes) line.notes = dto.notes;

      // Xác định pick_status
      if (line.picked_qty >= line.requested_qty) {
        line.pick_status = PickStatus.PICKED;
      } else {
        line.pick_status = PickStatus.PARTIAL;
      }

      await manager.save(OutboundLine, line);

      // --- Bước 7: Kiểm tra tất cả lines → tự chuyển Order sang PICKED ---
      const order = line.outbound_order;
      const allLines = await manager.find(OutboundLine, {
        where: { outbound_order: { id: order.id } },
      });

      const allPicked = allLines.every(
        (l) => l.pick_status === PickStatus.PICKED,
      );

      if (allPicked) {
        order.status = OutboundStatus.PICKED;
        await manager.save(OutboundOrder, order);
      } else if (order.status !== OutboundStatus.PICKING) {
        // Có ít nhất 1 dòng đang pick → chuyển sang PICKING
        order.status = OutboundStatus.PICKING;
        await manager.save(OutboundOrder, order);
      }

      return {
        status: 'success',
        message: `Pick ${dto.pick_qty} sản phẩm từ vị trí thành công.${allPicked ? ' Phiếu xuất đã PICKED hoàn tất.' : ''}`,
        data: {
          outbound_line: {
            id: line.id,
            picked_qty: line.picked_qty,
            requested_qty: line.requested_qty,
            pick_status: line.pick_status,
          },
          inventory: {
            id: inventoryItem.id,
            qty_on_hand: inventoryItem.qty_on_hand,
            location_id: dto.location_id,
          },
          order_status: allPicked
            ? OutboundStatus.PICKED
            : OutboundStatus.PICKING,
        },
      };
    });
  }
}
