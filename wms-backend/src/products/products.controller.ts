import {
  Controller,
  Get,
  Post,
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
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

// Mọi route đều yêu cầu đăng nhập; PrivilegeGuard kiểm tra quyền chi tiết theo từng route
@ApiTags('Products - Hàng hóa')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductService) {}

  // Xem danh sách: Không yêu cầu quyền đặc biệt — mọi nhân viên đã login đều xem được
  @ApiOperation({ summary: 'Danh sách hàng hóa' })
  @ApiQuery({
    name: 'showInactive',
    required: false,
    description: 'Hiển thị hàng đã ngừng (true/false)',
  })
  @Get()
  findAll(@Query('showInactive') showInactive: string) {
    return this.productsService.findAll(showInactive);
  }

  @ApiOperation({ summary: 'Chi tiết hàng hóa' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // Các thao tác ghi: Yêu cầu quyền MANAGE_PRODUCT
  @ApiOperation({ summary: 'Tạo hàng hóa mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePrivilege('MANAGE_PRODUCT')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật hàng hóa' })
  @RequirePrivilege('MANAGE_PRODUCT')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Kích hoạt lại hàng hóa đã ngừng' })
  @RequirePrivilege('MANAGE_PRODUCT')
  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.productsService.update(id, { is_active: true } as any);
  }

  @ApiOperation({ summary: 'Ngừng kinh doanh hàng hóa (Soft Delete)' })
  @RequirePrivilege('MANAGE_PRODUCT')
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
