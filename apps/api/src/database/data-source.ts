import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// For ESM in Node.js, __dirname is not available unless we polyfill it
// But for the TypeORM CLI with ts-node, it often handles it if we use the right tsconfig
import { existsSync } from 'fs';

// Let's use a robust way to get the path in both CJS and TS-node environments
let envPath = join(__dirname, '../../../../.env');
if (!existsSync(envPath)) {
  envPath = join(__dirname, '../../../.env');
}
dotenv.config({ path: envPath });

const isJs = __filename.endsWith('.js');
const ext = isJs ? 'js' : 'ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'hotel_user',
  password: process.env.POSTGRES_PASSWORD || 'hotel_secret',
  database: process.env.POSTGRES_DB || 'hotel_db',
  entities: [join(__dirname, `../**/*.entity.${ext}`)],
  migrations: [join(__dirname, `./migrations/*.${ext}`)],
  synchronize: false,
  logging: true,
});
