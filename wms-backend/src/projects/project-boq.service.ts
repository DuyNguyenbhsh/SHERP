import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectBoqItem } from './entities/project-boq-item.entity';
import { ProjectBoqImport } from './entities/project-boq-import.entity';
import { Project } from './entities/project.entity';
import { CreateBoqItemDto } from './dto/create-boq-item.dto';
import * as ExcelJS from 'exceljs';
import { checkBoqThreshold as checkThreshold } from './domain/logic';

@Injectable()
export class ProjectBoqService {
  constructor(
    @InjectRepository(ProjectBoqItem)
    private boqRepo: Repository<ProjectBoqItem>,
    @InjectRepository(ProjectBoqImport)
    private importRepo: Repository<ProjectBoqImport>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private dataSource: DataSource,
  ) {}

  async findItems(projectId: string, wbsId?: string) {
    const where: any = { project_id: projectId };
    if (wbsId) where.wbs_id = wbsId;

    const items = await this.boqRepo.find({
      where,
      relations: ['wbs', 'category'],
      order: { sort_order: 'ASC', item_code: 'ASC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${items.length} hạng mục BOQ`,
      data: items,
    };
  }

  async createItem(projectId: string, dto: CreateBoqItemDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    const item = this.boqRepo.create({
      project_id: projectId,
      wbs_id: dto.wbs_id,
      item_code: dto.item_code,
      item_name: dto.item_name,
      unit: dto.unit,
      quantity: dto.quantity,
      unit_price: dto.unit_price,
      total_price: dto.quantity * dto.unit_price,
      product_id: dto.product_id,
      category_id: dto.category_id,
      notes: dto.notes,
    });

    const saved = await this.boqRepo.save(item);
    return {
      status: 'success',
      message: `Tạo hạng mục BOQ "${saved.item_code}" thành công`,
      data: saved,
    };
  }

  async removeItem(boqId: string) {
    const item = await this.boqRepo.findOne({ where: { id: boqId } });
    if (!item)
      throw new NotFoundException({
        status: 'error',
        message: 'Hạng mục BOQ không tồn tại!',
        data: null,
      });
    await this.boqRepo.delete(boqId);
    return {
      status: 'success',
      message: `Xóa hạng mục "${item.item_code}" thành công`,
      data: null,
    };
  }

  // ── Import Excel BOQ ──
  async importFromExcel(
    projectId: string,
    file: Express.Multer.File,
    importedBy?: string,
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await workbook.xlsx.load(file.buffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet)
      throw new BadRequestException({
        status: 'error',
        message: 'File Excel không có worksheet!',
        data: null,
      });

    const errors: { row: number; field: string; message: string }[] = [];
    const items: Partial<ProjectBoqItem>[] = [];
    let totalRows = 0;

    // Đọc từ dòng 2 (dòng 1 = header)
    // Expected columns: A=item_code, B=item_name, C=unit, D=quantity, E=unit_price, F=wbs_code, G=notes
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      totalRows++;

      const itemCode = String(row.getCell(1).value ?? '').trim();
      const itemName = String(row.getCell(2).value ?? '').trim();
      const unit = String(row.getCell(3).value ?? '').trim();
      const quantity = Number(row.getCell(4).value) || 0;
      const unitPrice = Number(row.getCell(5).value) || 0;
      const notes = String(row.getCell(7).value ?? '').trim() || undefined;

      if (!itemCode) {
        errors.push({
          row: rowNumber,
          field: 'item_code',
          message: 'Mã hạng mục bắt buộc',
        });
        return;
      }
      if (!itemName) {
        errors.push({
          row: rowNumber,
          field: 'item_name',
          message: 'Tên hạng mục bắt buộc',
        });
        return;
      }
      if (!unit) {
        errors.push({
          row: rowNumber,
          field: 'unit',
          message: 'Đơn vị bắt buộc',
        });
        return;
      }

      items.push({
        project_id: projectId,
        item_code: itemCode,
        item_name: itemName,
        unit,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
        notes,
        sort_order: totalRows,
      });
    });

    // Bulk upsert trong transaction
    let successRows = 0;
    await this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        try {
          const existing = await manager.findOne(ProjectBoqItem, {
            where: { project_id: projectId, item_code: item.item_code },
          });

          if (existing) {
            Object.assign(existing, item);
            await manager.save(ProjectBoqItem, existing);
          } else {
            await manager.save(
              ProjectBoqItem,
              manager.create(ProjectBoqItem, item),
            );
          }
          successRows++;
        } catch (err: any) {
          errors.push({
            row: item.sort_order ?? 0,
            field: 'general',
            message: err.message,
          });
        }
      }
    });

    // Lưu audit trail
    const importRecord = this.importRepo.create({
      project_id: projectId,
      file_name: file.originalname,
      total_rows: totalRows,
      success_rows: successRows,
      error_rows: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      imported_by: importedBy,
    });
    await this.importRepo.save(importRecord);

    return {
      status: 'success',
      message: `Import BOQ: ${successRows}/${totalRows} dòng thành công${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`,
      data: importRecord,
    };
  }

  async findImportHistory(projectId: string) {
    const records = await this.importRepo.find({
      where: { project_id: projectId },
      order: { imported_at: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${records.length} lần import`,
      data: records,
    };
  }

  // ── Kiểm tra định mức BOQ khi xuất kho ──
  async checkBoqThreshold(
    projectId: string,
    productId: string,
    requestedQty: number,
  ): Promise<{
    exceeded: boolean;
    boqItem: ProjectBoqItem | null;
    remaining: number;
  }> {
    const boqItem = await this.boqRepo.findOne({
      where: { project_id: projectId, product_id: productId },
    });

    if (!boqItem) return { exceeded: false, boqItem: null, remaining: 0 };

    // Domain logic: kiểm tra ngưỡng
    const result = checkThreshold(
      {
        quantity: Number(boqItem.quantity),
        issued_qty: Number(boqItem.issued_qty),
      },
      requestedQty,
    );

    return { exceeded: result.exceeded, boqItem, remaining: result.remaining };
  }

  // ── Cập nhật issued_qty sau khi xuất kho thành công ──
  async incrementIssuedQty(
    projectId: string,
    productId: string,
    qty: number,
  ): Promise<void> {
    const boqItem = await this.boqRepo.findOne({
      where: { project_id: projectId, product_id: productId },
    });
    if (boqItem) {
      boqItem.issued_qty = Number(boqItem.issued_qty) + qty;
      await this.boqRepo.save(boqItem);
    }
  }
}
