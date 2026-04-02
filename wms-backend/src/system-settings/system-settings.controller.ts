import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { CreateSettingDto, UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@ApiTags('System Settings - Cấu hình hệ thống')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@UseInterceptors(AuditInterceptor)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @ApiOperation({ summary: 'Danh sách cấu hình hệ thống' })
  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @ApiOperation({ summary: 'Lấy cấu hình theo key' })
  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @ApiOperation({ summary: 'Tạo cấu hình mới' })
  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.settingsService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật giá trị cấu hình' })
  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(key, dto);
  }
}
