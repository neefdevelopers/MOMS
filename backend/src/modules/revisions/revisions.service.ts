import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RequestRevisionDto,
  SubmitRevisionDto,
  ReviewRevisionDecisionDto,
  ReassignRevisionDto,
} from './dto/revisions.dto';

@Injectable()
export class RevisionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * 1. Request Revision (Reviewer Sends Work Back for Changes)
   * Enforces Role & Review Stage Validation
   */
  async requestRevision(
    dto: RequestRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    // SECURITY RULE 1: Staff CANNOT request revision or approve their own work
    if (user.role === 'STAFF') {
      throw new ForbiddenException(
        'Business Rule Violation: Staff members cannot request revisions or approve their own work.',
      );
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Revision Reason is mandatory and cannot be empty.');
    }

    if (!dto.detailedRequest || !dto.detailedRequest.trim()) {
      throw new BadRequestException(
        'Detailed Change Request is mandatory. Reviewer must explain required changes.',
      );
    }

    const reviewStage = dto.reviewStage || 'TECHNICAL_REVIEW';

    // SECURITY RULE 2: Reviewer Stage Check
    if (user.role === 'TECHNICAL_MANAGER' && reviewStage === 'MEDIA_REVIEW') {
      throw new ForbiddenException(
        'Technical Manager cannot override or request revisions during Media Manager Review stage.',
      );
    }

    // Resolve original assigned employee for the entity
    let originalAssigneeId = dto.originalAssigneeId || null;
    let resolvedProjectId = dto.projectId || null;
    let entityTitle = 'Production Item';

    if (dto.entityType === 'PROJECT') {
      const project = await this.prisma.shootProject.findUnique({
        where: { id: dto.entityId },
        include: { assignedTeam: true },
      });
      if (project) {
        resolvedProjectId = project.id;
        entityTitle = project.name;
        if (!originalAssigneeId && project.assignedTeam.length > 0) {
          originalAssigneeId = project.assignedTeam[0].userId;
        }
      }
    } else if (dto.entityType === 'SCRIPT') {
      const script = await this.prisma.script.findUnique({
        where: { id: dto.entityId },
        include: { scriptAssignments: true },
      });
      if (script) {
        resolvedProjectId = script.projectId;
        entityTitle = `${script.scriptId}: ${script.name}`;
        if (!originalAssigneeId && script.scriptAssignments.length > 0) {
          originalAssigneeId = script.scriptAssignments[0].userId;
        }
      }
    } else if (dto.entityType === 'GRAPHIC_REQ') {
      const graphic = await this.prisma.graphicRequirement.findUnique({
        where: { id: dto.entityId },
      });
      if (graphic) {
        resolvedProjectId = graphic.projectId;
        entityTitle = `${graphic.requirementId}: ${graphic.name}`;
      }
    } else if (dto.entityType === 'CALENDAR' || dto.entityType === 'CALENDAR_EVENT') {
      const calEv = await this.prisma.mediaCalendarEvent.findUnique({
        where: { id: dto.entityId },
      });
      if (calEv) {
        resolvedProjectId = calEv.shootId || null;
        entityTitle = `${calEv.eventId || calEv.id}: ${calEv.title}`;
        if (!originalAssigneeId && calEv.assignedStaffId) {
          originalAssigneeId = calEv.assignedStaffId;
        }
      }
    } else if (dto.entityType === 'TASK') {
      const task = await this.prisma.task.findUnique({
        where: { id: dto.entityId },
        include: {
          assignedEmployees: true,
          timeline: { where: { event: 'TASK_CREATED' } },
          script: { select: { id: true, createdById: true } },
        },
      });
      if (task) {
        const isAdmin = user.role === 'ADMINISTRATOR' || (user.role as string) === 'ADMIN';
        const createdByUserId = task.timeline?.[0]?.userId || (task.script as any)?.createdById;

        // SECURITY RULE: Only the user who created this task (or Administrator) can assign/request a revision
        if (!isAdmin && createdByUserId && user.id !== createdByUserId) {
          throw new ForbiddenException(
            'Business Rule Violation: Only the user who created this task can request or assign a revision.',
          );
        }

        resolvedProjectId = task.projectId || null;
        entityTitle = `${task.taskId}: ${task.title}`;
        if (!originalAssigneeId && task.assignedEmployees.length > 0) {
          originalAssigneeId = task.assignedEmployees[0].userId;
        }
      } else {
        throw new NotFoundException(`Task with ID ${dto.entityId} not found.`);
      }
    }

    // Fallback if originalAssigneeId still null
    if (!originalAssigneeId) {
      originalAssigneeId = user.id;
    }

    // Determine target assignee:
    // Only Media Manager can reassign to another employee. Technical Manager cannot freely reassign.
    let assignedToId = originalAssigneeId;
    if (user.role === 'MEDIA_MANAGER' && dto.assignedToId) {
      assignedToId = dto.assignedToId;
    }

    // Count existing revisions for this entity to set revisionNumber
    const existingCount = await this.prisma.revision.count({
      where: { entityType: dto.entityType, entityId: dto.entityId },
    });
    const revisionNumber = existingCount + 1;

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const priority = dto.priority ? dto.priority.toUpperCase() : 'MEDIUM';

    // 1. Create Revision record (always link directly to task if entity is TASK)
    const revision = await this.prisma.revision.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        taskId: dto.entityType === 'TASK' ? dto.entityId : null,
        projectId: resolvedProjectId,
        revisionNumber,
        reason: dto.reason.trim(),
        detailedRequest: dto.detailedRequest.trim(),
        priority,
        dueDate,
        specificArea: dto.specificArea?.trim() || null,
        reviewerComments: dto.reviewerComments?.trim() || null,
        reviewStage,
        requestedById: user.id,
        originalAssigneeId,
        assignedToId,
        status: 'REVISION_REQUESTED',
        previousVersionUrl: dto.previousVersionUrl || null,
        referenceAttachmentUrl: dto.referenceAttachmentUrl || null,
      },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // 2. REVISION WORKFLOW EXECUTION
    if (dto.entityType === 'TASK') {
      // RULE: Do NOT create a new task. Restart existing task workflow in-place.
      try {
        const updatedTask = await this.prisma.task.update({
          where: { id: dto.entityId },
          data: {
            status: 'ASSIGNED',
            completionPercentage: 0,
            priority,
            dueDate: dueDate || undefined,
            remarks: `Revision #${revisionNumber}: ${dto.reason.trim()}`,
            technicalReviewApproved: false,
            mediaManagerApproved: false,
          },
        });

        // Reassign/update task assignment with NOT_YET_ACCEPTED so acceptance is strictly required
        await this.prisma.taskAssignment.deleteMany({
          where: { taskId: dto.entityId },
        });

        await this.prisma.taskAssignment.create({
          data: {
            taskId: dto.entityId,
            userId: assignedToId,
            acceptanceStatus: 'NOT_YET_ACCEPTED',
          },
        });

        // If this task is linked to a script, reset the script to ASSIGNED as well!
        if (updatedTask.scriptId) {
          await this.prisma.script.update({
            where: { id: updatedTask.scriptId },
            data: {
              status: 'ASSIGNED',
              preTechnicalReviewStatus: 'ASSIGNED',
              revisionCount: { increment: 1 },
              technicalReviewApproved: false,
              mediaManagerReviewApproved: false,
              marketingManagerApproved: false,
              rejectionReason: dto.reason.trim(),
            },
          });
        }

        // Log timeline event for revision request
        await this.prisma.taskTimeline.create({
          data: {
            taskId: dto.entityId,
            userId: user.id,
            event: 'REVISION_REQUESTED',
            description: `Revision #${revisionNumber} requested by ${user.name}. Reason: ${dto.reason.trim()}`,
          },
        });
      } catch (e) {
        console.error('Error updating existing task for revision:', e);
      }
    } else if (dto.entityType === 'SCRIPT') {
      // Reset Script to ASSIGNED and reset all review approvals
      try {
        await this.prisma.script.update({
          where: { id: dto.entityId },
          data: {
            status: 'ASSIGNED',
            preTechnicalReviewStatus: 'ASSIGNED',
            revisionCount: { increment: 1 },
            technicalReviewApproved: false,
            mediaManagerReviewApproved: false,
            marketingManagerApproved: false,
            rejectionReason: dto.reason.trim(),
          },
        });

        // Find existing tasks for this script and restart them in-place with ASSIGNED and NOT_YET_ACCEPTED
        const existingScriptTasks = await this.prisma.task.findMany({
          where: { scriptId: dto.entityId },
        });

        if (existingScriptTasks.length > 0) {
          for (const t of existingScriptTasks) {
            await this.prisma.task.update({
              where: { id: t.id },
              data: {
                status: 'ASSIGNED',
                completionPercentage: 0,
                technicalReviewApproved: false,
                mediaManagerApproved: false,
                remarks: `Revision #${revisionNumber}: ${dto.reason.trim()}`,
              },
            });

            await this.prisma.taskAssignment.deleteMany({
              where: { taskId: t.id },
            });

            await this.prisma.taskAssignment.create({
              data: {
                taskId: t.id,
                userId: assignedToId,
                acceptanceStatus: 'NOT_YET_ACCEPTED',
              },
            });
          }

          // Link primary task to revision record
          await this.prisma.revision.update({
            where: { id: revision.id },
            data: { taskId: existingScriptTasks[0].id },
          });
        }
      } catch (e) {
        console.error('Error resetting script for revision:', e);
      }
    } else {
      // AUTOMATIC TASK IN-PLACE UPDATE for Project / Graphic Item Revisions (No duplicate task rows created)
      try {
        let clientId = null;
        let brandId = null;
        let productId = null;

        if (resolvedProjectId) {
          const proj = await this.prisma.shootProject.findUnique({
            where: { id: resolvedProjectId },
            select: { clientId: true, brandId: true, productId: true },
          });
          if (proj) {
            clientId = proj.clientId;
            brandId = proj.brandId;
            productId = proj.productId;
          }
        }

        const existingEntityTasks = await this.prisma.task.findMany({
          where: {
            OR: [
              ...(dto.entityType === 'GRAPHIC_REQ' ? [{ graphicRequirementId: dto.entityId }] : []),
              ...(dto.entityType === 'PROJECT' && resolvedProjectId ? [{ projectId: resolvedProjectId }] : []),
              ...((dto.entityType === 'CALENDAR' || dto.entityType === 'CALENDAR_EVENT') && resolvedProjectId ? [{ projectId: resolvedProjectId }] : []),
            ],
          },
        });

        if (existingEntityTasks.length > 0) {
          // Restart existing tasks in-place WITHOUT creating duplicate tasks
          for (const t of existingEntityTasks) {
            await this.prisma.task.update({
              where: { id: t.id },
              data: {
                status: 'ASSIGNED',
                completionPercentage: 0,
                priority,
                dueDate: dueDate || undefined,
                remarks: `Revision #${revisionNumber}: ${dto.reason.trim()}`,
                technicalReviewApproved: false,
                mediaManagerApproved: false,
              },
            });

            await this.prisma.taskAssignment.deleteMany({
              where: { taskId: t.id },
            });

            await this.prisma.taskAssignment.create({
              data: {
                taskId: t.id,
                userId: assignedToId,
                acceptanceStatus: 'NOT_YET_ACCEPTED',
              },
            });

            // Log timeline event for revision request on this task
            await this.prisma.taskTimeline.create({
              data: {
                taskId: t.id,
                userId: user.id,
                event: 'REVISION_REQUESTED',
                description: `Revision #${revisionNumber} requested by ${user.name}. Reason: ${dto.reason.trim()}`,
              },
            }).catch(() => null);
          }

          // Link first task to revision record
          await this.prisma.revision.update({
            where: { id: revision.id },
            data: { taskId: existingEntityTasks[0].id },
          });

          if (dto.entityType === 'CALENDAR' || dto.entityType === 'CALENDAR_EVENT') {
            await this.prisma.calendarApprovalHistory.create({
              data: {
                calendarEventId: dto.entityId,
                version: revisionNumber,
                userId: user.id,
                role: user.role || 'MARKETING_MANAGER',
                action: 'CHANGES_REQUESTED',
                previousStatus: 'APPROVED',
                newStatus: 'CHANGES_REQUESTED',
                comment: `Revision #${revisionNumber} requested by ${user.name}: ${dto.reason.trim()}`,
              },
            }).catch(() => null);
          }
        } else {
          // Only create a new task if no task ever existed for this item
          if (!clientId) {
            const firstClient = await this.prisma.client.findFirst();
            if (firstClient) clientId = firstClient.id;
          }
          if (!brandId) {
            const firstBrand = await this.prisma.brand.findFirst();
            if (firstBrand) brandId = firstBrand.id;
          }

          let taskCount = await this.prisma.task.count();
          let autoTaskId = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
          let existingTask = await this.prisma.task.findUnique({ where: { taskId: autoTaskId } });
          while (existingTask) {
            taskCount++;
            autoTaskId = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
            existingTask = await this.prisma.task.findUnique({ where: { taskId: autoTaskId } });
          }

          const taskTitle = `Revision Required – ${entityTitle}`;
          const taskDesc = `Revision Description:\n${dto.detailedRequest.trim()}\n\nReason:\n${dto.reason.trim()}\n\nRelated Item: ${entityTitle}\nRemarks: ${dto.reviewerComments || 'None'}\nSpecific Area: ${dto.specificArea || 'N/A'}`;

          const createdTask = await this.prisma.task.create({
            data: {
              taskId: autoTaskId,
              title: taskTitle,
              description: taskDesc,
              projectId: resolvedProjectId || null,
              scriptId: dto.entityType === 'SCRIPT' ? dto.entityId : null,
              graphicRequirementId: dto.entityType === 'GRAPHIC_REQ' ? dto.entityId : null,
              clientId: clientId || '',
              brandId: brandId || '',
              productId: productId || null,
              priority,
              dueDate: dueDate || new Date(Date.now() + 86400000 * 3),
              estimatedHours: 2.0,
              status: 'ASSIGNED',
              completionPercentage: 0,
              sourceType: 'REVISION',
              taskType: 'REVISION',
              revisionId: revision.id,
              assignedEmployees: {
                create: [
                  {
                    userId: assignedToId,
                    acceptanceStatus: 'NOT_YET_ACCEPTED',
                  },
                ],
              },
            },
          });

          // Link Task ID back to Revision record
          await this.prisma.revision.update({
            where: { id: revision.id },
            data: { taskId: createdTask.id },
          });
        }
      } catch (e) {
        console.error('Error handling task for revision:', e);
      }
    }

    // 3. Update Parent Production Project / Graphic Requirement status
    try {
      if (dto.entityType === 'PROJECT' && resolvedProjectId) {
        await this.prisma.shootProject.update({
          where: { id: resolvedProjectId },
          data: {
            status: 'REVISION_REQUESTED',
            revisionCount: { increment: 1 },
          },
        });
      } else if (dto.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: dto.entityId },
          data: {
            status: 'REVISION_REQUESTED',
            revisionCount: { increment: 1 },
          },
        });
      } else if (dto.entityType === 'CALENDAR' || dto.entityType === 'CALENDAR_EVENT') {
        await this.prisma.mediaCalendarEvent.update({
          where: { id: dto.entityId },
          data: {
            status: 'CHANGES_REQUESTED',
            version: { increment: 1 },
          },
        });
      }
    } catch (e) {}

    // 3. Create linked Internal Communication entry (REVIEW_COMMENT / BLOCKER)
    try {
      const assigneeUser = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { name: true, role: true },
      });

      await (this.prisma.communication as any).create({
        data: {
          entityType: dto.entityType,
          entityId: dto.entityId,
          projectId: resolvedProjectId,
          senderId: user.id,
          type: 'REVIEW_COMMENT',
          subject: `[REVISION #${revisionNumber}] ${dto.reason}`,
          content: `Revision #${revisionNumber} requested by ${user.name} (${user.role.replace(/_/g, ' ')}).\n\nReason: ${dto.reason}\nDetailed Request: ${dto.detailedRequest}\nSpecific Area: ${dto.specificArea || 'N/A'}\nDue Date: ${dueDate ? dueDate.toLocaleDateString() : 'N/A'}`,
          recipients: assigneeUser ? `${assigneeUser.name} (${assigneeUser.role})` : 'Assigned Employee',
          assignedToId,
          status: 'SENT',
          priority,
        },
      });
    } catch (e) {}

    // 4. Send Notification to Assigned Employee
    try {
      await this.prisma.notification.create({
        data: {
          userId: assignedToId,
          title: `Revision Requested: ${entityTitle} (Revision #${revisionNumber})`,
          message: `Revision #${revisionNumber} requested by ${user.name} (${user.role.replace(/_/g, ' ')}). Reason: ${dto.reason}. Due: ${dueDate ? dueDate.toLocaleDateString() : 'Immediate'}`,
          type: 'WARNING',
          linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/revisions',
          eventType: 'REVISION_REQUESTED',
          entityType: 'REVISION',
          entityId: revision.id,
          projectId: resolvedProjectId || null,
        },
      });

      // Also notify Media Manager if requested by Technical Manager
      if (user.role === 'TECHNICAL_MANAGER') {
        const mediaManagers = await this.prisma.user.findMany({
          where: { role: 'MEDIA_MANAGER', id: { not: user.id } },
          select: { id: true },
        });
        for (const mm of mediaManagers) {
          await this.prisma.notification.create({
            data: {
              userId: mm.id,
              title: `Technical Revision Requested: ${entityTitle}`,
              message: `${user.name} requested Revision #${revisionNumber} for ${entityTitle}. Assigned to employee.`,
              type: 'INFO',
              linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/revisions',
              eventType: 'REVISION_REQUESTED',
              entityType: 'REVISION',
              entityId: revision.id,
              projectId: resolvedProjectId || null,
            },
          });
        }
      }
    } catch (e) {}

    return revision;
  }

  /**
   * 2. Accept Revision Task (Assigned Employee Accepts)
   */
  async acceptRevision(id: string, user: { id: string; role: string; name: string }) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only accept revision tasks assigned to you.');
    }

    return this.prisma.revision.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * 3. Start Revision (In Progress)
   */
  async startRevision(id: string, user: { id: string; role: string; name: string }) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only start revision work assigned to you.');
    }

    const updated = await this.prisma.revision.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Update entity status to IN_PROGRESS
    try {
      if (revision.entityType === 'PROJECT' && revision.projectId) {
        await this.prisma.shootProject.update({
          where: { id: revision.projectId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'SCRIPT') {
        await this.prisma.script.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'TASK') {
        await this.prisma.task.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      }
    } catch (e) {}

    return updated;
  }

  /**
   * 4. Submit Revised Deliverable (In Progress -> Waiting for Technical Review)
   */
  async submitRevision(
    id: string,
    dto: SubmitRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only submit deliverables for revisions assigned to you.');
    }

    if (!dto.revisedVersionUrl || !dto.revisedVersionUrl.trim()) {
      throw new BadRequestException('Revised deliverable URL or file attachment is required.');
    }

    const updated = await this.prisma.revision.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        revisedVersionUrl: dto.revisedVersionUrl.trim(),
        submittedAt: new Date(),
      },
    });

    // Transition Entity Status -> WAITING_FOR_TECHNICAL_REVIEW
    try {
      if (revision.entityType === 'PROJECT' && revision.projectId) {
        await this.prisma.shootProject.update({
          where: { id: revision.projectId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'SCRIPT') {
        await this.prisma.script.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'TASK') {
        await this.prisma.task.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      }
    } catch (e) {}

    // Notify Technical Managers that revised deliverable has been submitted
    try {
      const techManagers = await this.prisma.user.findMany({
        where: { role: 'TECHNICAL_MANAGER' },
        select: { id: true },
      });
      for (const tm of techManagers) {
        await this.prisma.notification.create({
          data: {
            userId: tm.id,
            title: `Revised Deliverable Submitted (Revision #${revision.revisionNumber})`,
            message: `${user.name} submitted revised deliverable for Revision #${revision.revisionNumber}. Ready for Technical Review.`,
            type: 'INFO',
            linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
            eventType: 'REVISION_SUBMITTED',
            entityType: 'REVISION',
            entityId: revision.id,
            projectId: revision.projectId || null,
          },
        });
      }
    } catch (e) {}

    return updated;
  }

  /**
   * 5. Media Manager Reassigns Revision
   */
  async reassignRevision(
    id: string,
    dto: ReassignRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    if (user.role !== 'MEDIA_MANAGER' && user.role !== 'ADMIN' && user.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Business Rule Violation: Only the Media Manager can reassign revision ownership to another employee.',
      );
    }

    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    const newAssignee = await this.prisma.user.findUnique({
      where: { id: dto.newAssigneeId },
      select: { id: true, name: true, role: true },
    });
    if (!newAssignee) throw new NotFoundException('Target new assignee staff user not found.');

    const updated = await this.prisma.revision.update({
      where: { id },
      data: { assignedToId: dto.newAssigneeId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // Reassign corresponding Task assignment if linked task exists
    if (revision.taskId) {
      try {
        await this.prisma.taskAssignment.deleteMany({
          where: { taskId: revision.taskId },
        });
        await this.prisma.taskAssignment.create({
          data: {
            taskId: revision.taskId,
            userId: dto.newAssigneeId,
            acceptanceStatus: 'PENDING',
          },
        });
        await this.prisma.task.update({
          where: { id: revision.taskId },
          data: { status: 'ASSIGNED' },
        });
      } catch (e) {
        console.error('Error reassigning revision task:', e);
      }
    }

    // Notify new assignee
    try {
      await this.prisma.notification.create({
        data: {
          userId: dto.newAssigneeId,
          title: `Revision Task Reassigned to You (Revision #${revision.revisionNumber})`,
          message: `${user.name} reassigned Revision #${revision.revisionNumber} to you. Reason: ${dto.reassignmentReason || 'Reassigned by Media Manager'}`,
          type: 'WARNING',
          linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
          eventType: 'REVISION_REASSIGNED',
          entityType: 'REVISION',
          entityId: revision.id,
          projectId: revision.projectId || null,
        },
      });
    } catch (e) {}

    return updated;
  }

  /**
   * 6. Reviewer Final Decision on Revision (Approve vs Request Another Revision)
   */
  async reviewRevision(
    id: string,
    dto: ReviewRevisionDecisionDto,
    user: { id: string; role: string; name: string },
  ) {
    if (user.role === 'STAFF') {
      throw new ForbiddenException('Staff members cannot review or approve revisions.');
    }

    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (dto.decision === 'APPROVE') {
      const updated = await this.prisma.revision.update({
        where: { id },
        data: {
          status: 'APPROVED',
          resolvedAt: new Date(),
          reviewerComments: dto.comments || 'Revision approved by reviewer.',
        },
      });

      // Workflow Transition:
      // Technical Manager Approve -> WAITING_FOR_MEDIA_REVIEW
      // Media Manager Approve -> COMPLETED
      let nextStatus = 'WAITING_FOR_MEDIA_REVIEW';
      if (user.role === 'MEDIA_MANAGER' || user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') {
        nextStatus = 'COMPLETED';
      }

      try {
        if (revision.entityType === 'PROJECT' && revision.projectId) {
          await this.prisma.shootProject.update({
            where: { id: revision.projectId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'SCRIPT') {
          await this.prisma.script.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'GRAPHIC_REQ') {
          await this.prisma.graphicRequirement.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'TASK') {
          await this.prisma.task.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        }
      } catch (e) {}

      // Notify assigned staff member
      try {
        await this.prisma.notification.create({
          data: {
            userId: revision.assignedToId,
            title: `Revision #${revision.revisionNumber} Approved!`,
            message: `Your revised work for Revision #${revision.revisionNumber} was approved by ${user.name}. Status updated to ${nextStatus.replace(/_/g, ' ')}.`,
            type: 'SUCCESS',
            linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
            eventType: 'REVISION_APPROVED',
            entityType: 'REVISION',
            entityId: revision.id,
            projectId: revision.projectId || null,
          },
        });
      } catch (e) {}

      return updated;
    }

    return revision;
  }

  /**
   * 7. Get Revisions History by Entity
   */
  async getRevisionsByEntity(entityType: string, entityId: string) {
    return this.prisma.revision.findMany({
      where: { entityType, entityId },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { revisionNumber: 'asc' },
    });
  }

  /**
   * 8. Get All Revisions (RBAC Scoped)
   */
  async getRevisions(
    user: { id: string; role: string; name: string },
    status?: string,
    priority?: string,
  ) {
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;

    if (user.role === 'STAFF') {
      where.OR = [{ assignedToId: user.id }, { originalAssigneeId: user.id }];
    } else if (user.role === 'TECHNICAL_MANAGER') {
      where.OR = [
        { reviewStage: 'TECHNICAL_REVIEW' },
        { requestedById: user.id },
        { assignedToId: user.id },
      ];
    }

    return this.prisma.revision.findMany({
      where,
      include: {
        project: { select: { id: true, projectId: true, name: true } },
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 9. Revision Metrics & Analytics for Reports
   */
  async getRevisionMetrics(user: { id: string; role: string; name: string }) {
    const allRevisions = await this.prisma.revision.findMany({
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });

    const now = new Date();
    const openRevisions = allRevisions.filter((r) => r.status !== 'APPROVED');
    const overdueRevisions = openRevisions.filter((r) => r.dueDate && new Date(r.dueDate) < now);

    // Count by entity
    const countByEntity: Record<string, number> = {};
    const countByEmployee: Record<string, { name: string; count: number }> = {};

    allRevisions.forEach((r) => {
      countByEntity[r.entityType] = (countByEntity[r.entityType] || 0) + 1;
      const empId = r.assignedToId;
      if (!countByEmployee[empId]) {
        countByEmployee[empId] = { name: r.assignedTo.name, count: 0 };
      }
      countByEmployee[empId].count += 1;
    });

    return {
      totalRevisions: allRevisions.length,
      openRevisions: openRevisions.length,
      overdueRevisions: overdueRevisions.length,
      completedRevisions: allRevisions.filter((r) => r.status === 'APPROVED').length,
      countByEntity,
      countByEmployee: Object.values(countByEmployee),
    };
  }
}
