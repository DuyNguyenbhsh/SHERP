import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Vehicles - Quản lý Đội xe')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Danh sách xe' })
  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @ApiOperation({ summary: 'Thêm xe mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePrivilege('MANAGE_VEHICLE')
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin xe' })
  @RequirePrivilege('MANAGE_VEHICLE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa xe' })
  @RequirePrivilege('MANAGE_VEHICLE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
