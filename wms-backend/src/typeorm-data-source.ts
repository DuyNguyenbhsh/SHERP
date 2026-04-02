/**
 * TypeORM CLI DataSource
 * File này KHÔNG được sử dụng bởi NestJS runtime (app.module.ts đã có cấu hình riêng).
 * Mục đích duy nhất: Cung cấp DataSource cho TypeORM CLI (migration:generate, migration:run, ...).
 *
 * Cách dùng: npx typeorm-ts-node-commonjs migration:generate src/migrations/TenMigration -d src/typeorm-data-source.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: true,

  // Quét tất cả entity trong dự án — dùng glob pattern cho CLI
  entities: ['src/**/*.entity.ts'],

  // Thư mục chứa migration files
  migrations: ['src/migrations/*.ts'],

  // KHÔNG tự đồng bộ schema — mọi thay đổi phải đi qua migration
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});

export default dataSource;
