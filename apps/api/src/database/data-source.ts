import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// For ESM in Node.js, __dirname is not available unless we polyfill it
// But for the TypeORM CLI with ts-node, it often handles it if we use the right tsconfig
// Let's use a more robust way to get the path
dotenv.config({ path: '../../../../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'hotel_user',
  password: process.env.POSTGRES_PASSWORD || 'hotel_secret',
  database: process.env.POSTGRES_DB || 'hotel_db',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
});
