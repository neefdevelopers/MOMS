import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing formulas
  await prisma.outputFormula.deleteMany();
  
  // Create requested formulas
  await prisma.outputFormula.createMany({
    data: [
      { deliverableType: 'Video', quantity: 1, outputValue: 1.0, description: '1 Video counts as 1.0 standard output' },
      { deliverableType: 'Carousel', quantity: 1, outputValue: 1.0, description: '1 Carousel counts as 1.0 standard output' },
      { deliverableType: 'Poster', quantity: 2, outputValue: 1.0, description: '2 Posters count as 1.0 standard output' },
      { deliverableType: 'Thumbnail', quantity: 8, outputValue: 1.0, description: '8 Thumbnails count as 1.0 standard output' },
      { deliverableType: 'Story', quantity: 5, outputValue: 1.0, description: '5 Stories count as 1.0 standard output' },
    ],
  });

  console.log("Successfully updated output formulas!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
