import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

// ── Types ──

export interface ExcelColumnDef {
  header: string; // Tên hiển thị trên header
  key: string; // Key trong object JSON
  width?: number; // Độ rộng cột (mặc định 18)
  type?: 'string' | 'number' | 'date';
}

export interface ExcelExportOptions {
  sheetName?: string;
  columns: ExcelColumnDef[];
  data: Record<string, unknown>[];
  title?: string; // Tiêu đề in ở dòng 1 (optional)
}

export interface ExcelImportOptions {
  columns: ExcelColumnDef[];
  requiredKeys?: string[]; // Keys bắt buộc
  validators?: Record<string, ExcelFieldValidator>; // Custom validation per field
}

export interface ExcelFieldValidator {
  validate: (value: unknown, rowIndex: number) => string | null; // null = OK, string = error message
}

export interface ExcelImportError {
  row: number;
  field: string;
  message: string;
}

export interface ExcelImportResult<T = Record<string, unknown>> {
  data: T[];
  errors: ExcelImportError[];
  totalRows: number;
  successRows: number;
  errorRows: number;
}

// ── Styling constants ──

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2937' }, // gray-800
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' }, // white
  size: 11,
  name: 'Calibri',
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FF374151' } },
};

const TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 14,
  name: 'Calibri',
  color: { argb: 'FF1F2937' },
};

@Injectable()
export class ExcelService {
  /**
   * Export: Tạo file Excel từ mảng JSON → trả về Buffer.
   * Header được format: Bold, nền đen, chữ trắng.
   */
  async exportToExcel(options: ExcelExportOptions): Promise<Buffer> {
    const { sheetName = 'Data', columns, data, title } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SH-GROUP ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);

    let headerRowIndex = 1;

    // Dòng tiêu đề (optional)
    if (title) {
      const titleRow = sheet.getRow(1);
      titleRow.getCell(1).value = title;
      titleRow.getCell(1).font = TITLE_FONT;
      sheet.mergeCells(1, 1, 1, columns.length);
      headerRowIndex = 3; // Cách 1 dòng trống
    }

