import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectScheduleService } from './project-schedule.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateLinkDto,
  ActionDto,
} from './dto/schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Project Schedule - Tiến độ & Gantt (PROJ3)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('project-schedule')
export class ProjectScheduleController {
  constructor(private readonly service: ProjectScheduleService) {}

  // ── TASKS ──

  @ApiOperation({ summary: 'Danh sách tasks' })
  @ApiQuery({ name: 'project_id', required: true })
  @Get('tasks')
  findTasks(@Query('project_id') projectId: string) {
    return this.service.findTasks(projectId);
  }

  @ApiOperation({ summary: 'Tạo task mới (auto-recalculate CPM)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.service.createTask(dto, req.user.userId);
  }

  @ApiOperation({
    summary: 'Cập nhật task (auto-recalculate nếu thay đổi duration/date)',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.updateTask(id, dto);
  }

  @ApiOperation({ summary: 'Xóa task' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.service.deleteTask(id);
  }

  // ── LINKS (with cycle validation) ──

  @ApiOperation({ summary: 'Danh sách mối quan hệ task' })
  @ApiQuery({ name: 'project_id', required: true })
  @Get('links')
  findLinks(@Query('project_id') projectId: string) {
    return this.service.findLinks(projectId);
  }

  @ApiOperation({ summary: 'Tạo mối quan hệ FS (validation: no cycle)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('links')
  createLink(@Body() dto: CreateLinkDto) {
    return this.service.createLink(dto);
  }

  @ApiOperation({ summary: 'Xóa mối quan hệ' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('links/:id')
  deleteLink(@Param('id') id: string) {
    return this.service.deleteLink(id);
  }

  // ── SCHEDULE DATA (Gantt Chart) ──

  @ApiOperation({
    summary:
      'Toàn bộ dữ liệu tiến độ (tasks + links + critical path + resource)',
  })
  @ApiQuery({ name: 'project_id', required: true })
  @Get('data')
  getScheduleData(@Query('project_id') projectId: string) {
    return this.service.getScheduleData(projectId);
  }

  @ApiOperation({ summary: 'Tính lại CPM toàn bộ dự án' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('recalculate/:projectId')
  recalculate(@Param('projectId') projectId: string) {
    return this.service.recalculate(projectId);
  }

  // ── BASELINES ──

  @ApiOperation({ summary: 'Danh sách baseline tiến độ' })
  @ApiQuery({ name: 'project_id', required: true })
  @Get('baselines')
  findBaselines(@Query('project_id') projectId: string) {
    return this.service.findBaselines(projectId);
  }

  @ApiOperation({ summary: 'Tạo baseline (snapshot tiến độ hiện tại)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('baselines')
  createBaseline(
    @Body() body: { project_id: string; title: string },
    @Req() req: any,
  ) {
    return this.service.createBaseline(
      body.project_id,
      body.title,
      req.user.userId,
      req.user.username,
    );
  }

  @ApiOperation({ summary: 'Phê duyệt baseline → Freeze vĩnh viễn' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('baselines/:id/approve')
  approveBaseline(@Param('id') id: string, @Req() req: any) {
    return this.service.approveBaseline(id, req.user.userId, req.user.username);
  }
}
