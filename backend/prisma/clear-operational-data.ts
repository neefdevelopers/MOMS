import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearOperationalData() {
  console.log('Connecting to database...');
  console.log('Clearing all operational data while preserving user accounts and credentials...');

  try {
    // List of tables to keep: User, EmployeeProfile, Department, Skill, EmployeeSkill, SystemSetting, OutputFormula
    const tablesToKeep = new Set([
      'User',
      'EmployeeProfile',
      'Department',
      'Skill',
      'EmployeeSkill',
      'SystemSetting',
      'OutputFormula',
      '_prisma_migrations',
    ]);

    // Query all public tables from PostgreSQL
    const allTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public';
    `;

    const operationalTables = allTables
      .map((t) => t.tablename)
      .filter((name) => !tablesToKeep.has(name));

    console.log(`Found ${operationalTables.length} operational tables to clear:`);
    console.log(operationalTables.join(', '));

    if (operationalTables.length > 0) {
      const quotedTableList = operationalTables.map((t) => `"${t}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTableList} CASCADE;`);
      console.log('✅ Successfully cleared all operational tables.');
    }

    // Verify preserved users
    const userCount = await prisma.user.count();
    const deptCount = await prisma.department.count();
    const skillCount = await prisma.skill.count();
    const profileCount = await prisma.employeeProfile.count();

    console.log('\n--- Retained Accounts & Credentials ---');
    console.log(`Users preserved: ${userCount}`);
    console.log(`Employee profiles preserved: ${profileCount}`);
    console.log(`Departments preserved: ${deptCount}`);
    console.log(`Skills preserved: ${skillCount}`);

    // Verify operational table counts
    const projectCount = await prisma.shootProject.count();
    const taskCount = await prisma.task.count();
    const clientCount = await prisma.client.count();
    const eqpCount = await prisma.equipment.count();

    console.log('\n--- Operational Data Status ---');
    console.log(`Projects: ${projectCount}`);
    console.log(`Tasks: ${taskCount}`);
    console.log(`Clients: ${clientCount}`);
    console.log(`Equipment: ${eqpCount}`);
    console.log('\n✨ Database is now fresh and ready for clean data entry while keeping all logins intact!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearOperationalData();
