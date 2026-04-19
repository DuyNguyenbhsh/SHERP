import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  WidthType,
} from 'docx';
import { IncidentsService } from './incidents.service';
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
} from './incident-labels';
import { PhotoCategory } from '../checklists/enums/checklist.enum';

@Injectable()
export class IncidentExportService {
  constructor(private readonly incidents: IncidentsService) {}

  /**
   * Xuất báo cáo .docx cho 1 incident (BR-INC-06).
   * Gồm: info block, timeline comments, ảnh before/after (download + embed).
   * Returns: Buffer + filename.
   */
  async exportToDocx(
    incidentId: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const inc = await this.incidents.findOne(incidentId);
    if (!inc) throw new NotFoundException('Không tìm thấy sự cố');

    const children: (Paragraph | Table)[] = [];

    children.push(
      new Paragraph({
        text: `BÁO CÁO SỰ CỐ - ${inc.incident_code}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: '' }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Tiêu đề: ', bold: true }),
          new TextRun(inc.title),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Mức độ: ', bold: true }),
          new TextRun(INCIDENT_SEVERITY_LABELS[inc.severity] ?? inc.severity),
          new TextRun({ text: '   ·   Loại: ', bold: true }),
          new TextRun(INCIDENT_CATEGORY_LABELS[inc.category] ?? inc.category),
          new TextRun({ text: '   ·   Trạng thái: ', bold: true }),
          new TextRun(INCIDENT_STATUS_LABELS[inc.status] ?? inc.status),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Vị trí: ', bold: true }),
          new TextRun(inc.location_text ?? '—'),
          new TextRun({ text: '   ·   Thiết bị: ', bold: true }),
          new TextRun(inc.related_asset ?? '—'),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Project: ', bold: true }),
          new TextRun(inc.project_id),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Người báo: ', bold: true }),
          new TextRun(inc.reported_by),
          new TextRun({ text: '   ·   Người xử lý: ', bold: true }),
          new TextRun(inc.assigned_to ?? '—'),
        ],
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Mô tả sự cố', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: inc.description }),
    );

    // Timeline
    children.push(
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Timeline', heading: HeadingLevel.HEADING_2 }),
    );
    const timeline: { at: Date | string | null; label: string }[] = [
      { at: inc.created_at, label: 'Tạo sự cố' },
      { at: inc.assigned_at, label: 'Giao việc' },
      { at: inc.resolved_at, label: 'Báo khắc phục xong' },
      { at: inc.closed_at, label: 'Đóng sự cố' },
    ];
    for (const t of timeline) {
      if (!t.at) continue;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${new Date(t.at).toLocaleString('vi-VN')}: `,
              bold: true,
            }),
            new TextRun(t.label),
          ],
        }),
      );
    }

    // Comments
    if (inc.comments.length > 0) {
      children.push(
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Ghi chú / Bình luận',
          heading: HeadingLevel.HEADING_2,
        }),
      );
      for (const c of inc.comments) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${new Date(c.created_at).toLocaleString('vi-VN')} — ${c.actor_id.slice(0, 8)}: `,
                bold: true,
              }),
              new TextRun(c.body),
            ],
          }),
        );
      }
    }

    // Photos
    const before = inc.photos.filter(
      (p) => p.category === PhotoCategory.BEFORE_FIX,
    );
    const after = inc.photos.filter(
      (p) => p.category === PhotoCategory.AFTER_FIX,
    );
    const evidence = inc.photos.filter(
      (p) => p.category === PhotoCategory.EVIDENCE,
    );

    async function fetchImage(url: string): Promise<Buffer | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      } catch {
        return null;
      }
    }

    const addPhotoSection = async (
      title: string,
      list: typeof inc.photos,
    ): Promise<void> => {
      if (list.length === 0) return;
      children.push(
        new Paragraph({ text: '' }),
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
      );
      for (const p of list) {
        const buf = await fetchImage(p.secure_url);
        if (buf) {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buf,
                  transformation: { width: 400, height: 300 },
                  type: 'png',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Uploaded: ${new Date(p.uploaded_at).toLocaleString('vi-VN')}`,
                  italics: true,
                }),
              ],
            }),
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Không tải được ảnh: ${p.secure_url}]`,
                  italics: true,
                }),
              ],
            }),
          );
        }
      }
    };

    await addPhotoSection('Ảnh BEFORE_FIX', before);
    await addPhotoSection('Ảnh AFTER_FIX', after);
    await addPhotoSection('Ảnh EVIDENCE bổ sung', evidence);

    const doc = new Document({
      creator: 'SH-ERP',
      title: `Incident ${inc.incident_code}`,
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
      buffer,
      filename: `${inc.incident_code}.docx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }
}
