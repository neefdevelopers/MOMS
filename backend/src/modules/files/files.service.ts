import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
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
    let project = await this.prisma.shootProject.findUnique({
      where: { id: projectId },
      include: {
        files: {
          include: {
            uploadedBy: { select: { id: true, name: true, role: true } },
            scriptEditorAssignments: { include: { user: true, assignedBy: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        calendarEvent: true,
      },
    });

    if (!project) {
      project = await this.prisma.shootProject.findFirst({
        where: {
          OR: [
            { id: projectId },
            { projectId: projectId },
          ],
        },
        include: {
          files: {
            include: {
              uploadedBy: { select: { id: true, name: true, role: true } },
              scriptEditorAssignments: { include: { user: true, assignedBy: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          calendarEvent: true,
        },
      });
    }

    if (!project) {
      // Check if projectId is a calendarEventId
      const calEvt = await this.prisma.mediaCalendarEvent.findUnique({
        where: { id: projectId },
        include: { shoot: true, shootProjects: true, graphicRequirement: true },
      });
      if (calEvt?.shootId) return this.getProjectFiles(calEvt.shootId);
      if (calEvt?.shootProjects && calEvt.shootProjects.length > 0) return this.getProjectFiles(calEvt.shootProjects[0].id);
      if (calEvt?.graphicRequirement?.projectId) return this.getProjectFiles(calEvt.graphicRequirement.projectId);

      // Check if projectId is a graphicRequirementId
      const gr = await this.prisma.graphicRequirement.findUnique({
        where: { id: projectId },
      });
      if (gr?.projectId) return this.getProjectFiles(gr.projectId);
    }

    if (!project) throw new NotFoundException('Project not found');

    // The script document cards read from this endpoint, so the editing state has to be
    // refreshed and the acceptance flag attached here too, not only on GET /projects/:id.
    await this.syncScriptEditingStatus(project.id);
    // Also fetch any extra files associated with this project or its human projectId code
    const extraFiles = await this.prisma.fileMetadata.findMany({
      where: {
        OR: [
          { projectId: project.id },
          { projectId: project.projectId },
        ],
      },
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
        scriptEditorAssignments: { include: { user: true, assignedBy: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // A task is accepted once it leaves the pre-acceptance states; the finish action stays
    // locked until then, so expose that explicitly to the UI.
    const PRE_ACCEPT = new Set(['PENDING', 'ASSIGNED', 'PENDING_MARKETING_APPROVAL', 'APPROVED']);
    const taskIds = Array.from(
      new Set(
        [...(project.files || []), ...extraFiles]
          .flatMap((f: any) => f.scriptEditorAssignments || [])
          .map((a: any) => a.taskId)
          .filter(Boolean),
      ),
    );
    const relatedTasks = taskIds.length
      ? await this.prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, status: true } })
      : [];
    const acceptedById = new Set(relatedTasks.filter((t) => !PRE_ACCEPT.has(t.status)).map((t) => t.id));

    const withAcceptance = (f: any) => ({
      ...f,
      scriptEditorAssignments: (f.scriptEditorAssignments || []).map((a: any) => ({
        ...a,
        taskAccepted: acceptedById.has(a.taskId),
      })),
    });

    const fileMap = new Map<string, any>();
    project.files.forEach((f) => fileMap.set(f.id, withAcceptance(f)));
    extraFiles.forEach((f) => fileMap.set(f.id, withAcceptance(f)));
    const combinedFiles = Array.from(fileMap.values());

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
      const folderFiles = combinedFiles.filter((f) => {
        if (folderName === 'Raw Videos') return f.fileType?.startsWith('video/') && !f.storagePath?.includes('Final');
        if (folderName === 'Raw Photos') return f.fileType?.startsWith('image/') && !f.storagePath?.includes('Final');
        if (folderName === 'Graphic Requirements') return f.graphicRequirementId !== null;
        if (folderName === 'Final Deliverables') return f.storagePath?.includes('Final') || f.activeVersion;
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
      allFiles: combinedFiles,
    };
  }

  /**
   * Mirrors the editing workflow state from each linked task onto its assignment row, so the
   * document cards show the live ACCEPTED / IN_REVIEW / COMPLETED state instead of whatever
   * was stored when the editor was assigned. Cheap no-op when nothing has a task yet.
   */
  private async syncScriptEditingStatus(projectId: string) {
    const assignments = await this.prisma.scriptEditorAssignment.findMany({
      where: { projectId, taskId: { not: null } },
      select: { id: true, taskId: true, editingStatus: true },
    });
    if (!assignments.length) return;

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: assignments.map((a) => a.taskId as string) } },
      select: { id: true, status: true },
    });
    const statusById = new Map(tasks.map((t) => [t.id, t.status]));

    for (const a of assignments) {
      const status = statusById.get(a.taskId as string);
      if (!status) continue;
      const next =
        status === 'COMPLETED'
          ? 'COMPLETED'
          : status === 'WAITING_FOR_TECHNICAL_REVIEW' || status === 'WAITING_FOR_MEDIA_REVIEW'
          ? 'IN_REVIEW'
          : status === 'IN_PROGRESS' || status === 'ON_HOLD'
          ? 'ACCEPTED'
          : 'ASSIGNED';
      if (next === a.editingStatus) continue;
      await this.prisma.scriptEditorAssignment
        .update({ where: { id: a.id }, data: { editingStatus: next } })
        .catch(() => null);
    }
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
        select: { id: true, projectId: true, clientId: true, brandId: true, productId: true, name: true, createdById: true },
      });
      if (gReq?.projectId) {
        resolvedProjectId = gReq.projectId;
      } else if (gReq) {
        let parentProj = await this.prisma.shootProject.findFirst({
          where: { clientId: gReq.clientId, brandId: gReq.brandId },
          orderBy: { createdAt: 'asc' },
        });

        if (!parentProj) {
          const spCount = await this.prisma.shootProject.count();
          let candidateSpId = `SP-${(spCount + 1).toString().padStart(6, '0')}`;
          let spSeq = spCount + 1;
          while (await this.prisma.shootProject.findFirst({ where: { projectId: candidateSpId } })) {
            spSeq++;
            candidateSpId = `SP-${spSeq.toString().padStart(6, '0')}`;
          }

          parentProj = await this.prisma.shootProject.create({
            data: {
              projectId: candidateSpId,
              name: `[VAULT] ${gReq.name || 'Client Assets'}`,
              clientId: gReq.clientId,
              brandId: gReq.brandId,
              productId: gReq.productId || null,
              shootType: 'INDOOR',
              shootDate: new Date(),
              shootLocation: 'Media Ops Studio Bay',
              priority: 'MEDIUM',
              status: 'PLANNED',
              createdById: uploadedById || gReq.createdById || 'SYSTEM',
            },
          });
        }

        resolvedProjectId = parentProj.id;
        await this.prisma.graphicRequirement.update({
          where: { id: gReq.id },
          data: { projectId: parentProj.id },
        }).catch(() => null);
      }
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

      if (!resolvedProjectId && event) {
        let parentProj = await this.prisma.shootProject.findFirst({
          where: { clientId: event.clientId, brandId: event.brandId },
          orderBy: { createdAt: 'asc' },
        });

        if (!parentProj) {
          const spCount = await this.prisma.shootProject.count();
          let candidateSpId = `SP-${(spCount + 1).toString().padStart(6, '0')}`;
          let spSeq = spCount + 1;
          while (await this.prisma.shootProject.findFirst({ where: { projectId: candidateSpId } })) {
            spSeq++;
            candidateSpId = `SP-${spSeq.toString().padStart(6, '0')}`;
          }

          parentProj = await this.prisma.shootProject.create({
            data: {
              projectId: candidateSpId,
              name: `[VAULT] ${event.title || 'Client Assets'}`,
              clientId: event.clientId,
              brandId: event.brandId,
              productId: event.productId || null,
              shootType: 'INDOOR',
              shootDate: event.shootDate || new Date(),
              shootLocation: 'Media Ops Studio Bay',
              priority: 'MEDIUM',
              status: 'PLANNED',
              createdById: uploadedById || event.createdById || 'SYSTEM',
            },
          });
        }

        resolvedProjectId = parentProj.id;
        await this.prisma.mediaCalendarEvent.update({
          where: { id: event.id },
          data: { shootId: parentProj.id },
        }).catch(() => null);

        if (event.graphicRequirementId) {
          await this.prisma.graphicRequirement.update({
            where: { id: event.graphicRequirementId },
            data: { projectId: parentProj.id },
          }).catch(() => null);
        }
      }
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

    // Replace older versions: For standard single deliverables, replace old versions. For script documents / references, allow multiple files and only replace if exact same filename.
    let oldFiles: any[] = [];
    if (isScriptDoc) {
      oldFiles = await this.prisma.fileMetadata.findMany({
        where: {
          projectId: resolvedProjectId,
          fileName: file.originalname,
          attachmentCategory: 'SCRIPT_DOCUMENT',
        },
      });
    } else if (data.attachmentCategory !== 'REFERENCES' && data.attachmentCategory !== 'ATTACHMENTS') {
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

  /**
   * Deletes a file record and its physical copy.
   *
   * Permission mirrors the clip-code rule on the same documents: the uploader, staff assigned
   * to the parent project, and managers/admins may delete; every other authenticated user is
   * refused. Without this check any logged-in account could delete any project's script.
   */
  async deleteFile(id: string, user?: any) {
    const file = await this.prisma.fileMetadata.findUnique({
      where: { id },
      select: { id: true, fileName: true, projectId: true, uploadedById: true, storagePath: true },
    });
    if (!file) throw new NotFoundException('File not found');

    const userId = user?.id || user?.sub;
    const isManager = ['ADMIN', 'ADMINISTRATOR', 'MEDIA_MANAGER', 'MARKETING_MANAGER', 'TECHNICAL_MANAGER'].includes(
      user?.role,
    );
    const isUploader = file.uploadedById && file.uploadedById === userId;
    const isAssigned = file.projectId
      ? await this.prisma.projectAssignment.findFirst({
          where: { projectId: file.projectId, userId },
          select: { id: true },
        })
      : null;

    if (!isManager && !isUploader && !isAssigned) {
      throw new ForbiddenException(
        'You do not have permission to delete this document. Only the uploader, staff assigned to the project, or a manager can delete it.',
      );
    }

    // storagePath is stored URL-style ("/uploads/..."), so resolve it against the upload
    // root before touching disk. The old code passed the raw value to existsSync, which
    // never matched, so files were orphaned on disk instead of being removed.
    if (file.storagePath && !file.storagePath.startsWith('http')) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      const rel = file.storagePath.replace(/^\/?uploads\/?/, '');
      const abs = rel ? path.join(uploadDir, rel) : '';
      if (abs && fs.existsSync(abs)) {
        try {
          fs.unlinkSync(abs);
        } catch (e) {
          console.warn('Could not delete physical file:', e);
        }
      }
    }

    await this.prisma.fileMetadata.delete({ where: { id } });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id || user?.sub || null,
        action: 'DELETE_FILE',
        entity: 'FileMetadata',
        entityId: id,
        description: `Deleted file '${file.fileName}'`,
      },
    });

    return { message: 'File deleted successfully', id };
  }

  /**
   * Adds or removes a clip code on an uploaded script document.
   *
   * Codes live on the FileMetadata row (clipCodes JSON), not in the project's script
   * blob, so this is the single writable path for document clip codes. Strictly limited
   * to staff assigned to the parent project - no admin or manager override. Every other
   * role can still read the codes on the project files response.
   */
  async updateFileClipCode(
    id: string,
    action: 'add' | 'remove',
    payload: { code?: string; description?: string },
    user: any,
  ) {
    const file = await this.prisma.fileMetadata.findUnique({
      where: { id },
      select: { id: true, fileName: true, clipCodes: true, projectId: true },
    });
    if (!file) throw new NotFoundException('File not found');

    // Strictly assigned staff only - no admin or manager override.
    const assignment = await this.prisma.projectAssignment.findFirst({
      where: { projectId: file.projectId, userId: user?.id || user?.sub },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'Only staff assigned to this project may add or remove clip codes on a script document. You have read-only access.',
      );
    }

    let existing: any[] = [];
    if (file.clipCodes) {
      try {
        const parsed = JSON.parse(file.clipCodes);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }

    const code = (payload.code || '').trim();
    if (!code) throw new BadRequestException('A clip code is required.');

    let next: any[];
    if (action === 'add') {
      if (existing.some((c: any) => String(c?.code || '').toLowerCase() === code.toLowerCase())) {
        throw new ConflictException(`Clip code "${code}" already exists on this document.`);
      }
      next = [
        ...existing,
        {
          code,
          description: (payload.description || '').trim(),
          addedBy: user?.name || user?.email || null,
          addedAt: new Date().toISOString(),
        },
      ];
    } else {
      next = existing.filter((c: any) => String(c?.code || '') !== code);
    }

    await this.prisma.fileMetadata.update({
      where: { id },
      data: { clipCodes: JSON.stringify(next) },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id || user?.sub || null,
        action: action === 'add' ? 'ADD_CLIP_CODE' : 'REMOVE_CLIP_CODE',
        entity: 'FileMetadata',
        entityId: id,
        description: `${action === 'add' ? 'Added' : 'Removed'} clip code ${code} on '${file.fileName}'`,
      },
    });

    return { id, clipCodes: next };
  }
}
