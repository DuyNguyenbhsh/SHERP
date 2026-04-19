import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { EnqueueReportExportDto } from './dto/enqueue-report-export.dto';
import { ReportsExportService } from './reports-export.service';

@ApiTags('Exports - Hàng đợi export Excel báo cáo')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('exports/reports')
export class ReportsExportController {
  constructor(private readonly service: ReportsExportService) {}

  @ApiOperation({
    summary: 'Enqueue một job export Excel — trả về jobId để poll',
  })
  @ApiResponse({ status: 201, description: 'Job đã được xếp hàng' })
  @Post()
  enqueue(
    @Body() dto: EnqueueReportExportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.enqueue({
      reportType: dto.reportType,
      params: dto.params || {},
      fileName: dto.fileName,
      userId: req.user.userId,
    });
  }

  @ApiOperation({
    summary: 'Kiểm tra trạng thái + download URL khi job hoàn tất',
  })
  @ApiResponse({ status: 200, description: 'Trạng thái job + result khi xong' })
  @Get(':jobId')
  status(@Param('jobId') jobId: string) {
    return this.service.getStatus(jobId);
  }
}
