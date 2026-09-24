import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async getProjectFiles(projectId: string) {
    const project = await this.prisma.shootProject.findUnique({
      where: { id: projectId },
      include: {
        files: {
          include: { uploadedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Virtual Folder Tree Generation
    const folders = [
      'Raw Videos',
      'Raw Photos',
      'Graphic Requirements',
      'Documents',
      'Final Deliverables',
      'Archive',
    ];

    const tree = folders.map((folderName) => {
      const folderFiles = project.files.filter((f) => {
        if (folderName === 'Raw Videos') return f.fileType.startsWith('video/') && !f.storagePath.includes('Final');
        if (folderName === 'Raw Photos') return f.fileType.startsWith('image/') && !f.storagePath.includes('Final');
        if (folderName === 'Graphic Requirements') return f.graphicRequirementId !== null;
        if (folderName === 'Final Deliverables') return f.storagePath.includes('Final') || f.activeVersion;
        if (folderName === 'Archive') return !f.activeVersion;
        return true; // Documents default
      });

      return {
        folderName,
        files: folderFiles,
      };
    });

    return {
      projectId: project.projectId,
      projectName: project.name,
      tree,
      allFiles: project.files,
    };
  }

  async saveFileMetadataAndPhysicalDisk(
    file: MulterFile,
    data: {
      projectId?: string;
      calendarEventId?: string;
      taskId?: string;
      graphicRequirementId?: string;
      folderCategory?: string;
      attachmentCategory?: string;
    },
    userParam: any,
  ) {
    const uploadedById = typeof userParam === 'string' ? userParam : userParam?.id;
    const userRole = typeof userParam === 'object' ? userParam?.role : null;
    const isScriptDoc = data.attachmentCategory === 'SCRIPT_DOCUMENT' || data.folderCategory === 'Script Documents';

    let resolvedProjectId = data.projectId;

    if (!resolvedProjectId && data.graphicRequirementId) {
      const gReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: data.graphicRequirementId },
        select: { projectId: true },
      });
      if (gReq?.projectId) resolvedProjectId = gReq.projectId;
    }

    if (!resolvedProjectId && data.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: data.taskId },
        select: { projectId: true, graphicRequirement: { select: { projectId: true } } },
      });
      if (task?.projectId) resolvedProjectId = task.projectId;
      else if (task?.graphicRequirement?.projectId) resolvedProjectId = task.graphicRequirement.projectId;
    }

    if (!resolvedProjectId && data.calendarEventId) {
      const event = await this.prisma.mediaCalendarEvent.findUnique({
        where: { id: data.calendarEventId },
        include: { shoot: true, shootProjects: true, graphicRequirement: true },
      });
      if (event?.shootId) resolvedProjectId = event.shootId;
      else if (event?.shootProjects && event.shootProjects.length > 0) resolvedProjectId = event.shootProjects[0].id;
      else if (event?.graphicRequirement?.projectId) resolvedProjectId = event.graphicRequirement.projectId;
    }

    if (data.graphicRequirementId) {
      const gReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: data.graphicRequirementId },
        include: {
          project: { include: { assignedTeam: true } },
          tasks: { include: { assignedEmployees: true } },
        },
      });
      if (gReq) {
        const isGReqReviewLocked = [
          'WAITING_FOR_TECHNICAL_REVIEW',
          'TECHNICAL_REVIEW',
          'WAITING_FOR_MEDIA_REVIEW',
          'MEDIA_MANAGER_REVIEW',
          'WAITING_FOR_MARKETING_APPROVAL',
          'PENDING_MARKETING_APPROVAL',
          'PENDING_CLIENT_APPROVAL',
          'PENDING_CLIENT_REVIEW',
          'WAITING_FOR_CLIENT_CONFIRMATION',
          'COMPLETED',
        ].includes(gReq.status);

        const isPrivilegedRole = ['ADMIN', 'ADMINISTRATOR', 'MARKETING_MANAGER', 'MEDIA_MANAGER'].includes(userRole);

        if (isGReqReviewLocked && !isPrivilegedRole && !isScriptDoc) {
          throw new ForbiddenException(
            'Graphic Requirement is currently under review and in read-only mode. Deliverable uploads are locked during review.',
          );
        }

        if (!isPrivilegedRole && uploadedById) {
          const isTaskAssigned =
            Array.isArray(gReq.tasks) &&
            gReq.tasks.some(
              (t: any) =>
                t.assignedToId === uploadedById ||
                (Array.isArray(t.assignedEmployees) &&
                  t.assignedEmployees.some((e: any) => e.userId === uploadedById || e.employeeId === uploadedById || e.user?.id === uploadedById)),
            );
          const isCreator = (gReq as any).createdById === uploadedById;

          if (!isTaskAssigned && !isCreator && !isScriptDoc) {
            throw new ForbiddenException(
              'Only the assigned team/staff member to whom this Graphic Requirement is assigned can upload deliverable files.',
            );
          }
        }
      }
    }

    if (!resolvedProjectId) {
      throw new NotFoundException('Parent project not found or could not be resolved');
    }

    const project = await this.prisma.shootProject.findUnique({ where: { id: resolvedProjectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const isProjectReviewLocked = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_MARKETING_APPROVAL',
      'PENDING_CLIENT_APPROVAL',
      'PENDING_CLIENT_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'COMPLETED',
    ].includes(project.status);

    const isPrivilegedRole = ['ADMIN', 'ADMINISTRATOR', 'MARKETING_MANAGER', 'MEDIA_MANAGER'].includes(userRole);

    if (isProjectReviewLocked && !isPrivilegedRole && !isScriptDoc) {
      throw new ForbiddenException(
        'Project is currently under review and in read-only mode. File uploads and deliverable additions are locked during review.',
      );
    }

    const folderCategory = data.folderCategory || (isScriptDoc ? 'Script Documents' : 'Final Deliverables');
    const attachmentCategory = data.attachmentCategory || (isScriptDoc ? 'SCRIPT_DOCUMENT' : 'DOCUMENT');
    const baseUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const uploadDir = path.join(baseUploadDir, 'projects', project.projectId, folderCategory);

    // Create physical directory recursively on server disk
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const physicalFilePath = path.join(uploadDir, file.originalname);
    if (file.buffer) {
      fs.writeFileSync(physicalFilePath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.writeFileSync(physicalFilePath, fs.readFileSync(file.path));
    }

    const relativeStoragePath = `/uploads/projects/${project.projectId}/${folderCategory}/${file.originalname}`;

    // Replace older versions: Delete physical disk file & old DB metadata record so multiple large media files are NOT maintained.
    let oldFiles: any[] = [];
    if (data.graphicRequirementId) {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: {
          projectId: resolvedProjectId,
          graphicRequirementId: data.graphicRequirementId,
          attachmentCategory,
        },
      });
    } else {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: { projectId: resolvedProjectId, storagePath: { contains: folderCategory } },
      });
    }

    // Delete older physical files & metadata records
    const oldFileNames: string[] = [];
    for (const oldFile of oldFiles) {
      oldFileNames.push(oldFile.fileName);
      const cleanSubPath = oldFile.storagePath.replace(/^\/?uploads\/?/, '');
      const oldPhysicalPath = path.join(baseUploadDir, cleanSubPath);
      if (fs.existsSync(oldPhysicalPath)) {
        try {
          fs.unlinkSync(oldPhysicalPath);
        } catch (err) {
          console.warn(`Could not delete old physical file ${oldPhysicalPath}:`, err);
        }
      }
      await this.prisma.fileMetadata.delete({ where: { id: oldFile.id } });
    }

    const fileRecord = await this.prisma.fileMetadata.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype || 'application/octet-stream',
        storagePath: relativeStoragePath,
        activeVersion: true,
        attachmentCategory,
        projectId: resolvedProjectId,
        graphicRequirementId: data.graphicRequirementId || null,
        uploadedById,
      },
      include: { uploadedBy: { select: { id: true, name: true, role: true } } },
    });

    // Log revision history to permanent activity timeline
    if (data.graphicRequirementId) {
      const linkedTasks = await this.prisma.task.findMany({
        where: { graphicRequirementId: data.graphicRequirementId },
      });
      const isReplacement = oldFileNames.length > 0;
      const timelineDesc = isReplacement
        ? `Production file replaced [Category: ${attachmentCategory}]: '${oldFileNames.join(', ')}' → active version '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB). Previous file deactivated. Revision history preserved in timeline.`
        : `Production file uploaded [Category: ${attachmentCategory}]: '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB) set as active version.`;

      // ── RULE: Revision history maintained in GraphicRequirementTimeline (never deleted) ──
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: data.graphicRequirementId,
          userId: uploadedById,
          event: isReplacement ? 'PRODUCTION_UPDATED' : 'PRODUCTION_STARTED',
          description: timelineDesc,
        },
      });

      // Also log to linked task timelines
      for (const t of linkedTasks) {
        await this.prisma.taskTimeline.create({
          data: {
            taskId: t.id,
            userId: uploadedById,
            event: 'FILE_UPLOADED',
            description: timelineDesc,
          },
        });
      }
    }

    await this.prisma.activityLog.create({
      data: {
        userId: uploadedById,
        action: 'UPLOAD_FILE',
        entity: 'FileMetadata',
        entityId: fileRecord.id,
        description: oldFileNames.length > 0
          ? `Replaced production file '${oldFileNames.join(', ')}' with '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB) in project ${project.projectId}. Disk cleaned up.`
          : `Uploaded file '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB) to project ${project.projectId}`,
      },
    });

    return fileRecord;
  }

  async createDeliverableMetadata(
    data: {
      projectId: string;
      fileName: string;
      deliverableType: string; // Video, Reel, Poster, Carousel, Story, Motion Graphic, Banner
      graphicRequirementId?: string;
      fileSize?: number;
      fileType?: string;
      storagePath?: string;
    },
    uploadedById: string,
    userRole?: string,
  ) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const isProjectReviewLocked = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_MARKETING_APPROVAL',
      'PENDING_CLIENT_APPROVAL',
      'PENDING_CLIENT_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'COMPLETED',
    ].includes(project.status);

    if (isProjectReviewLocked && userRole !== 'ADMIN' && userRole !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Project is currently under review and in read-only mode. Adding deliverables is locked during review.',
      );
    }

    const relativePath =
      data.storagePath || `/deliverables/${project.projectId}/${data.deliverableType}/${data.fileName}`;

    const deliverable = await this.prisma.fileMetadata.create({
      data: {
        fileName: `[${data.deliverableType}] ${data.fileName}`,
        fileSize: data.fileSize || 15728640,
        fileType: data.fileType || (['Poster', 'Banner', 'Carousel', 'Story'].includes(data.deliverableType) ? 'image/jpeg' : 'video/mp4'),
        storagePath: relativePath,
        activeVersion: true,
        projectId: data.projectId,
        graphicRequirementId: data.graphicRequirementId || null,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
        graphicRequirement: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: uploadedById,
        action: 'DELIVERABLE_CREATED',
        entity: 'FileMetadata',
        entityId: deliverable.id,
        description: `Created ${data.deliverableType} deliverable '${data.fileName}' linked to ${data.graphicRequirementId ? 'Graphic Requirement' : 'Project'}`,
      },
    });

    return deliverable;
  }
}
