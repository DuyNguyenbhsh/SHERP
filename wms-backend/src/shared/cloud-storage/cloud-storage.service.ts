import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  file_name: string;
  file_size: number;
  format: string;
  resource_type: string;
}

@Injectable()
export class CloudStorageService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload file buffer lên Cloudinary.
   * @param file - Express.Multer.File từ FileInterceptor
   * @param folder - Thư mục trên Cloudinary (VD: 'ncr', 'project-requests')
   */
  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<CloudUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        status: 'error',
        message: 'Không tìm thấy file để upload',
        data: null,
      });
    }

    const result = await this.uploadBuffer(
      file.buffer,
      folder,
      file.originalname,
    );

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      file_name: file.originalname,
      file_size: result.bytes,
      format: result.format,
      resource_type: result.resource_type,
    };
  }

  /**
   * Upload raw buffer lên Cloudinary (dùng stream).
   */
  private uploadBuffer(
    buffer: Buffer,
    folder: string,
    originalName: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `sh-erp/${folder}`,
          resource_type: 'auto',
          type: 'upload',
          access_mode: 'public',
          public_id: this.generatePublicId(originalName),
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(new Error(String(error.message ?? error)));
          if (!result) return reject(new Error('Upload thất bại'));
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Xóa file trên Cloudinary bằng public_id.
   */
  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Xóa nhiều files cùng lúc.
   */
  async deleteMany(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;
    await cloudinary.api.delete_resources(publicIds);
  }

  /**
   * Tạo public_id từ tên file: bỏ extension, thêm timestamp tránh trùng.
   */
  private generatePublicId(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const timestamp = Date.now();
    return `${sanitized}_${timestamp}`;
  }
}
