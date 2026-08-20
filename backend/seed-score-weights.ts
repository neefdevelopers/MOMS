import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const weights = [
    { key: 'SCORE_WEIGHT_ATTENDANCE', value: '0.20', description: 'Weight multiplier for Attendance (Max 100 * 0.20 = 20 points)' },
    { key: 'SCORE_WEIGHT_ACHIEVEMENT', value: '0.30', description: 'Weight multiplier for Target Achievement %' },
    { key: 'SCORE_WEIGHT_OUTPUT', value: '2.0', description: 'Points added per 1.0 standard output quantity' },
    { key: 'SCORE_WEIGHT_COMPLETION_RATE', value: '0.30', description: 'Weight multiplier for Task Completion Rate %' },
    { key: 'SCORE_WEIGHT_REVISION_PENALTY', value: '5.0', description: 'Points deducted per revision request' },
    { key: 'SCORE_WEIGHT_PENDING_PENALTY', value: '2.0', description: 'Points deducted per pending assigned task' },
  ];

  for (const w of weights) {
    await prisma.systemSetting.upsert({
      where: { key: w.key },
      update: { value: w.value, description: w.description },
      create: { key: w.key, value: w.value, description: w.description },
    });
  }

  console.log("Successfully seeded productivity score weights.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
