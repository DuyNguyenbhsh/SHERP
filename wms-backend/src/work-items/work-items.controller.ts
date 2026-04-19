import {
  Body,
  Controller,
  Get,
  Param,
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
import { QueryWorkItemFeedDto } from './dto/query-work-item-feed.dto';
import { ReassignWorkItemDto } from './dto/reassign-work-item.dto';
import { WorkItemsService } from './work-items.service';

@ApiTags('Work Items - Công việc của tôi (polymorphic)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly service: WorkItemsService) {}

  @ApiOperation({ summary: 'Feed công việc theo filter + pagination cursor' })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get('feed')
  feed(@Query() query: QueryWorkItemFeedDto, @Req() req: AuthenticatedRequest) {
    return this.service.feed(query, req.user.employeeId || req.user.userId);
  }

  @ApiOperation({
    summary: 'Chi tiết công việc (polymorphic hydrate sẽ plug sau)',
  })
  @RequirePrivilege('VIEW_WORK_ITEM')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Chuyển giao công việc cho assignee khác' })
  @RequirePrivilege('EXECUTE_WORK_ITEM')
  @Post(':id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignWorkItemDto) {
    return this.service.reassign(id, dto);
  }
}
