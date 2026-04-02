import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { SerialNumber } from './entities/serial-number.entity';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PoStatus, SerialStatus } from './enums/procurement.enum';

@Injectable()
export class ProcurementService {
  constructor(
    // DataSource để quản lý Transaction toàn vẹn dữ liệu
    private readonly dataSource: DataSource,
    // Chỉ inject repo nào dùng ngoài transaction
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
  ) {}

  // ── 1. TẠO PO (Của bộ phận Mua hàng) ─────────────────────────────────────
  async createPO(dto: CreatePoDto) {
    const poNumber = `PO-${new Date().getTime()}`;

    let totalAmount = 0;
    const lines = dto.lines.map((line) => {
      totalAmount += line.order_qty * line.unit_price;
      const poLine = new PurchaseOrderLine();
      poLine.product_id = line.product_id;
      poLine.order_qty = line.order_qty;
      poLine.unit_price = line.unit_price;
      return poLine;
    });

    const newPo = this.poRepo.create({
      po_number: poNumber,
      vendor_id: dto.vendor_id,
      // Giả lập PO đã được Giám đốc duyệt để kho nhập luôn (không cần bước Approve riêng)
      status: PoStatus.APPROVED,
      total_amount: totalAmount,
      lines,
    });

    const savedPo = await this.poRepo.save(newPo);
    return { message: 'Tạo Đơn đặt hàng (PO) thành công', data: savedPo };
  }

  // ── 2. LẤY DANH SÁCH PO ───────────────────────────────────────────────────
  async getAllPOs() {
    const pos = await this.poRepo.find({
      relations: ['lines'],
      order: { created_at: 'DESC' },
    });
    return { message: 'Thành công', data: pos };
  }

  // ── 3. NHẬP KHO (Của Thủ kho) ────────────────────────────────────────────
  // TD-07: Toàn bộ luồng được bọc trong 1 TypeORM Transaction.
  //         Nếu bất kỳ bước nào lỗi -> tự động rollback toàn bộ, không để
  //         dữ liệu bị hỏng nửa chừng (VD: PO đã COMPLETED nhưng Serial chưa lưu).
  // TD-08: poLines được gom lại và batch-save 1 lần thay vì N lần trong vòng lặp.
  async receiveGoods(dto: ReceiveGoodsDto) {
    return await this.dataSource.transaction(async (manager) => {
      // ── Bước 1: Tìm PO và validate ──
      const po = await manager.findOne(PurchaseOrder, {
        where: { id: dto.po_id },
        relations: ['lines'],
      });
      if (!po) throw new NotFoundException('Không tìm thấy Đơn đặt hàng (PO)!');
      if (po.status === PoStatus.COMPLETED) {
        throw new BadRequestException(
          'PO này đã nhập đủ hàng, không thể nhập thêm!',
        );
      }
      if (po.status === PoStatus.CANCELED) {
        throw new BadRequestException('PO này đã bị hủy, không thể nhập kho!');
      }

      // ── Bước 2: Duyệt qua các dòng hàng, chuẩn bị dữ liệu ──
      const modifiedPoLines: PurchaseOrderLine[] = []; // Gom lại để batch-save
      const grnLines: GoodsReceiptLine[] = [];
      const serialEntities: SerialNumber[] = [];
      let allFullyReceived = true;

      for (const item of dto.lines) {
        const poLine = po.lines.find((l) => l.id === item.po_line_id);
        // Bỏ qua dòng không khớp thay vì crash toàn bộ request
        if (!poLine) continue;

        poLine.received_qty += item.received_qty;
        modifiedPoLines.push(poLine); // Thu thập, chưa lưu

        if (poLine.received_qty < poLine.order_qty) {
          allFullyReceived = false;
        }

        // Tạo dòng chi tiết GRN (cascade save theo GRN)
        const grnLine = manager.create(GoodsReceiptLine, {
          po_line_id: item.po_line_id,
          received_qty: item.received_qty,
        });
        grnLines.push(grnLine);

        // Chuẩn bị Serial Numbers (nếu mặt hàng bật is_serial_tracking)
        for (const sn of item.serial_numbers) {
          serialEntities.push(
            manager.create(SerialNumber, {
              serial_no: sn,
              product_id: poLine.product_id,
              status: SerialStatus.IN_STOCK,
            }),
          );
        }
      }

      // ── Bước 3: Batch-save tất cả PO Lines (1 query thay vì N queries) ──
      if (modifiedPoLines.length > 0) {
        await manager.save(PurchaseOrderLine, modifiedPoLines);
      }

      // ── Bước 4: Cập nhật trạng thái PO ──
      po.status = allFullyReceived ? PoStatus.COMPLETED : PoStatus.RECEIVING;
      await manager.save(PurchaseOrder, po);

      // ── Bước 5: Lưu Phiếu Nhập Kho (GRN) — cascade sẽ tự lưu GrnLines ──
      const savedGrn = await manager.save(
        manager.create(GoodsReceiptNote, {
          grn_number: `GRN-${new Date().getTime()}`,
          po: po,
          received_by: dto.received_by,
          lines: grnLines,
        }),
      );

      // ── Bước 6: Gắn grn_id vào Serials rồi batch-save ──
      if (serialEntities.length > 0) {
        serialEntities.forEach((s) => (s.grn_id = savedGrn.id));
        await manager.save(SerialNumber, serialEntities);
      }

      return {
        message: `Nhập kho thành công! Phiếu ${savedGrn.grn_number} đã được tạo.`,
        data: savedGrn,
      };
    });
  }
}
