import { AppDataSource } from './data-source';
import { seedData } from './seed';

AppDataSource.initialize()
  .then(async () => {
    console.log('Seeding database...');
    await seedData(AppDataSource);
    console.log('Database seeded successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });
