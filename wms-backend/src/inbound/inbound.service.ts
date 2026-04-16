import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { InboundReceipt } from './entities/inbound-receipt.entity';
import { InboundLine } from './entities/inbound-line.entity';
import { Location } from '../inventory/entities/location.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { InboundStatus, QcStatus } from './enums/inbound.enum';
import { LocationStatus } from '../inventory/enums/inventory.enum';
import { StockStatus } from '../inventory/enums/inventory.enum';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import { UpdateInboundStatusDto } from './dto/update-inbound-status.dto';
import { UpdateQcResultDto } from './dto/update-inbound-status.dto';
import { PutawayDto } from './dto/update-inbound-status.dto';

@Injectable()
export class InboundService {
  private readonly logger = new Logger(InboundService.name);

  constructor(
    @InjectRepository(InboundReceipt)
    private receiptRepo: Repository<InboundReceipt>,

    @InjectRepository(InboundLine)
    private lineRepo: Repository<InboundLine>,

    @InjectRepository(Location)
    private locationRepo: Repository<Location>,

    @InjectRepository(InventoryItem)
    private inventoryRepo: Repository<InventoryItem>,

    private dataSource: DataSource,
  ) {}

  // === 1. TẠO PHIẾU NHẬP KHO ===
  async create(dto: CreateInboundReceiptDto) {
    // Sinh mã phiếu tự động: IBR-YYMMDD-XXX
    const today = new Date();
    const prefix = `IBR-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.receiptRepo.count();
    const receipt_number = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    const receipt = this.receiptRepo.create({
      receipt_number,
      receipt_type: dto.receipt_type,
      po_id: dto.po_id,
      grn_id: dto.grn_id,
      warehouse_code: dto.warehouse_code,
      dock_number: dto.dock_number,
      received_by: dto.received_by,
      notes: dto.notes,
      lines: dto.lines.map((line) => ({
        product_id: line.product_id,
        expected_qty: line.expected_qty,
        received_qty: line.received_qty ?? 0,
        lot_number: line.lot_number,
        notes: line.notes,
      })),
    });

    const saved = await this.receiptRepo.save(receipt);
    return {
      status: 'success',
      message: `Tạo phiếu nhập kho ${receipt_number} thành công`,
      data: saved,
    };
  }

  // === 2. DANH SÁCH PHIẾU NHẬP KHO ===
  async findAll(status?: string) {
    const where: FindOptionsWhere<InboundReceipt> = {};
    if (
      status &&
      Object.values(InboundStatus).includes(status as InboundStatus)
    ) {
      where.status = status as InboundStatus;
    }

    const receipts = await this.receiptRepo.find({
      where,
      relations: ['lines'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${receipts.length} phiếu nhập kho`,
      data: receipts,
    };
  }

  // === 3. CHI TIẾT PHIẾU NHẬP KHO ===
  async findOne(id: string) {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: ['lines'],
    });

    if (!receipt) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy phiếu nhập kho với ID: ${id}`,
        data: null,
      });
    }

    return { status: 'success', message: 'OK', data: receipt };
  }

  // === 4. CẬP NHẬT TRẠNG THÁI PHIẾU (Chuyển bước luồng Dock-to-Stock) ===
  async updateStatus(id: string, dto: UpdateInboundStatusDto) {
    const receipt = await this.receiptRepo.findOne({ where: { id } });
    if (!receipt) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy phiếu nhập kho với ID: ${id}`,
        data: null,
      });
    }

    if (
      receipt.status === InboundStatus.COMPLETED ||
      receipt.status === InboundStatus.REJECTED
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Phiếu nhập kho đang ở trạng thái ${receipt.status}, không thể chuyển trạng thái`,
        data: null,
      });
    }

    receipt.status = dto.status;
    if (dto.notes) receipt.notes = dto.notes;

    const saved = await this.receiptRepo.save(receipt);
    return {
      status: 'success',
      message: `Đã chuyển trạng thái phiếu ${receipt.receipt_number} sang ${dto.status}`,
      data: saved,
    };
  }

  // === 5. CẬP NHẬT KẾT QUẢ QC CHO TỪNG DÒNG HÀNG ===
  async updateQcResult(lineId: string, dto: UpdateQcResultDto) {
    const line = await this.lineRepo.findOne({ where: { id: lineId } });
    if (!line) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy dòng hàng với ID: ${lineId}`,
        data: null,
      });
    }

    if (dto.accepted_qty + dto.rejected_qty > line.received_qty) {
      throw new BadRequestException({
        status: 'error',
        message: `Tổng SL đạt (${dto.accepted_qty}) + SL lỗi (${dto.rejected_qty}) không được vượt quá SL nhận (${line.received_qty})`,
        data: null,
      });
    }

    line.qc_status = dto.qc_status;
    line.accepted_qty = dto.accepted_qty;
    line.rejected_qty = dto.rejected_qty;
    if (dto.notes) line.notes = dto.notes;

    const saved = await this.lineRepo.save(line);
    return {
      status: 'success',
      message: `Cập nhật kết quả QC cho dòng hàng thành công`,
      data: saved,
    };
  }

  // === 6. PUTAWAY — Điểm giao thoa Inbound ↔ Inventory (Transaction ACID) ===
  //
  // Luồng nghiệp vụ:
  //   InboundLine (đã qua QC) → xác nhận vị trí kệ → tạo/cộng InventoryItem → cập nhật Location.current_qty
  //   → kiểm tra tất cả lines đã putaway chưa → nếu hết thì tự chuyển Receipt sang COMPLETED
  //
  async putaway(lineId: string, dto: PutawayDto) {
    this.logger.log(
      `Putaway bắt đầu: lineId=${lineId}, locationId=${dto.location_id}`,
    );
    return this.dataSource.transaction(async (manager) => {
      // --- Bước 1: Validate InboundLine tồn tại và đủ điều kiện Putaway ---
      const line = await manager.findOne(InboundLine, {
        where: { id: lineId },
        relations: ['inbound_receipt'],
      });

      if (!line) {
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy dòng hàng với ID: ${lineId}`,
          data: null,
        });
      }

      // Chặn putaway trùng lặp
      if (line.putaway_location) {
        throw new BadRequestException({
          status: 'error',
          message: `Dòng hàng này đã được Putaway vào vị trí ${line.putaway_location}. Không thể Putaway lại.`,
          data: null,
        });
      }

      // Chặn nếu chưa qua QC
      if (
        line.qc_status !== QcStatus.PASSED &&
        line.qc_status !== QcStatus.PARTIAL
      ) {
        throw new BadRequestException({
          status: 'error',
          message: `Dòng hàng chưa qua QC (trạng thái hiện tại: ${line.qc_status}). Không thể Putaway.`,
          data: null,
        });
      }

      // Số lượng sẽ được nhập kho = accepted_qty (đã đạt QC)
      const putawayQty = line.accepted_qty;
      if (putawayQty <= 0) {
        throw new BadRequestException({
          status: 'error',
          message: 'Số lượng đạt QC = 0, không có hàng để Putaway.',
          data: null,
        });
      }

      // --- Bước 2: Validate Location đích tồn tại và đang hoạt động ---
      const location = await manager.findOne(Location, {
        where: { id: dto.location_id },
      });

      if (!location) {
        throw new NotFoundException({
          status: 'error',
          message: `Không tìm thấy vị trí kệ với ID: ${dto.location_id}`,
          data: null,
        });
      }

      if (location.status !== LocationStatus.ACTIVE) {
        throw new BadRequestException({
          status: 'error',
          message: `Vị trí ${location.code} đang ở trạng thái ${location.status}, không thể nhận hàng.`,
          data: null,
        });
      }

      // Kiểm tra sức chứa (nếu max_capacity > 0 tức đã cấu hình giới hạn)
      if (
        location.max_capacity > 0 &&
        location.current_qty + putawayQty > location.max_capacity
      ) {
        throw new BadRequestException({
          status: 'error',
          message: `Vị trí ${location.code} không đủ sức chứa (hiện: ${location.current_qty}, tối đa: ${location.max_capacity}, cần thêm: ${putawayQty})`,
          data: null,
        });
      }

      // --- Bước 3: Cập nhật InboundLine — ghi nhận vị trí Putaway ---
      line.putaway_location = location.code;
      if (dto.notes) line.notes = dto.notes;
      await manager.save(InboundLine, line);

      // --- Bước 4: Tạo hoặc cộng dồn InventoryItem tại vị trí đích ---
      let inventoryItem = await manager.findOne(InventoryItem, {
        where: {
          product_id: line.product_id,
          location_id: location.id,
          lot_number: line.lot_number ?? undefined,
          status: StockStatus.AVAILABLE,
        },
      });

      if (inventoryItem) {
        // Cộng dồn vào bản ghi hiện có
        inventoryItem.qty_on_hand += putawayQty;
      } else {
        // Tạo bản ghi tồn kho mới
        inventoryItem = manager.create(InventoryItem, {
          product_id: line.product_id,
          location_id: location.id,
          qty_on_hand: putawayQty,
          lot_number: line.lot_number,
          warehouse_code: location.warehouse_code,
          inbound_receipt_id: line.inbound_receipt.id,
        });
      }

      await manager.save(InventoryItem, inventoryItem);

      // --- Bước 5: Cập nhật Location.current_qty ---
      location.current_qty += putawayQty;
      if (
        location.max_capacity > 0 &&
        location.current_qty >= location.max_capacity
      ) {
        location.status = LocationStatus.FULL;
      }
      await manager.save(Location, location);

      // --- Bước 6: Kiểm tra tất cả lines của phiếu → tự chuyển Receipt sang COMPLETED ---
      const receipt = line.inbound_receipt;
      const allLines = await manager.find(InboundLine, {
        where: { inbound_receipt: { id: receipt.id } },
      });

      const allPutaway = allLines.every((l) => l.putaway_location !== null);

      if (allPutaway) {
        receipt.status = InboundStatus.COMPLETED;
        await manager.save(InboundReceipt, receipt);
      } else if (receipt.status !== InboundStatus.PUTAWAY) {
        // Có ít nhất 1 dòng đã putaway → chuyển phiếu sang trạng thái PUTAWAY
        receipt.status = InboundStatus.PUTAWAY;
        await manager.save(InboundReceipt, receipt);
      }

      this.logger.log(
        `Putaway thành công: qty=${putawayQty}, location=${location.code}`,
      );
      return {
        status: 'success',
        message: `Putaway ${putawayQty} ${line.product_id} vào ${location.code} thành công.${allPutaway ? ' Phiếu nhập đã COMPLETED.' : ''}`,
        data: {
          inbound_line: {
            id: line.id,
            putaway_location: line.putaway_location,
            accepted_qty: putawayQty,
          },
          inventory: {
            id: inventoryItem.id,
            qty_on_hand: inventoryItem.qty_on_hand,
            location_code: location.code,
          },
          receipt_status: allPutaway
            ? InboundStatus.COMPLETED
            : InboundStatus.PUTAWAY,
        },
      };
    });
  }
}
