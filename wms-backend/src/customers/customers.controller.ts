import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../common/guards/privilege.guard';
import { RequirePrivilege } from '../common/decorators/require-privilege.decorator';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/create-customer.dto';

@ApiTags('Customers - Khách hàng')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'customer_type', required: false })
  @Get()
  findAll(
    @Query('is_active') is_active?: string,
    @Query('customer_type') customer_type?: string,
  ) {
    return this.service.findAll({
      is_active: is_active === undefined ? undefined : is_active !== 'false',
      customer_type,
    });
  }

  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Công nợ hiện tại của khách' })
  @Get(':id/debt')
  getDebt(@Param('id') id: string) {
    return this.service.getDebt(id);
  }

  @ApiOperation({ summary: 'Tạo khách hàng' })
  @RequirePrivilege('MANAGE_CUSTOMER')
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  @RequirePrivilege('MANAGE_CUSTOMER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Vô hiệu hóa khách hàng (soft delete)' })
  @RequirePrivilege('MANAGE_CUSTOMER')
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @ApiOperation({ summary: 'Khôi phục khách hàng' })
  @RequirePrivilege('MANAGE_CUSTOMER')
  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }
}
