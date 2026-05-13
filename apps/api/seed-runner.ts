import { AppDataSource } from './src/database/data-source';
import { seedData } from './src/database/seed';

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding');
    await seedData(AppDataSource);
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
