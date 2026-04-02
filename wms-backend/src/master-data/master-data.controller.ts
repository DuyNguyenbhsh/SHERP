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
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  // Xem danh sách: Chỉ cần đăng nhập, không yêu cầu quyền đặc biệt
  @Get(':type')
  getAll(@Param('type') type: string) {
    return this.service.getAll(type);
  }

  @RequirePrivilege('MANAGE_MASTER_DATA')
  @Post(':type')
  create(@Param('type') type: string, @Body() body: any) {
    return this.service.create(type, body);
  }

  @RequirePrivilege('MANAGE_MASTER_DATA')
  @Patch(':type/:id')
  update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(type, id, body);
  }

  @RequirePrivilege('MANAGE_MASTER_DATA')
  @Delete(':type/:id')
  delete(@Param('type') type: string, @Param('id') id: string) {
    return this.service.delete(type, id);
  }
}
