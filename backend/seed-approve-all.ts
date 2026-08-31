import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating all GraphicRequirements and MediaCalendarEvents to APPROVED status...');

  // Update all MediaCalendarEvent to APPROVED
  const updatedEvents = await prisma.mediaCalendarEvent.updateMany({
    where: {
      status: { in: ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'PENDING_MARKETING_APPROVAL', 'DRAFT', 'CHANGES_REQUESTED', 'REVISION_REQUESTED'] },
    },
    data: {
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
    },
  });
  console.log(`Updated ${updatedEvents.count} calendar events to APPROVED status.`);

  // Update all GraphicRequirement to APPROVED
  const updatedReqs = await prisma.graphicRequirement.updateMany({
    where: {
      status: { in: ['PENDING_APPROVAL', 'PENDING_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'DRAFT', 'WAITING_FOR_MEDIA_REVIEW'] },
    },
    data: {
      status: 'APPROVED',
      clientConfirmed: true,
      mediaManagerApproved: true,
    },
  });
  console.log(`Updated ${updatedReqs.count} graphic requirements to APPROVED status.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
