import { seedDemoCricketData } from '../src/utils/seedData';

async function main() {
  console.log('Seeding demo cricket data into Firestore...');
  try {
    const result = await seedDemoCricketData();
    console.log('Successfully seeded:', result);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();
