import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

// Import Entities
import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Organization]), // Cấp quyền chọc vào 2 bảng này
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService], // Xuất khẩu Service để UserModule có thể dùng ké sau này
})
export class EmployeesModule {}
