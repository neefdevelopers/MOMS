import { Injectable, NotFoundException } from '@nestjs/common';
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
      'Scripts',
      'Graphic Requirements',
      'Documents',
      'Final Deliverables',
      'Archive',
    ];

    const tree = folders.map((folderName) => {
      const folderFiles = project.files.filter((f) => {
        if (folderName === 'Raw Videos') return f.fileType.startsWith('video/') && !f.storagePath.includes('Final');
        if (folderName === 'Raw Photos') return f.fileType.startsWith('image/') && !f.storagePath.includes('Final');
        if (folderName === 'Scripts') return f.scriptId !== null || f.fileName.includes('Script');
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
      projectId: string;
      scriptId?: string;
      graphicRequirementId?: string;
      folderCategory?: string;
      attachmentCategory?: string;
    },
    uploadedById: string,
  ) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const folderCategory = data.folderCategory || 'Final Deliverables';
    const attachmentCategory = data.attachmentCategory || 'SCRIPT_DOCUMENT';
    const uploadDir = path.join(process.cwd(), 'uploads', 'projects', project.projectId, folderCategory);

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
    if (data.scriptId) {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: { projectId: data.projectId, scriptId: data.scriptId, attachmentCategory },
      });
    } else if (data.graphicRequirementId) {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: {
          projectId: data.projectId,
          graphicRequirementId: data.graphicRequirementId,
          attachmentCategory,
        },
      });
    } else {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: { projectId: data.projectId, storagePath: { contains: folderCategory } },
      });
    }

    // Delete older physical files & metadata records
    const oldFileNames: string[] = [];
    for (const oldFile of oldFiles) {
      oldFileNames.push(oldFile.fileName);
      const oldPhysicalPath = path.join(process.cwd(), oldFile.storagePath.replace(/^\//, ''));
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
        projectId: data.projectId,
        scriptId: data.scriptId || null,
        graphicRequirementId: data.graphicRequirementId || null,
        uploadedById,
      },
      include: { uploadedBy: { select: { id: true, name: true, role: true } } },
    });

    // Log revision history to permanent activity timeline
    if (data.scriptId) {
      const timelineDesc = oldFileNames.length > 0
        ? `Replaced production file '${oldFileNames.join(', ')}' with active version '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB). Revision history preserved.`
        : `Uploaded production file '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB) as active version.`;

      await this.prisma.scriptTimeline.create({
        data: {
          scriptId: data.scriptId,
          event: 'PRODUCTION_UPDATED',
          description: timelineDesc,
          triggeredById: uploadedById,
        },
      });
    } else if (data.graphicRequirementId) {
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
      scriptId?: string;
      graphicRequirementId?: string;
      fileSize?: number;
      fileType?: string;
      storagePath?: string;
    },
    uploadedById: string,
  ) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Project not found');

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
        scriptId: data.scriptId || null,
        graphicRequirementId: data.graphicRequirementId || null,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
        script: true,
        graphicRequirement: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: uploadedById,
        action: 'DELIVERABLE_CREATED',
        entity: 'FileMetadata',
        entityId: deliverable.id,
        description: `Created ${data.deliverableType} deliverable '${data.fileName}' linked to ${data.scriptId ? 'Script' : data.graphicRequirementId ? 'Graphic Requirement' : 'Project'}`,
      },
    });

    return deliverable;
  }
}
