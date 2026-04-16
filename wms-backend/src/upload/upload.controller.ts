import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../common/guards/privilege.guard';
import { CloudStorageService } from '../shared/cloud-storage';

@ApiTags('Upload - Tải lên tệp')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudStorage: CloudStorageService) {}

  @ApiOperation({ summary: 'Upload file lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @Post('cloudinary')
  @UseInterceptors(FileInterceptor('file'))
  async uploadToCloudinary(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const result = await this.cloudStorage.upload(file, folder || 'general');
    return {
      status: 'success',
      message: 'Tải lên thành công',
      data: result,
    };
  }
}
