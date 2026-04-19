import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { EnergyInspectionService } from './energy-inspection.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { RecordReadingDto } from './dto/record-reading.dto';
import { EnergyInspectionStatus } from './enums/energy.enum';

@ApiTags('Energy Inspection - Đọc công tơ + báo cáo điện/nước')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller()
export class EnergyInspectionController {
  constructor(private readonly service: EnergyInspectionService) {}

  // ── Meter master-data ────────────────────────────────────
  @ApiOperation({ summary: 'Đăng ký Meter mới (admin)' })
  @RequirePrivilege('MANAGE_ENERGY_METER')
  @Post('energy-meters')
  createMeter(@Body() dto: CreateMeterDto) {
    return this.service.createMeter(dto);
  }

  @ApiOperation({ summary: 'Danh sách Meter' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('energy-meters')
  listMeters(
    @Query('projectId') projectId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.listMeters({
      projectId,
      active: active == null ? undefined : active === 'true',
    });
  }

  @ApiOperation({ summary: 'Vô hiệu hoá Meter (soft)' })
  @RequirePrivilege('MANAGE_ENERGY_METER')
  @Patch('energy-meters/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivateMeter(id);
  }

  // ── Inspection ───────────────────────────────────────────
  @ApiOperation({ summary: 'Tạo Inspection — chỉ định meter cần đọc' })
  @RequirePrivilege('MANAGE_ENERGY_METER')
  @Post('energy-inspections')
  createInspection(@Body() dto: CreateInspectionDto) {
    return this.service.createInspection(dto);
  }

  @ApiOperation({ summary: 'Liệt kê Inspection' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('energy-inspections')
  listInspections(
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: EnergyInspectionStatus,
  ) {
    return this.service.listInspections({ projectId, assigneeId, status });
  }

  @ApiOperation({ summary: 'Chi tiết Inspection + readings' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('energy-inspections/:id')
  findInspection(@Param('id') id: string) {
    return this.service.findInspection(id);
  }

  @ApiOperation({
    summary:
      'Ghi reading cho 1 meter (idempotent) — áp dụng BR-EI-01 (non-decreasing) + BR-EI-03 (auto complete)',
  })
  @RequirePrivilege('EXECUTE_ENERGY_INSPECTION')
  @Post('energy-inspections/:id/readings')
  recordReading(
    @Param('id') id: string,
    @Body() dto: RecordReadingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.recordReading(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }
}