    // Thiết lập cột
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 18,
    }));

    // Nếu có title → phải set header thủ công vì sheet.columns đặt ở row 1
    if (title) {
      const headerRow = sheet.getRow(headerRowIndex);
      columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.border = HEADER_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 28;

      // Clear auto-generated header ở row 1 (nếu bị ghi đè)
      // Thêm data từ row sau header
      for (const item of data) {
        const row = sheet.addRow({});
        columns.forEach((col, idx) => {
          row.getCell(idx + 1).value =
            (item[col.key] as ExcelJS.CellValue) ?? '';
        });
      }
    } else {
      // Không có title → dùng pattern chuẩn
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.border = HEADER_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 28;

      // Thêm data
      for (const item of data) {
        sheet.addRow(
          columns.reduce(
            (obj, col) => {
              obj[col.key] = (item[col.key] as ExcelJS.CellValue) ?? '';
              return obj;
            },
            {} as Record<string, ExcelJS.CellValue>,
          ),
        );
      }
    }

    // Auto-filter trên header
    if (data.length > 0 || title) {
      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: columns.length },
      };
    }

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: title ? headerRowIndex : 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export file mẫu (Template): Chỉ có header, không có data.
   * Thêm dòng ví dụ để người dùng dễ hiểu format.
   */
  async exportTemplate(options: {
    sheetName?: string;
    columns: ExcelColumnDef[];
    sampleRow?: Record<string, unknown>;
  }): Promise<Buffer> {
    const data = options.sampleRow ? [options.sampleRow] : [];
    return this.exportToExcel({
      sheetName: options.sheetName ?? 'Template',
      columns: options.columns,
      data,
      title: `Mẫu Import — ${options.sheetName ?? 'Data'}`,
    });
  }

  /**
   * Import: Parse file Excel → validate → trả về dữ liệu + lỗi.
   * Không tự lưu DB — caller quyết định logic persist.
   */
  async parseExcel<T = Record<string, unknown>>(
    fileBuffer: Buffer,
    options: ExcelImportOptions,
  ): Promise<ExcelImportResult<T>> {
    const { columns, requiredKeys = [], validators = {} } = options;

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await workbook.xlsx.load(fileBuffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      throw new BadRequestException({
        status: 'error',
        message: 'File Excel không có worksheet!',
        data: null,
      });
    }

    // Detect header row (tìm row đầu tiên có giá trị khớp column key/header)
    let headerRowIndex = 1;
    const headerRow = sheet.getRow(1);
    const firstCellVal = String(headerRow.getCell(1).value ?? '')
      .trim()
      .toLowerCase();
    const firstColKey = columns[0]?.key?.toLowerCase();
    const firstColHeader = columns[0]?.header?.toLowerCase();

    // Nếu row 1 không khớp column đầu tiên → có thể có title, thử row 2,3
    if (firstCellVal !== firstColKey && firstCellVal !== firstColHeader) {
      for (let r = 2; r <= 5; r++) {
        const testRow = sheet.getRow(r);
        const testVal = String(testRow.getCell(1).value ?? '')
          .trim()
          .toLowerCase();
        if (testVal === firstColKey || testVal === firstColHeader) {
          headerRowIndex = r;
          break;
        }
      }
    }

    // Build column index mapping từ header
    const colIndexMap = new Map<string, number>();
    const detectedHeader = sheet.getRow(headerRowIndex);
    detectedHeader.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? '')
        .trim()
        .toLowerCase();
      // Match bằng key hoặc header name
      const matchedCol = columns.find(
        (c) => c.key.toLowerCase() === val || c.header.toLowerCase() === val,
      );
      if (matchedCol) {
        colIndexMap.set(matchedCol.key, colNumber);
      }
    });

    // Fallback: nếu không detect được → dùng thứ tự columns
    if (colIndexMap.size === 0) {
      columns.forEach((col, idx) => colIndexMap.set(col.key, idx + 1));
    }

    const errors: ExcelImportError[] = [];
    const data: T[] = [];
    let totalRows = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return; // Skip header + title rows
      totalRows++;

      const record: Record<string, unknown> = {};
      let rowHasError = false;

      for (const col of columns) {
        const colIdx = colIndexMap.get(col.key);
        if (!colIdx) continue;

        let value: unknown = row.getCell(colIdx).value;

        // Xử lý richtext cells
        if (
          value &&
          typeof value === 'object' &&
          'richText' in (value as Record<string, unknown>)
        ) {
          value = (
            (value as Record<string, unknown>).richText as { text: string }[]
          )
            .map((r) => r.text)
            .join('');
        }

        // Type coercion
        if (col.type === 'number' && value != null) {
          value = Number(value) || 0;
        } else if (col.type === 'string') {
          value = value != null ? String(value).trim() : '';
        } else if (col.type === 'date' && value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (value != null) {
          value = String(value).trim();
        }

        record[col.key] = value || undefined;
      }

      // Required check
      for (const key of requiredKeys) {
        if (!record[key]) {
          const col = columns.find((c) => c.key === key);
          errors.push({
            row: rowNumber,
            field: key,
            message: `"${col?.header ?? key}" bắt buộc nhập`,
          });
          rowHasError = true;
        }
      }

      // Custom validators
      for (const [key, validator] of Object.entries(validators)) {
        const errMsg = validator.validate(record[key], rowNumber);
        if (errMsg) {
          errors.push({ row: rowNumber, field: key, message: errMsg });
          rowHasError = true;
        }
      }

      if (!rowHasError) {
        data.push(record as T);
      }
    });

    return {
      data,
      errors,
      totalRows,
      successRows: data.length,
      errorRows: totalRows - data.length,
    };
  }
}
