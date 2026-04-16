# SA_DESIGN Supplement — NCR Attachments · Cloudinary Integration

> **Ngày thiết kế:** 2026-04-16
> **Trạng thái:** Gate 2 — SA Supplement
> **Nguồn BA:** `docs/features/project-management/BA_SPEC.md` §5.2 (NCR entity), BR-09 ("NCR PHẢI có hình ảnh đính kèm")
> **SA cha:** `docs/features/project-management/SA_DESIGN.md`
> **Câu hỏi mở BA §283:** "File upload: NCR cần upload hình ảnh. Sử dụng cloud storage (S3/Cloudinary) hay lưu local?" → **Chọn Cloudinary.**

---

## 1. Mục tiêu

Thay thế placeholder URL (`/uploads/ncr/:ncrId/:filename` — không thật sự tồn tại) tại `projects.controller.ts:580` bằng Cloudinary integration thực sự. Tận dụng `CloudStorageService` đã có (`wms-backend/src/shared/cloud-storage/`).

## 2. Scope

| Thành phần | Thay đổi |
|------------|---------|
| `NcrAttachment` entity | Thêm `public_id`, `file_size`, `file_format`, `resource_type` |
| Migration mới | `AddCloudinaryFieldsToNcrAttachments` |
| `ProjectNcrService.addAttachment()` | Mở rộng signature nhận `CloudUploadResult` thay vì chỉ `fileUrl` |
| `ProjectNcrService.removeAttachment()` | Gọi `CloudStorageService.delete(public_id)` trước khi xoá DB row |
| `projects.controller.ts:uploadNcrAttachment` | Inject `CloudStorageService`, gọi `upload(file, 'ncr/${ncrId}/${phase}')`, truyền kết quả vào service |
| `ProjectsModule` | Import `CloudStorageModule` (nếu chưa) |

## 3. DB Schema

```sql
ALTER TABLE ncr_attachments
  ADD COLUMN public_id VARCHAR(255),
  ADD COLUMN file_size INTEGER,
  ADD COLUMN file_format VARCHAR(20),
  ADD COLUMN resource_type VARCHAR(20) DEFAULT 'image';

CREATE INDEX idx_ncr_attachments_public_id ON ncr_attachments(public_id);
```

**Backward compat:** Attachment cũ có `public_id = NULL` — không xoá được trên Cloudinary (chấp nhận orphan cho data cũ, log warning).

## 4. Service Contract

### 4.1 CloudStorageService (đã tồn tại, không đổi)
```typescript
upload(file: Express.Multer.File, folder: string): Promise<CloudUploadResult>
delete(publicId: string): Promise<void>
deleteMany(publicIds: string[]): Promise<void>
```

Kết quả upload trả: `{ url, secure_url, public_id, file_name, file_size, format, resource_type }`.

### 4.2 ProjectNcrService.addAttachment — signature mới
```typescript
async addAttachment(
  ncrId: string,
  phase: 'BEFORE' | 'AFTER',
  upload: CloudUploadResult,
  userId: string,
): Promise<NcrAttachment>
```
Lưu `secure_url` vào `file_url`; lưu thêm `public_id`, `file_size`, `file_format`, `resource_type`.

### 4.3 ProjectNcrService.removeAttachment — mở rộng
```typescript
async removeAttachment(attachmentId: string): Promise<void> {
  const att = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
  if (!att) throw new NotFoundException(...);
  if (att.public_id) {
    await this.cloudStorage.delete(att.public_id);  // Log warn nếu fail, KHÔNG chặn xoá DB
  }
  await this.attachmentRepo.delete(attachmentId);
}
```
Cần inject `CloudStorageService` vào `ProjectNcrService` constructor.

## 5. Env Vars (đã tồn tại — kiểm tra trong `DEPLOY.md`)

```env
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

`CloudStorageService` gọi `configService.getOrThrow` — thiếu env thì bootstrap fail sớm (fail-fast).

## 6. Folder Strategy trên Cloudinary

```
sh-erp/
  ncr/
    <ncrId>/
      BEFORE/
        <public_id>
      AFTER/
        <public_id>
```

Truyền `folder: \`ncr/\${ncrId}/\${phase}\`` vào `upload()`. CloudStorageService tự prefix `sh-erp/`.

## 7. Validation & Constraints

- **File size max:** 10MB (thiết lập qua `FileInterceptor({ limits: { fileSize: 10 * 1024 * 1024 } })`)
- **Accepted types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- **Validation:** Throw `BadRequestException` nếu file sai mime/size
- **Rate limit:** Dùng `@Throttle()` trên endpoint (max 10 uploads/phút/user)

## 8. Error Handling

| Tình huống | Hành vi |
|------------|--------|
| Cloudinary upload fail (network) | Throw `ServiceUnavailableException`, KHÔNG lưu DB |
| Cloudinary delete fail khi remove | Log warning, VẪN xoá DB row (tránh block user) |
| File mime không hợp lệ | `BadRequestException` trước khi gọi Cloudinary |
| Quota vượt | Log alert, trả 503 với retry hint |

## 9. Migration Strategy (không phá data cũ)

1. **Migration 1:** Thêm 4 columns nullable (không ALTER default) — an toàn.
2. **Backfill (tùy chọn):** Attachment cũ `public_id = NULL` giữ nguyên. Khi user xoá → chỉ xoá DB row, log `[NCR] Orphan Cloudinary file: url=<file_url>` để team ops cleanup thủ công nếu cần.
3. **Migration 2 (tương lai):** Nếu muốn enforce, đặt `NOT NULL` sau 1 release + migration cleanup.

## 10. Testing Plan (cho Gate 4)

- Unit: mock `CloudStorageService.upload/delete`, verify `ProjectNcrService` gọi đúng signature
- Integration: upload file thật (test env Cloudinary folder `sh-erp-test/`), verify DB row + Cloudinary resource
- Negative: file >10MB → 400; mime sai → 400; Cloudinary sandbox down → 503

## 11. Rollout

1. Deploy migration trên staging → smoke test upload/delete
2. Monitor Cloudinary quota dashboard
3. Deploy production sau 1 ngày staging không có issue
4. Tuần 1 production: theo dõi log `[NCR] Orphan Cloudinary` để phát hiện edge cases

## 12. Estimate

- Backend dev: ~4h (entity+migration+service+controller+module wiring)
- Unit + integration tests: ~3h
- SA review: ~1h
- **Tổng: ~8h (1 ngày công)**

## 13. Câu hỏi cần user/PM quyết trước khi DEV

1. File size limit 10MB đủ cho hình thi công không? (có thể ảnh HDR 20MB)
2. Có cần giới hạn số attachments/NCR không? (BR-09 không quy định)
3. Attachment cũ (`public_id = NULL`) có cần backfill lên Cloudinary không? (hay để orphan)

---

**Next step:** Sau khi user approve SA → tạo DEV task riêng: migration + code + tests.
