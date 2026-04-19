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
import { OfficeTasksService } from './office-tasks.service';
import { CreateOfficeTaskDto } from './dto/create-office-task.dto';
import { AddItemDto } from './dto/add-item.dto';
import { ToggleItemDto } from './dto/toggle-item.dto';
import { OfficeTaskStatus } from './enums/office-task.enum';

@ApiTags('Office Tasks - Công việc văn phòng')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('office-tasks')
export class OfficeTasksController {
  constructor(private readonly service: OfficeTasksService) {}

  @ApiOperation({ summary: 'Tạo Office Task + items (nested) + attachments' })
  @RequirePrivilege('MANAGE_OFFICE_TASK')
  @Post()
  create(@Body() dto: CreateOfficeTaskDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Liệt kê Office Task' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: OfficeTaskStatus,
  ) {
    return this.service.list({ projectId, assigneeId, status });
  }

  @ApiOperation({ summary: 'Chi tiết + items' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Thêm item (sub-task) vào Office Task' })
  @RequirePrivilege('MANAGE_OFFICE_TASK')
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddItemDto) {
    return this.service.addItem(id, dto);
  }

  @ApiOperation({
    summary: 'Toggle done 1 item — BR-OT-01 auto COMPLETED task khi đủ',
  })
  @RequirePrivilege('EXECUTE_OFFICE_TASK')
  @Patch(':id/items/:itemId/toggle')
  toggleItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: ToggleItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.toggleItem(
      id,
      itemId,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  @ApiOperation({
    summary: 'Đánh dấu COMPLETED (BR-OT-02: chủ động khi không có item)',
  })
  @RequirePrivilege('EXECUTE_OFFICE_TASK')
  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }
}
