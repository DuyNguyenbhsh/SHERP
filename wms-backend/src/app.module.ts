import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { InboundModule } from './inbound/inbound.module';
import { OutboundModule } from './outbound/outbound.module';
import { ProductsModule } from './products/products.module';
import { TmsModule } from './tms/tms.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { MasterDataModule } from './master-data/master-data.module';
import { ProcurementModule } from './procurement/procurement.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SeedModule } from './seed/seed.module';
import { RolesModule } from './roles/roles.module';
import { EmployeesModule } from './employees/employees.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ProjectRequestsModule } from './project-requests/project-requests.module';
import { ProjectPlansModule } from './project-plans/project-plans.module';
import { ProjectMonitoringModule } from './project-monitoring/project-monitoring.module';
import { ProjectScheduleModule } from './project-schedule/project-schedule.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SharedModule } from './shared/shared.module';
import { AuditModule } from './common/audit/audit.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    //Kích hoạt toàn cục (isGlobal: true để module nào cũng dùng được)
    ConfigModule.forRoot({ isGlobal: true }),

    // ── SPA FALLBACK: Serve Frontend build output ──
    // Khi Production: mọi request không phải /api/* → trả index.html
    // Cho phép React Router xử lý client-side routing khi user nhấn F5.
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', '..', 'wms-frontend', 'dist'),
      exclude: ['/api/(.*)'], // Không serve static cho API routes
      serveStaticOptions: {
        index: 'index.html', // Fallback file
        fallthrough: true, // Cho phép NestJS xử lý nếu file không tìm thấy
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // NGHIÊM CẤM bật synchronize: true trên môi trường Production/Staging.
        // Mọi thay đổi schema phải đi qua TypeORM Migrations.
        synchronize: false,
        ssl: true, // Bắt buộc khi dùng Neon
      }),
    }),
    // ── RATE LIMITING ──
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5,
      },
    ]),
    AuthModule,
    InventoryModule,
    InboundModule,
    OutboundModule,
    ProductsModule,
    TmsModule,
    VehiclesModule,
    MasterDataModule,
    ProcurementModule,
    SuppliersModule,
    SeedModule,
    RolesModule,
    EmployeesModule,
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    DocumentsModule,
    ReportsModule,
    ApprovalsModule,
    ProjectRequestsModule,
    ProjectPlansModule,
    ProjectMonitoringModule,
    ProjectScheduleModule,
    CustomersModule,
    SalesModule,
    SharedModule,
    AuditModule,
    SystemSettingsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Áp dụng ThrottlerGuard toàn cục — chống brute-force / DDoS
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
