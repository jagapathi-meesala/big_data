import { seedDatabase } from './config/seed';
import { connectDB } from './config/db';

const run = async () => {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Running seeder...');
  await seedDatabase();
  console.log('Seeder process complete.');
  process.exit(0);
};

run().catch(err => {
  console.error('Test seed error:', err);
  process.exit(1);
});
