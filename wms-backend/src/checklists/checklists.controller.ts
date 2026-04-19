import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { CreateItemTemplateDto } from './dto/create-item-template.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { SubmitItemResultDto } from './dto/submit-item-result.dto';

@ApiTags('Checklists - Template + Instance thực thi')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  // ── Template (admin) ─────────────────────────────────────
  @ApiOperation({ summary: 'Tạo Checklist Template + items (nested)' })
  @ApiResponse({ status: 201 })
  @RequirePrivilege('MANAGE_CHECKLIST_TEMPLATE')
  @Post('templates')
  createTemplate(@Body() dto: CreateChecklistTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @ApiOperation({ summary: 'Liệt kê Checklist Template' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('templates')
  listTemplates() {
    return this.service.listTemplates();
  }

  @ApiOperation({ summary: 'Chi tiết Checklist Template + items' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @ApiOperation({ summary: 'Thêm 1 item vào template đã có' })
  @RequirePrivilege('MANAGE_CHECKLIST_TEMPLATE')
  @Post('templates/:id/items')
  addItem(@Param('id') id: string, @Body() dto: CreateItemTemplateDto) {
    return this.service.addItem(id, dto);
  }

  // ── Instance (field worker) ──────────────────────────────
  @ApiOperation({
    summary: 'Tạo Checklist instance (thủ công — recurrence tạo qua queue)',
  })
  @ApiResponse({ status: 201 })
  @RequirePrivilege('EXECUTE_CHECKLIST')
  @Post('instances')
  createInstance(@Body() dto: CreateInstanceDto) {
    return this.service.createInstance(dto);
  }

  @ApiOperation({ summary: 'Chi tiết instance + items + results' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('instances/:id')
  getInstance(@Param('id') id: string) {
    return this.service.getInstance(id);
  }

  @ApiOperation({
    summary:
      'Submit kết quả cho 1 item (idempotent) — áp dụng BR-CHK-01/02/03/05',
  })
  @ApiResponse({
    status: 201,
    description: 'Trả về result + instanceStatus + progressPct',
  })
  @RequirePrivilege('EXECUTE_CHECKLIST')
  @Post('instances/:id/items/:itemId/result')
  submitResult(
    @Param('id') instanceId: string,
    @Param('itemId') itemTemplateId: string,
    @Body() dto: SubmitItemResultDto,
  ) {
    return this.service.submitItemResult(instanceId, itemTemplateId, dto);
  }
}
