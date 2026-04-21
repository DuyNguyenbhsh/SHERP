import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { MasterPlan } from './entities/master-plan.entity';
import { AnnualGridResponse, AnnualGridService } from './annual-grid.service';

/**
 * Render Annual Grid ra XLSX khớp format template O&M (SA §15.6).
 * Layout:
 *   Row 1-3: Title merge
 *   Row 4:   Header (STT | HỆ THỐNG | HẠNG MỤC | CÔNG VIỆC | THỰC HIỆN | TẦN SUẤT | W1-W53 | GHI CHÚ)
 *   Row 5-N: Data
 *   Row N+1: Sign-off "Ngày {prepared_at}, {location_label} — Người lập: ..."
 */
@Injectable()
export class ExportXlsxService {
  constructor(
    @InjectRepository(MasterPlan)
    private readonly plansRepo: Repository<MasterPlan>,
    private readonly gridService: AnnualGridService,
  ) {}

  async export(
    planId: string,
    year: number,
  ): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    const plan = await this.plansRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Không tìm thấy plan ${planId}`);

    const grid = await this.gridService.build(planId, year);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SHERP Master Plan';
    wb.created = new Date();

    const ws = wb.addWorksheet(`KH ${year}`, {
      pageSetup: {
        paperSize: 8 as ExcelJS.PaperSize, // A3 landscape
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        showGridLines: true,
      },
      views: [{ state: 'frozen', xSplit: 6, ySplit: 4 }],
    });

    const totalWeeks = grid.weeks.length;
    const weekStartCol = 7; // cột G bắt đầu tuần
    const noteCol = weekStartCol + totalWeeks;

    // ── Title row 1-3 ─────────────────────────────────────
    ws.mergeCells(1, 1, 1, noteCol);
    const title = ws.getCell(1, 1);
    title.value = `KẾ HOẠCH VẬN HÀNH BẢO TRÌ — OPERATION & MAINTENANCE PLAN`;
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(2, 1, 2, noteCol);
    const subtitle = ws.getCell(2, 1);
    subtitle.value = `Năm / Year: ${year} — Dự án: ${plan.name} (${plan.code})`;
    subtitle.font = { size: 11, italic: true };
    subtitle.alignment = { horizontal: 'center' };

    // Row 3 spacer (tuỳ nhu cầu merge để tăng chiều cao)
    ws.getRow(3).height = 6;

    // ── Header row 4 ──────────────────────────────────────
    const header = ws.getRow(4);
    const headers = [
      'STT',
      'HỆ THỐNG / SYSTEM',
      'HẠNG MỤC / ITEMS',
      'CÔNG VIỆC / WORK PERFORMED',
      'THỰC HIỆN / EXECUTOR',
      'TẦN SUẤT / FREQ',
    ];
    headers.forEach((h, idx) => (header.getCell(idx + 1).value = h));
    for (let w = 1; w <= totalWeeks; w++) {
      header.getCell(weekStartCol + w - 1).value = `W${w}`;
    }
    header.getCell(noteCol).value = 'GHI CHÚ / NOTES';
    header.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7EFFA' },
      };
      c.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    header.height = 32;

    // Cột width
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 22;
    ws.getColumn(3).width = 22;
    ws.getColumn(4).width = 40;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 8;
    for (let w = 0; w < totalWeeks; w++) {
      ws.getColumn(weekStartCol + w).width = 4;
    }
    ws.getColumn(noteCol).width = 28;

    // ── Data rows ─────────────────────────────────────────
    grid.rows.forEach((row, idx) => {
      const r = ws.getRow(5 + idx);
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = row.system
        ? `${row.system.name_vi}${row.system.name_en ? ' / ' + row.system.name_en : ''}`
        : '';
      r.getCell(3).value = row.equipment_item
        ? `${row.equipment_item.name_vi}${row.equipment_item.name_en ? ' / ' + row.equipment_item.name_en : ''}`
        : '';
      r.getCell(4).value = row.task_name_en
        ? `${row.task_name_vi}\n${row.task_name_en}`
        : row.task_name_vi;
      r.getCell(5).value = row.contractor_name
        ? `${row.executor_party} — ${row.contractor_name}`
        : row.executor_party;
      r.getCell(6).value = row.freq_code ?? '';

      row.cells.forEach((cell) => {
        const c = r.getCell(weekStartCol + cell.iso_week - 1);
        if (cell.planned) {
          c.value = row.freq_code ?? '✓';
          c.font = { bold: true };
          c.alignment = { horizontal: 'center' };
        }
        // Tô màu theo actual_status
        const fillColor = ACTUAL_STATUS_COLORS[cell.actual_status];
        if (fillColor) {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor },
          };
        }
      });

      r.getCell(noteCol).value = row.regulatory_refs.join('\n');
      r.eachCell({ includeEmpty: true }, (c) => {
        c.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        if (!c.alignment) c.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // ── Sign-off row ──────────────────────────────────────
    const signRow = 5 + grid.rows.length + 1;
    ws.mergeCells(signRow, 1, signRow, noteCol);
    const signCell = ws.getCell(signRow, 1);
    const loc = plan.location_label ?? '';
    const preparedAt = plan.prepared_at ?? '';
    signCell.value = `Ngày ${preparedAt}${loc ? ', ' + loc : ''} — Người lập: ${plan.prepared_by_id ?? '—'}`;
    signCell.alignment = { horizontal: 'right', vertical: 'middle' };
    signCell.font = { italic: true };

    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const filename = `MasterPlan_${plan.code}_${year}.xlsx`;
    return { buffer, filename };
  }
}

const ACTUAL_STATUS_COLORS: Record<string, string | null> = {
  NONE: null,
  ON_TIME: 'FFD4EDDA', // xanh nhạt
  LATE: 'FFFFE8A1', // vàng
  MISSED: 'FFF8D7DA', // đỏ nhạt
  UPCOMING: 'FFE9ECEF', // xám
};
