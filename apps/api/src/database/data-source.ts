import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

/** API package root (apps/api) — TypeORM CLI should run with cwd = apps/api */
const apiRoot = resolve(process.cwd());
const isJs = process.argv.some((arg) => arg.includes('dist/database'));
const ext = isJs ? 'js' : 'ts';
const here = join(apiRoot, isJs ? 'dist/database' : 'src/database');
const envCandidates = [
  join(apiRoot, '.env'),
  join(apiRoot, '../../.env'),
];
for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}


export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'hotel_user',
  password: process.env.POSTGRES_PASSWORD || 'hotel_secret',
  database: process.env.POSTGRES_DB || 'hotel_db',
  entities: [join(here, `../**/*.entity.${ext}`)],
  migrations: [join(here, `./migrations/*.${ext}`)],
  synchronize: false,
  logging: true,
});
