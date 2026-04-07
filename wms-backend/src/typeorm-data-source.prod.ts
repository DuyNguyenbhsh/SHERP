/**
 * TypeORM CLI DataSource — Production (compiled JS)
 * Used inside Docker to run migrations against dist/ output.
 *
 * Usage: node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d dist/typeorm-data-source.prod.js
 */
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: true }
    : process.env.DB_SSL === 'true',

  // In production: use compiled JS entities and migrations
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],

  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});

export default dataSource;
