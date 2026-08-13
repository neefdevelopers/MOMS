import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MOMS database (SQLite)...');

  // Clean existing tables in reverse order
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.fileMetadata.deleteMany();
  await prisma.clientConfirmation.deleteMany();
  await prisma.revision.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.equipmentMovement.deleteMany();
  await prisma.equipmentReservation.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.graphicRequirement.deleteMany();
  await prisma.script.deleteMany();
  await prisma.indoorShootDetails.deleteMany();
  await prisma.outdoorShootDetails.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.shootProject.deleteMany();
  await prisma.mediaCalendarEvent.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employeeSkill.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outputFormula.deleteMany();
  await prisma.systemSetting.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // 1. Departments
  const deptPost = await prisma.department.create({
    data: { name: 'Post-Production', description: 'Video Editing, Motion Graphics, Audio Polish' },
  });
  const deptDesign = await prisma.department.create({
    data: { name: 'Design & Creative', description: 'Graphic Design, Posters, Carousels' },
  });
  const deptProduction = await prisma.department.create({
    data: { name: 'Production & Shoot', description: 'Camera operation, Lighting, Directing' },
  });
  const deptManagement = await prisma.department.create({
    data: { name: 'Operations & Management', description: 'Media Planning, Quality & Review' },
  });

  // 2. Skills
  const skillVideoEdit = await prisma.skill.create({ data: { name: 'Video Editing', category: 'Post-Production' } });
  const skillGraphic = await prisma.skill.create({ data: { name: 'Graphic Design', category: 'Creative' } });

  // 3. Users
  const mediaManagerUser = await prisma.user.create({
    data: {
      email: 'media.manager@example.com',
      password: hashedPassword,
      name: 'Vikram Seth (Media Manager)',
      role: 'MEDIA_MANAGER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      employeeProfile: {
        create: {
          designation: 'Head of Operations & Media Manager',
          departmentId: deptManagement.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const techManagerUser = await prisma.user.create({
    data: {
      email: 'technical.manager@example.com',
      password: hashedPassword,
      name: 'Rajesh Kumar (Tech Manager)',
      role: 'TECHNICAL_MANAGER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      employeeProfile: {
        create: {
          designation: 'Technical Supervisor & Chief Engineer',
          departmentId: deptManagement.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      email: 'staff1@example.com',
      password: hashedPassword,
      name: 'Ahmed Khan (Video Editor)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      employeeProfile: {
        create: {
          designation: 'Senior Video Editor',
          departmentId: deptPost.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@example.com',
      password: hashedPassword,
      name: 'Sarah Jenkins (Graphic Designer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      employeeProfile: {
        create: {
          designation: 'Lead Graphic Designer',
          departmentId: deptDesign.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff3 = await prisma.user.create({
    data: {
      email: 'staff3@example.com',
      password: hashedPassword,
      name: 'Rahul Varma (Motion Designer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      employeeProfile: {
        create: {
          designation: 'Motion Graphics Artist',
          departmentId: deptPost.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff4 = await prisma.user.create({
    data: {
      email: 'staff4@example.com',
      password: hashedPassword,
      name: 'Devika Sharma (Photographer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      employeeProfile: {
        create: {
          designation: 'Lead Photographer & Videographer',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff5 = await prisma.user.create({
    data: {
      email: 'producer@example.com',
      password: hashedPassword,
      name: 'Karan Malhotra (Producer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      employeeProfile: {
        create: {
          designation: 'Shoot Producer',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff6 = await prisma.user.create({
    data: {
      email: 'drone@example.com',
      password: hashedPassword,
      name: 'Rohan Gupta (Drone Operator)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      employeeProfile: {
        create: {
          designation: 'Licensed Drone Operator (Outdoor)',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff7 = await prisma.user.create({
    data: {
      email: 'writer@example.com',
      password: hashedPassword,
      name: 'Priya Nambiar (Content Writer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      employeeProfile: {
        create: {
          designation: 'Content Writer & Scriptwriter',
          departmentId: deptDesign.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff8 = await prisma.user.create({
    data: {
      email: 'lighting@example.com',
      password: hashedPassword,
      name: 'Manish Pandey (Lighting Tech)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      employeeProfile: {
        create: {
          designation: 'Lighting Technician & Gaffer',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff9 = await prisma.user.create({
    data: {
      email: 'sound@example.com',
      password: hashedPassword,
      name: 'Sameer Rao (Sound Engineer)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      employeeProfile: {
        create: {
          designation: 'Sound Engineer & Boom Operator',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff10 = await prisma.user.create({
    data: {
      email: 'driver@example.com',
      password: hashedPassword,
      name: 'Ramesh Kumar (Driver)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      employeeProfile: {
        create: {
          designation: 'Driver & Logistics Manager (Outdoor)',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  const staff11 = await prisma.user.create({
    data: {
      email: 'logistics@example.com',
      password: hashedPassword,
      name: 'Anand Sharma (Logistics Coordinator)',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      employeeProfile: {
        create: {
          designation: 'Logistics Coordinator (Outdoor)',
          departmentId: deptProduction.id,
          dailyCapacityHours: 8.0,
        },
      },
    },
  });

  // 4. Clients
  const client1 = await prisma.client.create({
    data: {
      name: 'ABC Healthcare Pvt Ltd',
      companyName: 'ABC Healthcare Group',
      contactPerson: 'Dr. Suresh Mehta',
      mobile: '+91 98765 43210',
      email: 'suresh@abchealthcare.com',
      address: '701 Healthcare Towers, Bandra West, Mumbai',
      gstNumber: '27AAAAA0000A1Z5',
      website: 'https://abchealthcare.example.com',
      status: 'ACTIVE',
      internalNotes: 'Key client for wellness and supplement range.',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Example Media Client',
      companyName: 'Example Media Ltd',
      contactPerson: 'Anita Roy',
      mobile: '+91 98111 22233',
      email: 'anita@examplemedia.com',
      address: '402 Creative Hub, Indiranagar, Bengaluru',
      status: 'ACTIVE',
      internalNotes: 'Monthly retainership client.',
    },
  });

  // 5. Brands
  const brand1 = await prisma.brand.create({
    data: {
      clientId: client1.id,
      name: 'Dhaara Wellness',
      shortCode: 'DW',
      description: 'Organic Ayurvedic and Herbal Wellness Brand',
      industry: 'Health & Wellness',
      primaryColor: '#059669',
      status: 'ACTIVE',
    },
  });

  const brand2 = await prisma.brand.create({
    data: {
      clientId: client2.id,
      name: 'Bonheur',
      shortCode: 'BN',
      description: 'Luxury Personal Care & Cosmetics',
      industry: 'Beauty & Skincare',
      primaryColor: '#EC4899',
      status: 'ACTIVE',
    },
  });

  // 6. Products
  const product1 = await prisma.product.create({
    data: {
      brandId: brand1.id,
      name: 'Ojas Immunity Booster',
      productCode: 'OJ',
      category: 'Supplements',
      status: 'ACTIVE',
      internalNotes: 'Hero product line.',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      brandId: brand1.id,
      name: 'Bhringraj Hair Oil',
      productCode: 'HO',
      category: 'Haircare',
      status: 'ACTIVE',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      brandId: brand2.id,
      name: 'Hydra Glow Face Wash',
      productCode: 'FW',
      category: 'Skincare',
      status: 'ACTIVE',
    },
  });

  // 7. Calendar Event & Projects
  const today = new Date();
  const calendarEvent1 = await prisma.mediaCalendarEvent.create({
    data: {
      title: 'Dhaara Wellness Ojas Launch Reel Shoot',
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      shootType: 'INDOOR',
      shootDate: today,
      influencerTalent: 'Devika (Model)',
      priority: 'HIGH',
      productionNotes: 'Focus on natural ingredient display and packaging texture.',
      status: 'SCHEDULED',
    },
  });

  // Indoor Project
  const project1 = await prisma.shootProject.create({
    data: {
      projectId: 'SP-000001',
      name: 'DW-130726-OJAS-INDOOR',
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      calendarEventId: calendarEvent1.id,
      shootType: 'INDOOR',
      shootDate: today,
      shootLocation: 'Studio 4, Media Ops HQ',
      locationCategory: 'Internal Studio',
      locationAddress: 'Studio Floor 2, Media Ops HQ',
      reportingTime: '09:00 AM',
      expectedWrapUpTime: '05:00 PM',
      influencerTalent: 'Devika (Model)',
      priority: 'HIGH',
      status: 'WAITING_FOR_TECHNICAL_REVIEW',
      estimatedCompletionDate: new Date(today.getTime() + 86400000 * 3),
      notes: 'Indoor product demonstration videos and social reels.',
      progressPercentage: 75,
      createdById: mediaManagerUser.id,
      indoorDetails: {
        create: {
          studioName: 'Studio 4 - Product Bay',
          studioAddress: 'Studio Floor 2, Media Ops HQ',
          studioBookingStatus: 'CONFIRMED',
          studioBookingRef: 'STU-2026-88',
          reportingTime: '09:00 AM',
          wrapUpTime: '05:00 PM',
          indoorEquipmentReqs: 'Sony FX3, Macro 90mm Lens, Softbox LED Grid',
          lightingRequirements: '3-point warm lighting setup',
          indoorChecklist: 'Props ready, Product bottles polished, Backdrop ironed',
        },
      },
    },
  });

  // Outdoor Project (Permission pending & Weather Risk)
  const project2 = await prisma.shootProject.create({
    data: {
      projectId: 'SP-000002',
      name: 'BN-150826-FACEWASH-OUTDOOR',
      clientId: client2.id,
      brandId: brand2.id,
      productId: product3.id,
      shootType: 'OUTDOOR',
      shootDate: new Date(today.getTime() + 86400000 * 2),
      shootLocation: 'Juhu Beach Promenade',
      locationCategory: 'Public Beach',
      locationAddress: 'Juhu Beach, Western Suburbs, Mumbai',
      locationContactPerson: 'Local Beach Permit Officer',
      reportingTime: '03:30 PM',
      expectedWrapUpTime: '07:30 PM',
      influencerTalent: 'Riya Sen (Influencer)',
      priority: 'CRITICAL',
      status: 'READY_FOR_PRODUCTION',
      estimatedCompletionDate: new Date(today.getTime() + 86400000 * 5),
      notes: 'Outdoor sunset shoot for face wash splash visuals.',
      progressPercentage: 25,
      createdById: mediaManagerUser.id,
      outdoorDetails: {
        create: {
          outdoorLocation: 'Juhu Beach Promenade',
          locationAddress: 'Juhu Beach, Western Suburbs, Mumbai',
          locationCategory: 'Public Beach',
          locationContactPerson: 'Local Beach Permit Officer',
          permissionStatus: 'PENDING',
          weatherStatus: 'RISK_RAIN',
          transportationReq: true,
          driver: undefined, // Transportation Not Assigned warning trigger
          logisticsCoordinator: 'Sunil (Logistics)',
          travelNotes: 'Van leaves office at 02:00 PM',
          outdoorEquipmentReqs: 'Sony FX3, ND Filters, Portable Reflector, Waterproof Case',
          droneRequirement: true,
          outdoorChecklist: 'Permit application submitted, Sun location mapped, Rain cover ready',
        },
      },
    },
  });

  // Project Assignments
  await prisma.projectAssignment.create({
    data: { projectId: project1.id, userId: staff1.id, roleInProject: 'Lead Video Editor' },
  });
  await prisma.projectAssignment.create({
    data: { projectId: project1.id, userId: staff2.id, roleInProject: 'Thumbnail & Graphic Artist' },
  });

  // 8. Scripts & Graphic Requirements
  const script1 = await prisma.script.create({
    data: {
      scriptId: 'SCR-000001',
      name: 'DW-130726-OJ-EN-001',
      projectId: project1.id,
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      language: 'English',
      category: 'Product Demo',
      objective: 'Highlight 100% natural immunity boost formula in 30 seconds.',
      description: 'Hook: Morning routine tiredness. Transition: Ojas spoon drop in warm water.',
      estimatedDuration: '30s',
      status: 'IN_PRODUCTION',
      priority: 'HIGH',
    },
  });

  const graphicReq1 = await prisma.graphicRequirement.create({
    data: {
      requirementId: 'GR-000001',
      name: 'DW-130726-OJ-EN-GD-001',
      projectId: project1.id,
      clientId: client1.id,
      brandId: brand1.id,
      calendarEventId: calendarEvent1.id,
      productId: product1.id,
      requirementType: 'Poster',
      objective: 'Social Media Instagram Feed banner for launch discount.',
      description: 'Minimalist green background with golden bottle accent.',
      priority: 'MEDIUM',
      status: 'READY',
    },
  });

  // 9. Tasks & Workload Capacity (Ahmed Overloaded at 9.5h on 8h capacity)
  const task1 = await prisma.task.create({
    data: {
      taskId: 'TSK-000001',
      title: 'Assembly Cut & Color Grading - Ojas Reel',
      description: 'Edit raw footage, apply brand green LUT, sync voiceover.',
      projectId: project1.id,
      scriptId: script1.id,
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      priority: 'HIGH',
      dueDate: today,
      estimatedHours: 5.5,
      status: 'IN_PROGRESS',
      completionPercentage: 70,
      remarks: 'Voiceover audio attached.',
    },
  });

  const task2 = await prisma.task.create({
    data: {
      taskId: 'TSK-000002',
      title: 'Sound Design & Subtitle Animation',
      description: 'Add dynamic kinetic subtitles and ambient sound effects.',
      projectId: project1.id,
      scriptId: script1.id,
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      priority: 'MEDIUM',
      dueDate: today,
      estimatedHours: 4.0, // Ahmed total = 5.5 + 4.0 = 9.5h (OVERLOADED)
      status: 'ASSIGNED',
      completionPercentage: 10,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      taskId: 'TSK-000003',
      title: 'Instagram Carousel Poster Design',
      description: 'Create 5-slide carousel explaining ingredients.',
      projectId: project1.id,
      graphicRequirementId: graphicReq1.id,
      clientId: client1.id,
      brandId: brand1.id,
      productId: product1.id,
      priority: 'MEDIUM',
      dueDate: new Date(today.getTime() + 86400000),
      estimatedHours: 5.0, // Sarah total = 5.0h (AVAILABLE)
      status: 'IN_PROGRESS',
      completionPercentage: 50,
    },
  });

  // Assign Tasks
  await prisma.taskAssignment.create({ data: { taskId: task1.id, userId: staff1.id } }); // Ahmed
  await prisma.taskAssignment.create({ data: { taskId: task2.id, userId: staff1.id } }); // Ahmed (Overloads him)
  await prisma.taskAssignment.create({ data: { taskId: task3.id, userId: staff2.id } }); // Sarah

  // 10. Equipment Inventory
  const eqp1 = await prisma.equipment.create({
    data: {
      equipmentId: 'EQP-000001',
      name: 'Sony FX3 Cinema Line Camera',
      category: 'Camera',
      brand: 'Sony',
      model: 'FX3',
      serialNumber: 'SN-FX3-90812',
      condition: 'Excellent',
      availability: 'ISSUED',
      currentHolder: 'Devika Sharma',
    },
  });

  const eqp2 = await prisma.equipment.create({
    data: {
      equipmentId: 'EQP-000002',
      name: 'Sony FE 24-70mm f/2.8 GM II Lens',
      category: 'Lens',
      brand: 'Sony',
      model: '24-70 GM II',
      serialNumber: 'SN-LNS-44102',
      condition: 'Good',
      availability: 'ISSUED',
      currentHolder: 'Devika Sharma',
    },
  });

  const eqp3 = await prisma.equipment.create({
    data: {
      equipmentId: 'EQP-000003',
      name: 'DJI Mavic 3 Pro Drone',
      category: 'Drone',
      brand: 'DJI',
      model: 'Mavic 3 Pro',
      serialNumber: 'SN-DRN-11002',
      condition: 'Minor Wear',
      availability: 'MAINTENANCE',
      maintenanceStatus: 'UNDER_REPAIR',
      internalNotes: 'Gimbal calibration issue under repair.',
    },
  });

  // 11. Attendance
  const staffUsers = [mediaManagerUser, techManagerUser, staff1, staff2, staff3, staff4];
  for (const u of staffUsers) {
    await prisma.attendance.create({
      data: {
        userId: u.id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        status: u.id === staff3.id ? 'LATE' : 'PRESENT',
        remarks: u.id === staff3.id ? 'Delayed by 20 mins due to traffic' : 'On time',
      },
    });
  }

  // 12. Approvals Queue (Pending Tech Review)
  await prisma.approval.create({
    data: {
      projectId: project1.id,
      approvalType: 'TECHNICAL_REVIEW',
      reviewerId: techManagerUser.id,
      status: 'PENDING',
      remarks: 'Waiting for resolution export check.',
    },
  });

  // 13. File metadata
  await prisma.fileMetadata.create({
    data: {
      fileName: 'DW-130726-OJ-Reel_v1_4K.mp4',
      fileSize: 450000000,
      fileType: 'video/mp4',
      storagePath: '/projects/SP-000001/Final Deliverables/DW-130726-OJ-Reel_v1_4K.mp4',
      activeVersion: true,
      projectId: project1.id,
      scriptId: script1.id,
      uploadedById: staff1.id,
    },
  });

  // 14. Activity Audit Logs
  await prisma.activityLog.create({
    data: {
      userId: mediaManagerUser.id,
      action: 'CREATE_PROJECT',
      entity: 'ShootProject',
      entityId: project1.id,
      description: 'Created Indoor Shoot Project SP-000001 (DW-130726-OJAS-INDOOR)',
    },
  });

  // 15. Output Formulas
  await prisma.outputFormula.createMany({
    data: [
      { deliverableType: 'Video Reel / Commercial', quantity: 1, outputValue: 1.0, description: '1 Video Reel counts as 1.0 standard output' },
      { deliverableType: 'Poster / Banner', quantity: 2, outputValue: 1.0, description: '2 Posters count as 1.0 standard output' },
      { deliverableType: 'Thumbnail Graphic', quantity: 8, outputValue: 1.0, description: '8 Thumbnails count as 1.0 standard output' },
    ],
  });

  // 16. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'PROJECT_NAMING_RULE', value: 'BrandCode-Date-ProductCode', description: 'Pattern for automated project naming' },
      { key: 'ALLOW_OVERLOAD_ASSIGNMENT', value: 'true', description: 'Allows manager to assign tasks over 8h with explicit warning' },
      { key: 'COMPANY_NAME', value: 'MOMS Media Operations', description: 'Platform Organization Name' },
    ],
  });

  console.log('Seed completed successfully (SQLite)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
