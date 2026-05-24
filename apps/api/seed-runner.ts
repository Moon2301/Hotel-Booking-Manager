import { AppDataSource } from './src/database/data-source';
import { seedData } from './src/database/seed';

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding:', {
      database: (AppDataSource.options as any).database,
      port: (AppDataSource.options as any).port,
      host: (AppDataSource.options as any).host,
    });
    
    // Log tables in the DB
    const res = await AppDataSource.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log('Tables in this database:', res.map((r: any) => r.table_name));

    await seedData(AppDataSource);
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

run();
