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
    },
    uploadedById: string,
  ) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const folderCategory = data.folderCategory || 'Final Deliverables';
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

    // Active version management: mark previous files as inactive
    if (data.scriptId) {
      await this.prisma.fileMetadata.updateMany({
        where: { projectId: data.projectId, scriptId: data.scriptId },
        data: { activeVersion: false },
      });
    } else if (data.graphicRequirementId) {
      await this.prisma.fileMetadata.updateMany({
        where: { projectId: data.projectId, graphicRequirementId: data.graphicRequirementId },
        data: { activeVersion: false },
      });
    } else {
      await this.prisma.fileMetadata.updateMany({
        where: { projectId: data.projectId, storagePath: { contains: folderCategory } },
        data: { activeVersion: false },
      });
    }

    const fileRecord = await this.prisma.fileMetadata.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype || 'application/octet-stream',
        storagePath: relativeStoragePath,
        activeVersion: true,
        projectId: data.projectId,
        scriptId: data.scriptId || null,
        graphicRequirementId: data.graphicRequirementId || null,
        uploadedById,
      },
      include: { uploadedBy: { select: { id: true, name: true, role: true } } },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: uploadedById,
        action: 'UPLOAD_FILE',
        entity: 'FileMetadata',
        entityId: fileRecord.id,
        description: `Uploaded file '${file.originalname}' (${(file.size / 1024 / 1024).toFixed(2)} MB) to project ${project.projectId}`,
      },
    });

    return fileRecord;
  }
}
