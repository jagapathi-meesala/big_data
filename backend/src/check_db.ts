import { sequelize } from './config/db';
import Allocation from './models/Allocation';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    const allocations = await Allocation.findAll({ raw: true });
    console.log('Allocations in DB:', JSON.stringify(allocations, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

run();
