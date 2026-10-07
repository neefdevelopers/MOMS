import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDb() {
  console.log('Connecting to database...');
  try {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
    `;

    console.log(`Found ${tablenames.length} tables to truncate.`);
    
    if (tablenames.length > 0) {
      const tables = tablenames
        .map(({ tablename }) => `"${tablename}"`)
        .join(', ');
      
      console.log(`Truncating tables: ${tables}`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      console.log('✅ Successfully deleted all data from the database!');
    } else {
      console.log('No tables found in public schema.');
    }
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDb();
