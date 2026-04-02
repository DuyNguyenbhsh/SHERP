import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Organizations - Tổ chức')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Danh sách tổ chức/phòng ban' })
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @ApiOperation({ summary: 'Tạo tổ chức/phòng ban' })
  @RequirePrivilege('MANAGE_ORGANIZATION')
  @Post()
  create(@Body() body: any) {
    return this.organizationsService.create(body);
  }

  @ApiOperation({ summary: 'Cập nhật tổ chức' })
  @RequirePrivilege('MANAGE_ORGANIZATION')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.organizationsService.update(id, body);
  }

  @ApiOperation({ summary: 'Xóa tổ chức' })
  @RequirePrivilege('MANAGE_ORGANIZATION')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
